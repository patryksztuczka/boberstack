// @effect-diagnostics globalRandom:off globalTimers:off -- the glance and blink timing is decorative jitter in a React effect, not Effect code
import { Accelerometer } from "expo-sensors";
import { useEffect } from "react";
import { Platform } from "react-native";
import {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  BLINK_AGAIN_MS,
  BLINK_HOLD_MS,
  BLINK_MS,
  BLINK_SQUINT,
  BOB,
  BREATHE_X,
  BREATHE_Y,
  BROWS_EASING,
  BROWS_MS,
  BROWS_POPPING,
  EASE_IN,
  EASE_OUT,
  HAT_ROTATE,
  HAT_X,
  HAT_Y,
  LOOK_MS,
  PIVOTS,
  POP_MS,
  segmentsOf,
  SQUASH_X,
  SQUASH_Y,
  TAIL,
  WAG,
} from "./keyframes.ts";
import type { Bezier, Track } from "./keyframes.ts";
import { pivotMatrix } from "./matrix.ts";
import { followTilt, glanceAt, gravityFrom, TILT_STILL } from "./tilt.ts";
import type { TiltState, Vector } from "./tilt.ts";

const TILT_INTERVAL_MS = 50;

const IDLE_GLANCE_MS = 3500;

const GLANCE_EVERY_MS = 2200;

const easing = ([x1, y1, x2, y2]: Bezier) => Easing.bezier(x1, y1, x2, y2);

const play = (track: Track) =>
  withSequence(
    ...segmentsOf(track).map(({ value, duration }) =>
      withTiming(value, { duration, easing: easing(track.easing) }),
    ),
  );

const loop = (track: Track) => withRepeat(play(track), -1);

const blinks = (count: number) =>
  withSequence(
    ...Array.from({ length: count }).flatMap((_, index) => [
      withDelay(
        index === 0 ? 0 : BLINK_AGAIN_MS - 2 * BLINK_MS - BLINK_HOLD_MS,
        withTiming(BLINK_SQUINT, { duration: BLINK_MS, easing: easing(EASE_IN) }),
      ),
      withDelay(BLINK_HOLD_MS, withTiming(1, { duration: BLINK_MS, easing: easing(EASE_IN) })),
    ]),
  );

const UNPIVOTED = { x: 0, y: 0 };

const start = (track: Track) => track.frames[0]?.[1] ?? 0;

export const useBeaverMotion = () => {
  const reducedMotion = useReducedMotion();
  const breatheX = useSharedValue(1);
  const breatheY = useSharedValue(1);
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);
  const tail = useSharedValue(start(TAIL));
  const bob = useSharedValue(start(BOB));
  const hatX = useSharedValue(0);
  const hatY = useSharedValue(0);
  const hatRotate = useSharedValue(0);
  const blink = useSharedValue(1);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const brows = useSharedValue(0);

  const figure = useAnimatedProps(() => ({
    matrix: pivotMatrix(PIVOTS.figure, { scaleX: breatheX.get(), scaleY: breatheY.get() }),
  }));

  const squash = useAnimatedProps(() => ({
    matrix: pivotMatrix(PIVOTS.squash, { scaleX: squashX.get(), scaleY: squashY.get() }),
  }));

  const tailPivot = useAnimatedProps(() => ({
    matrix: pivotMatrix(PIVOTS["tail-pivot"], { rotate: tail.get() }),
  }));

  const headPivot = useAnimatedProps(() => ({
    matrix: pivotMatrix(PIVOTS["head-pivot"], { rotate: bob.get() }),
  }));

  const hatPivot = useAnimatedProps(() => ({
    matrix: pivotMatrix(PIVOTS["hat-pivot"], {
      translateX: hatX.get(),
      translateY: hatY.get(),
      rotate: hatRotate.get(),
    }),
  }));

  const eyeballs = useAnimatedProps(() => ({
    matrix: pivotMatrix(PIVOTS.eyeballs, { scaleY: blink.get() }),
  }));

  const pupils = useAnimatedProps(() => ({
    matrix: pivotMatrix(UNPIVOTED, { translateX: lookX.get(), translateY: lookY.get() }),
  }));

  const browsUp = useAnimatedProps(() => ({
    matrix: pivotMatrix(UNPIVOTED, { translateY: brows.get() }),
  }));

  useEffect(() => {
    if (reducedMotion) return undefined;

    breatheX.set(loop(BREATHE_X));
    breatheY.set(loop(BREATHE_Y));
    tail.set(loop(TAIL));
    bob.set(loop(BOB));

    return () => {
      for (const value of [breatheX, breatheY, tail, bob]) cancelAnimation(value);
    };
  }, [reducedMotion, breatheX, breatheY, tail, bob]);

  useEffect(() => {
    if (reducedMotion) return undefined;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      timer = setTimeout(
        () => {
          blink.set(blinks(Math.random() < 0.25 ? 2 : 1));
          schedule();
        },
        2400 + Math.random() * 3600,
      );
    };

    schedule();

    return () => clearTimeout(timer);
  }, [reducedMotion, blink]);

  useEffect(() => {
    if (reducedMotion) return undefined;

    let tilt: TiltState | undefined;
    let previous: Vector = { x: 0, y: 0 };
    let lastMove = 0;
    let stopped = false;
    let subscription: { remove: () => void } | undefined;

    const lookAt = ({ x, y }: Vector) => {
      lookX.set(withTiming(x, { duration: LOOK_MS, easing: easing(EASE_OUT) }));
      lookY.set(withTiming(y, { duration: LOOK_MS, easing: easing(EASE_OUT) }));
    };

    const glance = setInterval(() => {
      if (performance.now() - lastMove < IDLE_GLANCE_MS) return;

      lookAt(glanceAt(Math.random(), Math.random()));
    }, GLANCE_EVERY_MS);

    void Accelerometer.isAvailableAsync().then((available) => {
      if (!available || stopped) return;

      Accelerometer.setUpdateInterval(TILT_INTERVAL_MS);
      subscription = Accelerometer.addListener((reading) => {
        const next = followTilt(tilt, gravityFrom(reading, Platform.OS));
        const moved = Math.hypot(next.look.x - previous.x, next.look.y - previous.y) > TILT_STILL;

        tilt = next.state;
        previous = next.look;

        if (moved) lastMove = performance.now();

        if (performance.now() - lastMove < IDLE_GLANCE_MS) lookAt(next.look);
      });
    });

    return () => {
      stopped = true;
      clearInterval(glance);
      subscription?.remove();
    };
  }, [reducedMotion, lookX, lookY]);

  const pop = () => {
    if (reducedMotion) return;

    const browsTiming = { duration: BROWS_MS, easing: easing(BROWS_EASING) };

    squashX.set(play(SQUASH_X));
    squashY.set(play(SQUASH_Y));
    hatX.set(play(HAT_X));
    hatY.set(play(HAT_Y));
    hatRotate.set(play(HAT_ROTATE));
    tail.set(withSequence(play(WAG), loop(TAIL)));
    brows.set(
      withSequence(
        withTiming(BROWS_POPPING, browsTiming),
        withDelay(POP_MS - BROWS_MS, withTiming(0, browsTiming)),
      ),
    );
  };

  return {
    pop,
    parts: {
      figure,
      squash,
      "tail-pivot": tailPivot,
      "head-pivot": headPivot,
      "hat-pivot": hatPivot,
      eyeballs,
      pupils,
      brows: browsUp,
    },
  };
};

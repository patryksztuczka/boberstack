import { BEAVER_LOOK_REACH } from "@boberstack/ui/beaver";
import { describe, expect, it } from "vite-plus/test";

import { followTilt, glanceAt, gravityFrom, lookFromTilt } from "./tilt.ts";
import type { TiltState, Vector } from "./tilt.ts";

const length = (vector: Vector) => Math.hypot(vector.x, vector.y);

const hold = (state: TiltState | undefined, gravity: Vector, readings: number) =>
  Array.from({ length: readings }).reduce<{ state: TiltState | undefined; look: Vector }>(
    (step) => followTilt(step.state, gravity),
    { state, look: { x: 0, y: 0 } },
  );

describe("lookFromTilt", () => {
  it("looks straight ahead when the phone is at its resting angle", () => {
    expect(lookFromTilt({ x: 0, y: 0 })).toStrictEqual({ x: 0, y: 0 });
  });

  it("rolls the eyes toward the edge that tips down", () => {
    const right = lookFromTilt({ x: 0.3, y: 0 });
    const bottom = lookFromTilt({ x: 0, y: -0.3 });

    expect(right.x).toBeGreaterThan(0);
    expect(right.y).toBeCloseTo(0);
    expect(bottom.y).toBeGreaterThan(0);
    expect(bottom.x).toBeCloseTo(0);
  });

  it("never reaches further than the web beaver's eyes", () => {
    for (const tilt of [
      { x: 1, y: 0 },
      { x: -2, y: 2 },
      { x: 50, y: -50 },
    ]) {
      expect(length(lookFromTilt(tilt))).toBeLessThan(BEAVER_LOOK_REACH);
    }

    expect(length(lookFromTilt({ x: 50, y: 0 }))).toBeGreaterThan(BEAVER_LOOK_REACH * 0.99);
  });

  it("reaches half way at a tilt of the softness, about 12 degrees", () => {
    expect(length(lookFromTilt({ x: 0.2, y: 0 }))).toBeCloseTo(BEAVER_LOOK_REACH / 2);
  });
});

describe("gravityFrom", () => {
  it("keeps iOS readings and flips Android's, which point the other way", () => {
    expect(gravityFrom({ x: 0.5, y: -0.8 }, "ios")).toStrictEqual({ x: 0.5, y: -0.8 });
    expect(gravityFrom({ x: 0.5, y: -0.8 }, "android")).toStrictEqual({ x: -0.5, y: 0.8 });
  });
});

describe("followTilt", () => {
  const upright = { x: 0, y: -0.7 };

  it("takes the first reading as the resting angle", () => {
    expect(followTilt(undefined, upright).look).toStrictEqual({ x: 0, y: 0 });
  });

  it("moves part of the way on each reading, so one jolt does not snap the eyes", () => {
    const { state } = followTilt(undefined, upright);
    const jolt = followTilt(state, { x: 0.6, y: -0.7 });
    const settled = hold(state, { x: 0.6, y: -0.7 }, 10);

    expect(jolt.look.x).toBeGreaterThan(0);
    expect(jolt.look.x).toBeLessThan(lookFromTilt({ x: 0.6, y: 0 }).x * 0.75);
    expect(jolt.look.x).toBeLessThan(settled.look.x);
  });

  it("smooths out sensor noise around a steady angle", () => {
    const { state } = followTilt(undefined, upright);

    const noisy = [0.02, -0.02, 0.02, -0.02, 0.02, -0.02].reduce<{
      state: TiltState;
      look: Vector;
    }>((step, noise) => followTilt(step.state, { x: noise, y: -0.7 }), {
      state,
      look: { x: 0, y: 0 },
    });

    expect(Math.abs(noisy.look.x)).toBeLessThan(0.5);
  });

  it("drifts back to looking ahead when the phone stays tilted", () => {
    const { state } = followTilt(undefined, upright);
    const soon = hold(state, { x: 0.4, y: -0.7 }, 20);
    const later = hold(state, { x: 0.4, y: -0.7 }, 600);

    expect(later.look.x).toBeLessThan(soon.look.x / 4);
  });
});

describe("glanceAt", () => {
  it("stays within the eyes' reach", () => {
    for (const [turn, distance] of [
      [0, 1],
      [0.25, 0.5],
      [0.9, 0],
    ] as const) {
      expect(length(glanceAt(turn, distance))).toBeLessThanOrEqual(BEAVER_LOOK_REACH + 1e-9);
    }
  });
});

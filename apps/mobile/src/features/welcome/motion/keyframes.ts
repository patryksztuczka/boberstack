import type { BeaverPart } from "@boberstack/ui/beaver";

import type { Pivot } from "./matrix.ts";

export type Bezier = readonly [number, number, number, number];

export type Keyframe = readonly [at: number, value: number];

export interface Track {
  readonly duration: number;
  readonly easing: Bezier;
  readonly frames: readonly Keyframe[];
}

export interface Segment {
  readonly value: number;
  readonly duration: number;
}

export const EASE_IN: Bezier = [0.42, 0, 1, 1];

export const EASE_OUT: Bezier = [0, 0, 0.58, 1];

export const EASE_IN_OUT: Bezier = [0.42, 0, 0.58, 1];

export const POP_EASING: Bezier = [0.3, 0.7, 0.3, 1];

export const BROWS_EASING: Bezier = [0.3, 1.6, 0.5, 1];

export const PIVOTS = {
  figure: { x: 490, y: 950 },
  squash: { x: 490, y: 950 },
  "tail-pivot": { x: 660, y: 800 },
  "head-pivot": { x: 480, y: 560 },
  "hat-pivot": { x: 500, y: 250 },
  eyeballs: { x: 460, y: 330 },
} as const satisfies Partial<Record<BeaverPart, Pivot>>;

const track = (duration: number, easing: Bezier, frames: readonly Keyframe[]): Track => ({
  duration,
  easing,
  frames,
});

export const BREATHE_X = track(4200, EASE_IN_OUT, [
  [0, 1],
  [0.5, 1.008],
  [1, 1],
]);

export const BREATHE_Y = track(4200, EASE_IN_OUT, [
  [0, 1],
  [0.5, 1.018],
  [1, 1],
]);

export const TAIL = track(3400, EASE_IN_OUT, [
  [0, -1],
  [0.5, 4],
  [1, -1],
]);

export const BOB = track(6500, EASE_IN_OUT, [
  [0, -1.2],
  [0.5, 1.4],
  [1, -1.2],
]);

export const WAG = track(900, EASE_IN_OUT, [
  [0, 0],
  [0.2, 12],
  [0.4, -6],
  [0.6, 10],
  [0.8, -3],
  [1, 0],
]);

export const SQUASH_X = track(900, POP_EASING, [
  [0, 1],
  [0.12, 1.05],
  [0.3, 0.97],
  [0.48, 1.02],
  [0.64, 1],
  [1, 1],
]);

export const SQUASH_Y = track(900, POP_EASING, [
  [0, 1],
  [0.12, 0.93],
  [0.3, 1.05],
  [0.48, 0.98],
  [0.64, 1],
  [1, 1],
]);

export const HAT_X = track(900, POP_EASING, [
  [0, 0],
  [0.12, 0],
  [0.34, -10],
  [0.56, 0],
  [1, 0],
]);

export const HAT_Y = track(900, POP_EASING, [
  [0, 0],
  [0.12, 12],
  [0.34, -150],
  [0.56, 0],
  [0.68, -26],
  [0.8, 0],
  [1, 0],
]);

export const HAT_ROTATE = track(900, POP_EASING, [
  [0, 0],
  [0.12, 0],
  [0.34, -16],
  [0.56, 5],
  [0.68, -3],
  [0.8, 1],
  [1, 0],
]);

export const POP_MS = 950;

export const BLINK_MS = 70;

export const BLINK_HOLD_MS = 60;

export const BLINK_SQUINT = 0.08;

export const BLINK_AGAIN_MS = 260;

export const LOOK_MS = 140;

export const BROWS_MS = 180;

export const BROWS_POPPING = -16;

export const segmentsOf = ({ duration, frames }: Track): readonly Segment[] =>
  frames.map(([at, value], index) => ({
    value,
    duration: (at - (frames[index - 1]?.[0] ?? at)) * duration,
  }));

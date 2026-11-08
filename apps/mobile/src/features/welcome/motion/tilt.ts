import { BEAVER_LOOK_REACH } from "@boberstack/ui/beaver";

export interface Vector {
  readonly x: number;
  readonly y: number;
}

export interface TiltState {
  readonly smoothed: Vector;
  readonly neutral: Vector;
}

export const TILT_SMOOTHING = 0.3;

export const TILT_NEUTRAL_DRIFT = 0.01;

export const TILT_SOFTNESS = 0.2;

export const TILT_STILL = 0.2;

const CENTER: Vector = { x: 0, y: 0 };

const mix = (from: Vector, to: Vector, amount: number): Vector => ({
  x: from.x + (to.x - from.x) * amount,
  y: from.y + (to.y - from.y) * amount,
});

export const gravityFrom = (reading: Vector, platform: string): Vector =>
  platform === "android" ? { x: -reading.x, y: -reading.y } : { x: reading.x, y: reading.y };

export const lookFromTilt = (tilt: Vector): Vector => {
  const x = tilt.x;
  const y = -tilt.y;
  const distance = Math.hypot(x, y);

  if (distance === 0) return CENTER;

  const reach = (BEAVER_LOOK_REACH * distance) / (distance + TILT_SOFTNESS);

  return { x: (x / distance) * reach, y: (y / distance) * reach };
};

export interface TiltStep {
  readonly state: TiltState;
  readonly look: Vector;
}

export const followTilt = (state: TiltState | undefined, gravity: Vector): TiltStep => {
  const smoothed = state === undefined ? gravity : mix(state.smoothed, gravity, TILT_SMOOTHING);
  const neutral = state === undefined ? gravity : mix(state.neutral, smoothed, TILT_NEUTRAL_DRIFT);

  return {
    state: { smoothed, neutral },
    look: lookFromTilt({ x: smoothed.x - neutral.x, y: smoothed.y - neutral.y }),
  };
};

export const glanceAt = (turn: number, distance: number): Vector => ({
  x: Math.cos(turn * 2 * Math.PI) * distance * BEAVER_LOOK_REACH,
  y: Math.sin(turn * 2 * Math.PI) * distance * BEAVER_LOOK_REACH,
});

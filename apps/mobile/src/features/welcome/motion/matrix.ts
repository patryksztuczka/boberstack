export type Matrix = [number, number, number, number, number, number];

export interface Pivot {
  readonly x: number;
  readonly y: number;
}

export interface PivotTransform {
  readonly translateX?: number;
  readonly translateY?: number;
  readonly rotate?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
}

export const pivotMatrix = (pivot: Pivot, transform: PivotTransform): Matrix => {
  "worklet";
  const radians = ((transform.rotate ?? 0) * Math.PI) / 180;
  const scaleX = transform.scaleX ?? 1;
  const scaleY = transform.scaleY ?? 1;
  const a = Math.cos(radians) * scaleX;
  const b = Math.sin(radians) * scaleX;
  const c = -Math.sin(radians) * scaleY;
  const d = Math.cos(radians) * scaleY;

  return [
    a,
    b,
    c,
    d,
    pivot.x + (transform.translateX ?? 0) - (a * pivot.x + c * pivot.y),
    pivot.y + (transform.translateY ?? 0) - (b * pivot.x + d * pivot.y),
  ];
};

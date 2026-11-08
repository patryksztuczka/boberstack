import { describe, expect, it } from "vite-plus/test";

import { pivotMatrix } from "./matrix.ts";
import type { Matrix } from "./matrix.ts";

const apply = ([a, b, c, d, e, f]: Matrix, x: number, y: number) => [
  a * x + c * y + e,
  b * x + d * y + f,
];

describe("pivotMatrix", () => {
  const pivot = { x: 660, y: 800 };

  it("is the identity without a transform", () => {
    expect(apply(pivotMatrix(pivot, {}), 12, 34)).toStrictEqual([12, 34]);
  });

  it("rotates clockwise around the pivot, as CSS rotate does in a y-down view box", () => {
    const matrix = pivotMatrix(pivot, { rotate: 90 });

    expect(apply(matrix, 660, 800)).toStrictEqual([660, 800]);
    expect(apply(matrix, 760, 800).map(Math.round)).toStrictEqual([660, 900]);
  });

  it("scales away from the pivot", () => {
    const matrix = pivotMatrix({ x: 490, y: 950 }, { scaleX: 2, scaleY: 0.5 });

    expect(apply(matrix, 490, 950)).toStrictEqual([490, 950]);
    expect(apply(matrix, 500, 850)).toStrictEqual([510, 900]);
  });

  it("translates after rotating, like translate(x, y) rotate(a) with a transform origin", () => {
    const matrix = pivotMatrix(
      { x: 500, y: 250 },
      { translateX: -10, translateY: -150, rotate: 90 },
    );

    expect(apply(matrix, 500, 250)).toStrictEqual([490, 100]);
    expect(apply(matrix, 600, 250).map(Math.round)).toStrictEqual([490, 200]);
  });
});

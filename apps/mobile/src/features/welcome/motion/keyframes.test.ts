import { BEAVER_ART } from "@boberstack/ui/beaver";
import type { BeaverNode } from "@boberstack/ui/beaver";
import { describe, expect, it } from "vite-plus/test";

import * as motion from "./keyframes.ts";
import { segmentsOf } from "./keyframes.ts";
import type { Track } from "./keyframes.ts";

const tracks: readonly Track[] = [
  motion.BREATHE_X,
  motion.BREATHE_Y,
  motion.TAIL,
  motion.BOB,
  motion.WAG,
  motion.SQUASH_X,
  motion.SQUASH_Y,
  motion.HAT_X,
  motion.HAT_Y,
  motion.HAT_ROTATE,
];

const partsOf = (nodes: readonly BeaverNode[]): readonly string[] =>
  nodes.flatMap((node) => [
    ...(node.attributes.part === undefined ? [] : [node.attributes.part]),
    ...partsOf(node.children),
  ]);

describe("beaver keyframes", () => {
  it("has every track run from 0% to 100% in order, like a CSS @keyframes rule", () => {
    for (const { frames } of tracks) {
      const stops = frames.map(([at]) => at);

      expect(stops[0]).toBe(0);
      expect(stops.at(-1)).toBe(1);
      expect(stops).toStrictEqual(stops.toSorted((a, b) => a - b));
    }
  });

  it("splits a track into timed steps that add up to its duration", () => {
    const steps = segmentsOf(motion.WAG);

    expect(steps[0]).toStrictEqual({ value: 0, duration: 0 });
    expect(steps.map((step) => step.value)).toStrictEqual([0, 12, -6, 10, -3, 0]);
    expect(steps.reduce((total, step) => total + step.duration, 0)).toBeCloseTo(900);
  });

  it("pivots parts that the shared drawing has, each once", () => {
    const parts = partsOf(BEAVER_ART);

    for (const part of Object.keys(motion.PIVOTS)) {
      expect(parts.filter((name) => name === part)).toHaveLength(1);
    }
  });
});

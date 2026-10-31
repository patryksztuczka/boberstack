import { tester } from "../../rule-tester.ts";
import { noArrayFilterMapRule } from "./no-array-filter-map.ts";

tester.run("anti-slop/no-array-filter-map", noArrayFilterMapRule, {
  valid: [
    "const xs: number[] = load();\nxs.values().filter(isOdd).map(double).toArray();",
    "const xs: number[] = load();\nxs.flatMap((x) => (isOdd(x) ? [double(x)] : []));",
  ],
  invalid: [
    {
      code: "const xs: number[] = load();\nxs.filter(isOdd).map(double);",
      errors: [{ messageId: "arrayFilterMap" }],
    },
    {
      code: "[1, 2, 3].filter(isOdd).map(double);",
      errors: [{ messageId: "arrayFilterMap" }],
    },
  ],
});

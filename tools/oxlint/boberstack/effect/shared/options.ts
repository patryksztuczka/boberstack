import type { Context } from "vite-plus/lint/plugins";

type OptionValue = string | boolean | ReadonlyArray<string> | Readonly<Record<string, string>>;

export const ruleOptions = <Defaults extends Readonly<Record<string, OptionValue>>>(
  context: Context,
  defaults: Defaults,
): Defaults => {
  const first: unknown = context.options[0];

  if (first === null || typeof first !== "object" || Array.isArray(first)) return defaults;

  return { ...defaults, ...first };
};

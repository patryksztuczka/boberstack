import type { ESTree, SourceCode } from "vite-plus/lint/plugins";

import { isEffectMember } from "./effect-imports.ts";

const functionFactories = new Set(["fn", "fnUntraced"]);

export const isEffectGenerator = (sourceCode: SourceCode, fn: ESTree.Node): boolean => {
  if (fn.type !== "FunctionExpression" || !fn.generator) return false;
  const call = fn.parent;

  if (call?.type !== "CallExpression" || !call.arguments.some((argument) => argument === fn)) {
    return false;
  }

  if (isEffectMember(sourceCode, call.callee, "Effect", "gen")) return true;

  if (isEffectMember(sourceCode, call.callee, "Effect", functionFactories)) return true;

  return (
    call.callee.type === "CallExpression" &&
    isEffectMember(sourceCode, call.callee.callee, "Effect", functionFactories)
  );
};

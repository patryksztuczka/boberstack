import { defineRule } from "vite-plus/lint/plugins";
import type { Comment, ESTree, Fixer, Range } from "vite-plus/lint/plugins";

const markers = ["VENDOR:", "SAFETY:", "BRIDGE:", "QUARANTINE:"];

const directivePattern =
  /^(?:(?:es|ox)lint-(?:disable|enable)\b|@ts-(?:expect-error|check|nocheck|ignore)\b|@effect-diagnostics\b|\/ <reference |@vite-ignore\b|[@#]__PURE__\b|@jsxImportSource\b|(?:c8|v8|istanbul) ignore\b|(?:oxfmt|prettier)-ignore\b)/u;

const typeTagPattern =
  /^@(?:type|typedef|template|param|returns|satisfies)\s+\{.*\}(?:\s+[\w$.[\]]+)?$/u;

const scriptFilePattern = /\.[cm]?js$/u;

type Kind = "kept" | "marked" | "prose";

const linesOf = (comment: Comment): readonly string[] =>
  comment.value.split("\n").map((line) => line.replace(/^\s*\*?\s?/u, "").trim());

const textOf = (comment: Comment): string =>
  comment.type === "Block"
    ? linesOf(comment).join(" ").replaceAll(/\s+/gu, " ").trim()
    : comment.value.trim();

const isTypeAnnotation = (comment: Comment): boolean =>
  comment.type === "Block" &&
  comment.value.startsWith("*") &&
  linesOf(comment)
    .filter((line) => line !== "")
    .every((line) => typeTagPattern.test(line));

const isMarked = (text: string): boolean =>
  markers.some((marker) => text.startsWith(marker) && text.slice(marker.length).trim() !== "");

const kindOf = (comment: Comment, filename: string): Kind => {
  const text = textOf(comment);

  if (directivePattern.test(comment.type === "Line" ? comment.value.trimStart() : text)) {
    return "kept";
  }

  if (scriptFilePattern.test(filename) && isTypeAnnotation(comment)) return "kept";

  return isMarked(text) ? "marked" : "prose";
};

const lineStartOf = (source: string, offset: number): number =>
  source.lastIndexOf("\n", offset - 1) + 1;

const lineEndOf = (source: string, offset: number): number => {
  const end = source.indexOf("\n", offset);

  return end === -1 ? source.length : end;
};

const standsAlone = (source: string, start: number, end: number): boolean =>
  source.slice(lineStartOf(source, start), start).trim() === "" &&
  source.slice(end, lineEndOf(source, end)).trim() === "";

const follows = (source: string, previous: Comment, next: Comment): boolean =>
  standsAlone(source, previous.start, previous.end) &&
  standsAlone(source, next.start, next.end) &&
  next.loc.start.line === previous.loc.end.line + 1;

const runsOf = (source: string, comments: readonly Comment[]): readonly Comment[][] => {
  const runs: Comment[][] = [];

  for (const comment of comments) {
    const run = runs.at(-1);
    const previous = run?.at(-1);

    if (run !== undefined && previous !== undefined && follows(source, previous, comment)) {
      run.push(comment);
    } else {
      runs.push([comment]);
    }
  }

  return runs;
};

const proseGroupsOf = (run: readonly Comment[], filename: string): readonly Comment[][] => {
  const groups: Comment[][] = [];
  let open = false;
  let continuing = false;

  for (const comment of run) {
    const kind = kindOf(comment, filename);

    if (kind === "prose" && !continuing) {
      if (open) groups.at(-1)?.push(comment);
      else groups.push([comment]);
      open = true;
      continue;
    }

    open = false;

    if (kind !== "prose") continuing = kind === "marked";
  }

  return groups;
};

const removalOf = (
  source: string,
  first: Comment,
  last: Comment,
  emptyContainers: readonly Range[],
): Range => {
  const container = emptyContainers.find(([start, end]) => start <= first.start && last.end <= end);
  const [start, end] = container ?? [first.start, last.end];

  if (standsAlone(source, start, end)) {
    return [lineStartOf(source, start), Math.min(lineEndOf(source, end) + 1, source.length)];
  }

  return [source.slice(0, start).trimEnd().length, end];
};

export const noCommentsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Ban prose comments. A comment stays only when it is a tool directive, a JSDoc type in plain JavaScript, or starts with VENDOR:, SAFETY:, BRIDGE: or QUARANTINE:.",
    },
    hasSuggestions: true,
    messages: {
      comment:
        "Comments are banned. Put the explanation in a name, a type or a test, in an ADR (docs/internals/<context>/adr/) or in the glossary (docs/internals/<context>/GLOSSARY.md). Only markers survive: `// VENDOR: …` for a workaround of a defect in someone else's software, `// SAFETY: …` above a type assertion, `// BRIDGE: …` above a Promise bridge, `// QUARANTINE: …` above a skipped test, plus tool directives.",
      remove: "Remove the comment once its content has a home.",
    },
    schema: [],
  },
  create(context) {
    const emptyContainers: Range[] = [];

    return {
      JSXExpressionContainer(node: ESTree.JSXExpressionContainer) {
        if (node.expression.type === "JSXEmptyExpression") {
          emptyContainers.push([node.start, node.end]);
        }
      },
      "Program:exit"() {
        const source = context.sourceCode.text;

        const comments = context.sourceCode
          .getAllComments()
          .filter((comment) => comment.type !== "Shebang");

        for (const run of runsOf(source, comments)) {
          for (const group of proseGroupsOf(run, context.filename)) {
            const first = group[0];
            const last = group.at(-1);

            if (first === undefined || last === undefined) continue;
            const range = removalOf(source, first, last, emptyContainers);
            context.report({
              loc: first.loc,
              messageId: "comment",
              suggest: [
                {
                  messageId: "remove",
                  fix: (fixer: Fixer) => fixer.removeRange(range),
                },
              ],
            });
          }
        }
      },
    };
  },
});

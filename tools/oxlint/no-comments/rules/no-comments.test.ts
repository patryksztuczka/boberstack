import { tester } from "../../rule-tester.ts";
import { noCommentsRule } from "./no-comments.ts";

const removed = (output: string) => ({
  messageId: "comment",
  suggestions: [{ messageId: "remove", output }],
});

tester.run("no-comments/no-comments", noCommentsRule, {
  valid: [
    "#!/usr/bin/env node\nconst answer = 42;",
    "// VENDOR: Safari 17 fires resize before layout finishes, https://bugs.webkit.org/show_bug.cgi?id=1\nrequestAnimationFrame(measure);",
    "// VENDOR: iOS drops the WebSocket when the app is backgrounded,\n// so the client reconnects on the next foreground event.\nreconnect();",
    "/* VENDOR: Chrome caches the 301 forever */\nfetch(url);",
    "// BRIDGE: better-auth calls the database adapter through Promises.\nrun();",
    "// SAFETY: the decoder checked the length above\nconst bytes = raw as Uint8Array;",
    '// QUARANTINE: #42 Hyperdrive in dev drops the connection\nit.skip("syncs todos", run);',
    "// oxlint-disable-next-line no-debugger -- the step-through harness needs it\ndebugger;",
    "// eslint-disable-next-line react-hooks/exhaustive-deps\nuseEffect(load, []);",
    '// @ts-expect-error the environment argument is required\ncreate("x");',
    "// @effect-diagnostics nodeBuiltinImport:off\nimport fs from 'node:fs';",
    '/// <reference types="vite/client" />\nconst answer = 42;',
    "const lazy = import(/* @vite-ignore */ path);",
    "const value = /* @__PURE__ */ build();",
    {
      code: "/**\n * @param {string} command\n * @returns {string}\n */\nexport const same = (command) => command;",
      filename: "scripts/policy.mjs",
    },
  ],
  invalid: [
    {
      code: "// THROW: the library needs a rejection.\nthrow cause;",
      errors: [removed("throw cause;")],
    },
    {
      code: "// DETACH: delivery must not hold the response.\nsend();",
      errors: [removed("send();")],
    },
    {
      code: '// QUARANTINE:\nit.skip("x", run);',
      errors: [removed('it.skip("x", run);')],
    },
    {
      code: "// A module header that goes away.\nexport const answer = 42;",
      errors: [removed("export const answer = 42;")],
    },
    {
      code: "const answer = 42; // a trailing note\n",
      errors: [removed("const answer = 42;\n")],
    },
    {
      code: "function run() {\n  // first line\n  // second line\n  return 1;\n}",
      errors: [removed("function run() {\n  return 1;\n}")],
    },
    {
      code: "/** Todos that are still open. */\nconst openTodos = 1;",
      errors: [removed("const openTodos = 1;")],
    },
    {
      code: "// Explains the workaround.\n// VENDOR: Safari 17 fires resize early\nmeasure();",
      errors: [removed("// VENDOR: Safari 17 fires resize early\nmeasure();")],
    },
    {
      code: "// VENDOR: Safari 17 fires resize early\n\n// An unrelated note.\nmeasure();",
      errors: [removed("// VENDOR: Safari 17 fires resize early\n\nmeasure();")],
    },
    {
      code: "// VENDOR:\nmeasure();",
      errors: [removed("measure();")],
    },
    {
      code: "// Explains the suppression.\n// oxlint-disable-next-line no-debugger\ndebugger;",
      errors: [removed("// oxlint-disable-next-line no-debugger\ndebugger;")],
    },
    {
      code: "/**\n * @param {string} command\n */\nexport const same = (command: string) => command;",
      errors: [removed("export const same = (command: string) => command;")],
    },
    {
      code: "const view = (\n  <div>\n    {/* the header */}\n    <h1>Title</h1>\n  </div>\n);",
      filename: "view.tsx",
      errors: [removed("const view = (\n  <div>\n    <h1>Title</h1>\n  </div>\n);")],
    },
    {
      code: "const noop = () => { /* nothing */ };",
      errors: [removed("const noop = () => { };")],
    },
  ],
});

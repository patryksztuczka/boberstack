import { tester } from "../../rule-tester.ts";
import { noNewPromiseRule } from "./no-new-promise.ts";

const error = { messageId: "newPromise" };

tester.run("effect/no-new-promise", noNewPromiseRule, {
  valid: [
    "const ready = Promise.resolve(1);",
    'import { Promise } from "./local-promise"; const p = new Promise(1);',
  ],
  invalid: [
    {
      code: 'const ready = new Promise((resolve) => socket.once("ready", resolve));',
      errors: [error],
    },
  ],
});

import { Atom } from "effect/reactivity";

import { clientRuntime } from "../atom-runtime/index.ts";
import { SignInMethodsClient } from "./sign-in-methods-client.ts";

export const signInMethods = clientRuntime
  .atom(SignInMethodsClient.use((client) => client.list))
  .pipe(Atom.keepAlive);

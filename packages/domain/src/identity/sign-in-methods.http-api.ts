import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";

import { SignInMethods } from "./sign-in-methods.ts";

export class SignInMethodsHttpApi extends HttpApiGroup.make("signInMethods").add(
  HttpApiEndpoint.get("list", "/api/sign-in-methods", { success: SignInMethods }),
) {}

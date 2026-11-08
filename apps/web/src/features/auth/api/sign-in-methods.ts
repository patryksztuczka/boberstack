import { signInMethods } from "@boberstack/client-runtime/identity";
import type { SignInMethods, SocialProvider } from "@boberstack/domain/identity/sign-in-methods";
import { useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";

const socialProviders = (
  result: AsyncResult.AsyncResult<SignInMethods, unknown>,
): ReadonlyArray<SocialProvider> =>
  Option.match(AsyncResult.value(result), {
    onNone: () => [],
    onSome: (methods) => methods.socialProviders,
  });

export const useSocialProviders = () => useAtomValue(signInMethods, socialProviders);

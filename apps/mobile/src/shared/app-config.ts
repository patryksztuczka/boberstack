import { Option, Result, Schema } from "effect";
import Constants from "expo-constants";

import { apiOriginFrom } from "./api-origin.ts";

const ExpoConfig = Schema.Struct({
  scheme: Schema.String,
  extra: Schema.Struct({ apiUrl: Schema.NullOr(Schema.String) }),
});

const expoConfig = Schema.decodeUnknownOption(ExpoConfig)(Constants.expoConfig);

const fail = (problem: string) => new Error(problem);

export const API_ORIGIN = Result.getOrThrowWith(
  apiOriginFrom(Option.getOrUndefined(expoConfig)?.extra.apiUrl ?? undefined),
  fail,
);

export const APP_SCHEME = Option.getOrThrowWith(expoConfig, () =>
  fail("app.config.ts did not give the app a scheme; run expo start from apps/mobile."),
).scheme;

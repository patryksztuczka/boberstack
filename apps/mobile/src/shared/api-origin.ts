import { Result } from "effect";

const HTTP_ORIGIN = /^https?:\/\/[^/?#\s]+$/;

export const apiOriginFrom = (value: string | undefined): Result.Result<string, string> => {
  const origin = (value ?? "").trim().replace(/\/+$/, "");

  if (origin === "") {
    return Result.fail(
      "EXPO_PUBLIC_API_URL is not set. Set it to the api origin, such as https://app.example.com, and start Metro again; pnpm dev:mobile sets it for this checkout.",
    );
  }

  return HTTP_ORIGIN.test(origin)
    ? Result.succeed(origin)
    : Result.fail(
        `EXPO_PUBLIC_API_URL must be an http or https origin such as https://app.example.com, got "${origin}".`,
      );
};

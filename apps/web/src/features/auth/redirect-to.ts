const AFTER_SIGN_IN = "/todos";

const PROBE_ORIGIN = "https://same-origin.invalid";

export const safeRedirectTo = (value: string | null | undefined): string => {
  if (value === null || value === undefined || !value.startsWith("/") || value.startsWith("//")) {
    return AFTER_SIGN_IN;
  }

  const url = URL.parse(value, PROBE_ORIGIN);

  if (url === null || url.origin !== PROBE_ORIGIN) return AFTER_SIGN_IN;

  return `${url.pathname}${url.search}${url.hash}`;
};

export const signInPath = (target: string, expired = false) => {
  const query = new URLSearchParams({ redirectTo: safeRedirectTo(target) });

  if (expired) query.set("expired", "1");

  return `/sign-in?${query.toString()}`;
};

export const absoluteUrl = (path: string) => new URL(path, globalThis.location.origin).href;

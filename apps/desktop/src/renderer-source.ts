import { Option, Schema } from "effect";

export const RendererSource = Schema.TaggedUnion({
  DevServer: { url: Schema.URL },
  Bundle: { directory: Schema.String, origin: Schema.URL },
});

export type RendererSource = typeof RendererSource.Type;

export type Bundle = typeof RendererSource.cases.Bundle.Type;

export const Resolution = Schema.TaggedUnion({
  File: { directory: Schema.String, relativePath: Schema.String },
  NotFound: {},
  Api: {},
  Network: {},
});

export type Resolution = typeof Resolution.Type;

const API_PREFIX = "/api";

const decodePathname = Schema.decodeOption(Schema.StringFromUriComponent);

const isApiPath = (pathname: string) =>
  pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`);

const isUnsafeSegment = (segment: string) =>
  segment === "." || segment === ".." || segment.includes("\u0000");

const isSameOrigin = (left: URL, right: URL) =>
  left.protocol === right.protocol && left.host === right.host;

export const appUrl = (source: RendererSource): URL =>
  RendererSource.match(source, {
    DevServer: (devServer) => devServer.url,
    Bundle: (bundle) => new URL("/", bundle.origin),
  });

const bundleFile = (directory: string, pathname: string): Resolution =>
  Option.match(decodePathname(pathname), {
    onNone: () => Resolution.cases.NotFound.make({}),
    onSome: (decoded) => {
      const segments = decoded.split(/[/\\]/).filter((segment) => segment !== "");

      if (segments.some(isUnsafeSegment)) return Resolution.cases.NotFound.make({});

      const last = segments.at(-1);

      return Resolution.cases.File.make({
        directory,
        relativePath: last === undefined || !last.includes(".") ? "index.html" : segments.join("/"),
      });
    },
  });

export const resolveBundleRequest = (bundle: Bundle, requested: URL): Resolution => {
  if (!isSameOrigin(requested, bundle.origin)) return Resolution.cases.Network.make({});

  return isApiPath(requested.pathname)
    ? Resolution.cases.Api.make({})
    : bundleFile(bundle.directory, requested.pathname);
};

export const withAppOrigin = (headers: Headers, origin: URL): Headers => {
  const result = new Headers(headers);

  if (!result.has("origin")) result.set("origin", origin.origin);

  return result;
};

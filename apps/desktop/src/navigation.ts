import { Schema } from "effect";

export const NavigationVerdict = Schema.TaggedUnion({
  Stay: {},
  OpenExternal: { url: Schema.URL },
  Block: {},
});

export type NavigationVerdict = typeof NavigationVerdict.Type;

const EXTERNAL_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

const verdictFor = (app: URL, target: URL): NavigationVerdict => {
  if (target.protocol === app.protocol && target.host === app.host) {
    return NavigationVerdict.cases.Stay.make({});
  }

  return EXTERNAL_PROTOCOLS.has(target.protocol)
    ? NavigationVerdict.cases.OpenExternal.make({ url: target })
    : NavigationVerdict.cases.Block.make({});
};

export const navigationVerdict = (app: URL, raw: string): NavigationVerdict =>
  URL.canParse(raw) ? verdictFor(app, new URL(raw)) : NavigationVerdict.cases.Block.make({});

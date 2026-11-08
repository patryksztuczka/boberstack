import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

import messages from "../../messages/en.json" with { type: "json" };

const isPlainText = Schema.is(Schema.String);

describe("messages/en.json", () => {
  it("has no plural or other selector, which needs Intl.PluralRules that Hermes lacks", () => {
    const withSelectors = Object.entries(messages).filter(
      ([key, message]) => key !== "$schema" && !isPlainText(message),
    );

    expect(withSelectors.map(([key]) => key)).toStrictEqual([]);
  });
});

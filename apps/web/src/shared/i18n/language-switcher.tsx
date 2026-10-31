import { m } from "../../paraglide/messages.js";
import { getLocale, isLocale, locales, setLocale } from "../../paraglide/runtime.js";

const LOCALE_NAMES = { en: "English", pl: "Polski" } satisfies Record<
  (typeof locales)[number],
  string
>;

export const LanguageSwitcher = () => (
  <label className="flex items-center gap-2 text-sm">
    <span className="sr-only">{m.language_label()}</span>
    <select
      className="rounded-md border bg-background px-2 py-1"
      value={getLocale()}
      onChange={(event) => {
        if (isLocale(event.target.value)) {
          void setLocale(event.target.value);
        }
      }}
    >
      {locales.map((locale) => (
        <option key={locale} value={locale}>
          {LOCALE_NAMES[locale]}
        </option>
      ))}
    </select>
  </label>
);

import { describe, expect, it } from "@effect/vitest";

import { confirmEmail } from "./confirm-email.ts";

const data = {
  name: "Ana",
  email: "ana@example.com",
  url: "https://app.example.com/api/auth/verify-email?token=abc&callbackURL=%2Femail-verified",
  appUrl: "https://app.example.com",
};

describe("confirmEmail", () => {
  it("asks the recipient to confirm their address", () => {
    const mail = confirmEmail(data);

    expect(mail.subject).toBe("Confirm your email");
    expect(mail.text).toContain("Confirm ana@example.com");
    expect(mail.html).toContain('<strong style="color:#141414;">ana@example.com</strong>');
  });

  it("puts the verification link in the button, the fallback and the text part", () => {
    const mail = confirmEmail(data);
    const escaped = data.url.replaceAll("&", "&amp;");

    expect(mail.html.split(`href="${escaped}"`)).toHaveLength(3);
    expect(mail.text).toContain(data.url);
  });

  it("loads the wordmark and the beaver from the app origin", () => {
    const mail = confirmEmail(data);

    expect(mail.html).toContain('src="https://app.example.com/email/wordmark.png"');
    expect(mail.html).toContain('src="https://app.example.com/email/beaver-head.png"');
  });

  it("escapes what the user typed", () => {
    const mail = confirmEmail({ ...data, name: '<img src=x onerror="alert(1)">' });

    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});

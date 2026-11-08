import { describe, expect, it } from "@effect/vitest";

import { resetPassword } from "./reset-password.ts";

const data = {
  name: "Ana",
  email: "ana@example.com",
  url: "https://app.example.com/api/auth/reset-password/tok?callbackURL=%2Freset-password",
  appUrl: "https://app.example.com",
};

describe("resetPassword", () => {
  it("offers a new password and says the old one still works", () => {
    const mail = resetPassword(data);

    expect(mail.subject).toBe("Reset your password");
    expect(mail.html).toContain("Choose a new password");
    expect(mail.text).toContain("Your current password keeps working");
  });

  it("puts the reset link in the button, the fallback and the text part", () => {
    const mail = resetPassword(data);

    expect(mail.html.split(`href="${data.url}"`)).toHaveLength(3);
    expect(mail.text).toContain(data.url);
  });

  it("escapes what the user typed", () => {
    const mail = resetPassword({ ...data, name: "Ana & <b>Bob</b>" });

    expect(mail.html).toContain("Ana &amp; &lt;b&gt;Bob&lt;/b&gt;");
  });
});

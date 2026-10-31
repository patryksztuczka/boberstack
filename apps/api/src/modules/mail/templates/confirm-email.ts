import { escapeHtml, layout } from "./layout.ts";
import type { AccountMailData, RenderedMail } from "./layout.ts";

export const confirmEmail = (data: AccountMailData): RenderedMail => {
  const finePrint =
    "The link works for 24 hours. If you did not create an account, ignore this email and nothing will happen.";

  return {
    subject: "Confirm your email",
    html: layout(data.appUrl, {
      preheader: "One click and your boberstack account is ready.",
      headline: "Confirm your email",
      bodyHtml: `Hi ${escapeHtml(data.name)}, thanks for signing up. Confirm <strong style="color:#141414;">${escapeHtml(data.email)}</strong> so we know the account is yours.`,
      action: "Confirm email",
      url: data.url,
      finePrint,
    }),
    text: [
      `Hi ${data.name}, thanks for signing up.`,
      `Confirm ${data.email} so we know the account is yours:`,
      "",
      data.url,
      "",
      finePrint,
    ].join("\n"),
  };
};

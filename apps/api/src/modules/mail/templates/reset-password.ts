import { escapeHtml, layout } from "./layout.ts";
import type { AccountMailData, RenderedMail } from "./layout.ts";

export const resetPassword = (data: AccountMailData): RenderedMail => {
  const finePrint =
    "The link works for 1 hour and only once. If you did not ask for this, ignore this email; your password stays the same.";

  return {
    subject: "Reset your password",
    html: layout(data.appUrl, {
      preheader: "Choose a new password for your boberstack account.",
      headline: "Reset your password",
      bodyHtml: `Hi ${escapeHtml(data.name)}, someone asked to reset the password for <strong style="color:#141414;">${escapeHtml(data.email)}</strong>. Your current password keeps working until you choose a new one.`,
      action: "Choose a new password",
      url: data.url,
      finePrint,
    }),
    text: [
      `Hi ${data.name}, someone asked to reset the password for ${data.email}.`,
      "Your current password keeps working until you choose a new one:",
      "",
      data.url,
      "",
      finePrint,
    ].join("\n"),
  };
};

const ESCAPES = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]);

export const escapeHtml = (value: string) =>
  value.replaceAll(/[&<>"']/g, (character) => ESCAPES.get(character) ?? character);

export interface RenderedMail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface AccountMailData {
  readonly name: string;
  readonly email: string;
  readonly url: string;
  readonly appUrl: string;
}

export interface LayoutContent {
  readonly preheader: string;
  readonly headline: string;
  readonly bodyHtml: string;
  readonly action: string;
  readonly url: string;
  readonly finePrint: string;
}

const FONT = "Helvetica, Arial, sans-serif";

const assetUrl = (appUrl: string, file: string) => new URL(`/email/${file}`, appUrl).toString();

export const layout = (appUrl: string, content: LayoutContent) => {
  const url = escapeHtml(content.url);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(content.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
<tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td style="padding:0 0 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="left" valign="middle"><img src="${escapeHtml(assetUrl(appUrl, "wordmark.png"))}" width="132" height="22" alt="boberstack." style="display:block;border:0;"></td>
<td align="right" valign="middle"><img src="${escapeHtml(assetUrl(appUrl, "beaver-head.png"))}" width="40" height="40" alt="" style="display:block;border:0;"></td>
</tr></table>
</td></tr>
<tr><td style="font-family:${FONT};font-size:26px;line-height:32px;font-weight:700;color:#141414;padding:0 0 16px;">${escapeHtml(content.headline)}</td></tr>
<tr><td style="font-family:${FONT};font-size:15px;line-height:24px;color:#3a3a3a;padding:0 0 28px;">${content.bodyHtml}</td></tr>
<tr><td style="padding:0 0 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:#141414;border-radius:10px;"><a href="${url}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(content.action)}</a></td>
</tr></table>
</td></tr>
<tr><td style="font-family:${FONT};font-size:13px;line-height:20px;color:#8a8a8a;padding:0 0 28px;">Button not working? Paste this link into your browser:<br><a href="${url}" style="color:#5c5c5c;text-decoration:none;word-break:break-all;">${url}</a></td></tr>
<tr><td style="font-family:${FONT};font-size:12px;line-height:18px;color:#a3a3a3;">${escapeHtml(content.finePrint)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
};

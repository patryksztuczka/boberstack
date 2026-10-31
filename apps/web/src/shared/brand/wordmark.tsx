import { cn } from "@boberstack/ui/lib/utils";

import { m } from "../../paraglide/messages.js";

export const Wordmark = ({ className }: { readonly className?: string }) => (
  <span className={cn("font-display leading-none", className)}>
    {m.app_title()}
    <span className="text-brand">.</span>
  </span>
);

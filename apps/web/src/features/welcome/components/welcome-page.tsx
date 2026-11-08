import { Button } from "@boberstack/ui/components/button";
import { Link } from "react-router";

import { m } from "../../../paraglide/messages.js";
import { Wordmark } from "../../../shared/brand/wordmark.tsx";
import { Beaver } from "./beaver.tsx";

const ACTION = "h-11 rounded-[10px] px-[22px] text-[15px] font-semibold";

export const WelcomePage = () => (
  <div className="flex flex-col gap-24 pt-8 sm:pt-[72px]">
    <section className="flex flex-col items-center gap-10 text-center">
      <Beaver />
      <div className="flex flex-col items-center gap-[18px] pt-4">
        <h2 className="max-w-[520px] font-display text-[48px] leading-[46px] text-balance sm:text-[76px] sm:leading-[72px]">
          {m.welcome_title()}
          <span className="text-brand">.</span>
        </h2>
        <p className="max-w-[560px] text-lg leading-7 text-pretty text-muted-foreground">
          {m.welcome_lead()}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild className={ACTION}>
          <Link to="/todos">{m.welcome_open_example()}</Link>
        </Button>
        <Button asChild variant="outline" className={`${ACTION} border-[1.5px] border-foreground`}>
          <Link to="/sign-up">{m.welcome_create_account()}</Link>
        </Button>
      </div>
    </section>

    <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Wordmark className="text-xl" />
      <p className="font-mono text-xs text-muted-foreground">
        {m.welcome_delete_hint({ path: "apps/web/src/features/welcome" })}
      </p>
    </footer>
  </div>
);

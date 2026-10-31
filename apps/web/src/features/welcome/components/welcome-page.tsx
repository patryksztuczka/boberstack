import { Button } from "@boberstack/ui/components/button";
import { Link } from "react-router";

import { m } from "../../../paraglide/messages.js";
import { Wordmark } from "../../../shared/brand/wordmark.tsx";
import { Beaver } from "./beaver.tsx";

const QUICKSTART = ["pnpm install", "pnpm dev", "pnpm verify"] as const;

const ACTION = "h-11 rounded-[10px] px-[22px] text-[15px] font-semibold";

const SectionHeading = ({ title, meta }: { readonly title: string; readonly meta: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-b-[1.5px] border-foreground pb-3">
    <h3 className="font-display text-4xl">{title}</h3>
    <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">{meta}</p>
  </div>
);

export const WelcomePage = () => {
  const inside = [
    { title: m.welcome_inside_effect_title(), body: m.welcome_inside_effect_body() },
    { title: m.welcome_inside_worker_title(), body: m.welcome_inside_worker_body() },
    { title: m.welcome_inside_data_title(), body: m.welcome_inside_data_body() },
    { title: m.welcome_inside_web_title(), body: m.welcome_inside_web_body() },
    { title: m.welcome_inside_guards_title(), body: m.welcome_inside_guards_body() },
    { title: m.welcome_inside_agents_title(), body: m.welcome_inside_agents_body() },
  ];

  return (
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
          <Button
            asChild
            variant="outline"
            className={`${ACTION} border-[1.5px] border-foreground`}
          >
            <Link to="/sign-up">{m.welcome_create_account()}</Link>
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-7">
        <SectionHeading title={m.welcome_inside_title()} meta={m.welcome_inside_meta()} />
        <ol className="grid gap-x-12 gap-y-7 sm:grid-cols-2">
          {inside.map((item, index) => (
            <li key={item.title} className="flex flex-col gap-2">
              <span className="font-mono text-xs text-brand">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h4 className="text-lg leading-6 font-bold">{item.title}</h4>
              <p className="text-[15px] leading-[23px] text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeading title={m.welcome_quickstart_title()} meta={m.welcome_quickstart_meta()} />
        <pre className="overflow-x-auto rounded-[14px] bg-foreground px-[26px] py-6 font-mono text-[15px] leading-[30px] font-medium text-background">
          {QUICKSTART.map((command) => (
            <span key={command} className="block">
              <span className="text-brand select-none">$ </span>
              {command}
            </span>
          ))}
        </pre>
        <p className="max-w-[560px] text-[15px] leading-[23px] text-muted-foreground">
          {m.welcome_quickstart_body()}
        </p>
      </section>

      <footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark className="text-xl" />
        <p className="font-mono text-xs text-muted-foreground">
          {m.welcome_delete_hint({ path: "apps/web/src/features/welcome" })}
        </p>
      </footer>
    </div>
  );
};

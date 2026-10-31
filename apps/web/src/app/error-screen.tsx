import { Button } from "@boberstack/ui/components/button";

import { m } from "../paraglide/messages.js";

interface ErrorScreenProps {
  readonly sticker: string;
  readonly title: string;
  readonly description: string;
  readonly reload?: boolean;
}

export const ErrorScreen = ({ sticker, title, description, reload = false }: ErrorScreenProps) => (
  <section className="flex flex-col items-center gap-7 pt-8 pb-12 text-center sm:pt-[72px]">
    <img
      src={sticker}
      alt=""
      width="300"
      height="300"
      className="size-60 object-contain sm:size-[300px]"
    />
    <div className="flex flex-col items-center gap-3.5">
      <h2 className="font-display text-[44px] leading-[0.97] sm:text-[60px]">
        {title}
        <span className="text-brand">.</span>
      </h2>
      <p className="max-w-[460px] text-[17px] leading-[27px] text-muted-foreground">
        {description}
      </p>
    </div>
    <div className="flex flex-wrap justify-center gap-3">
      {reload ? (
        <Button
          type="button"
          className="h-11 rounded-[10px] px-[22px] text-[15px] font-semibold"
          onClick={() => globalThis.location.reload()}
        >
          {m.error_reload()}
        </Button>
      ) : undefined}
      <Button
        asChild
        variant={reload ? "outline" : "default"}
        className="h-11 rounded-[10px] border-[1.5px] border-foreground px-[22px] text-[15px] font-semibold"
      >
        <a href="/">{m.nav_home()}</a>
      </Button>
    </div>
  </section>
);

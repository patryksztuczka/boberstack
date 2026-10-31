import type { ReactNode } from "react";

export const PRIMARY_ACTION = "h-11 w-full rounded-[10px] text-[15px] font-semibold";

export const SECONDARY_ACTION = `${PRIMARY_ACTION} border-[1.5px] border-foreground`;

export const AuthPage = ({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: ReactNode;
  readonly children?: ReactNode;
}) => (
  <section className="mx-auto flex w-full max-w-sm flex-col gap-8 pt-6 sm:pt-12">
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-[40px] leading-[42px] text-balance">
        {title}
        <span className="text-brand">.</span>
      </h2>
      {description === undefined ? undefined : (
        <p className="text-[15px] leading-[23px] text-pretty text-muted-foreground">
          {description}
        </p>
      )}
    </div>
    {children}
  </section>
);

export const Notice = ({
  tone = "info",
  children,
}: {
  readonly tone?: "info" | "error";
  readonly children: ReactNode;
}) => (
  <p
    role={tone === "error" ? "alert" : "status"}
    className={
      tone === "error"
        ? "rounded-[10px] border-[1.5px] border-destructive/40 px-4 py-3 text-sm text-destructive"
        : "rounded-[10px] bg-muted px-4 py-3 text-sm text-foreground"
    }
  >
    {children}
  </p>
);

export const Divider = ({ label }: { readonly label: string }) => (
  <div className="flex items-center gap-3 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
    <span className="h-px flex-1 bg-border" />
    {label}
    <span className="h-px flex-1 bg-border" />
  </div>
);

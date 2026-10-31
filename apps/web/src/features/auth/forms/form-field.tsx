import { Input } from "@boberstack/ui/components/input";
import { Label } from "@boberstack/ui/components/label";
import type { ComponentProps } from "react";

export const FormField = ({
  label,
  error,
  id,
  ...input
}: ComponentProps<"input"> & {
  readonly id: string;
  readonly label: string;
  readonly error: string | undefined;
}) => (
  <div className="grid gap-2">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} aria-invalid={error === undefined ? undefined : true} {...input} />
    {error === undefined ? undefined : <p className="text-sm text-destructive">{error}</p>}
  </div>
);

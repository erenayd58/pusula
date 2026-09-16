import * as React from "react";
import { cn } from "@/lib/utils";
import { subjectVars, type SubjectColorToken } from "./subject-scope";

/**
 * Ders şeridi: kart kenarında tam renkli dikey şerit (04 Bölüm 4.2 "tam renk sadece şerit").
 * Clay: 8 px, koç (flat): 4 px. Kart `flex` + `overflow-hidden` olmalı; şerit `self-stretch`.
 * `color` verilmezse üst öğedeki `subjectVars()` değişkenlerini kullanır.
 */
export function SubjectStripe({
  color,
  className,
  style,
  ...props
}: React.ComponentProps<"span"> & { color?: SubjectColorToken | string }) {
  return (
    <span
      data-slot="subject-stripe"
      aria-hidden="true"
      style={{ ...(color ? subjectVars(color) : undefined), ...style }}
      className={cn("w-1 shrink-0 self-stretch bg-subject clay:w-2", className)}
      {...props}
    />
  );
}

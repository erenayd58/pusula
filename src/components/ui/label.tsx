"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/* Alan etiketi: koç yüzeyinde küçük ve ikincil, clay yüzeyinde 14 px ve vurgulu. */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "mb-1.5 flex items-center gap-2 text-micro-lg leading-none text-ink-500 select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:text-ink-300",
        "clay:mb-2 clay:text-small clay:font-medium clay:text-ink-900",
        className,
      )}
      {...props}
    />
  );
}

export { Label };

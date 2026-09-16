import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/*
 * Yüzey kuralı: öneksiz sınıflar koç (flat) ve yüzeysiz görünümdür; `clay:` öneki
 * öğrenci/veli yüzeyini verir (04-tasarim-sistemi.md Bölüm 3.2, 10).
 * Flat düğme görsel olarak 38 px'tir; dokunmatik cihazlarda (pointer-coarse) 44 px.
 * Odak halkası globaldir (:focus-visible), burada ayrıca tanımlanmaz.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-xs border text-small font-medium",
    "disabled:pointer-events-none disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "clay:rounded-md clay:text-body clay:font-semibold clay:[&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        primary: [
          "border-ink-900 bg-ink-900 text-bg-paper hover:bg-ink-700",
          "disabled:border-line disabled:bg-bg-surface disabled:text-ink-300",
          "clay:clay-press clay:border-0 clay:shadow-clay-md clay:hover:bg-ink-900",
          "clay:disabled:bg-bg-sunken clay:disabled:text-ink-300 clay:disabled:shadow-clay-well",
        ],
        secondary: [
          "border-line-strong bg-bg-paper text-ink-900 hover:bg-bg-surface",
          "disabled:border-line disabled:bg-bg-surface disabled:text-ink-300",
          "clay:clay-press clay:border-0 clay:clay-sm clay:hover:bg-bg-raised",
          "clay:disabled:bg-bg-sunken clay:disabled:text-ink-300 clay:disabled:shadow-clay-well",
        ],
        ghost: [
          "border-transparent bg-transparent text-ink-700 underline-offset-4 hover:underline",
          "disabled:text-ink-300",
          "clay:underline",
        ],
      },
      size: {
        default: ["min-h-[38px] px-4 pointer-coarse:min-h-11", "clay:min-h-12 clay:px-6"],
        icon: ["size-[38px] pointer-coarse:size-11", "clay:size-12"],
      },
    },
    compoundVariants: [{ variant: "ghost", size: "default", className: "px-2.5 clay:px-3" }],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? type : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };

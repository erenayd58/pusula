import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Kart: koç (flat) yüzeyinde 1 px kenarlık, gölge yok; clay yüzeyinde `elevation`
 * seviyesine göre clay-sm/md/lg (04 Bölüm 5). Veli (clay-calm) yüzeyinde seviye ne
 * olursa olsun clay-sm'e düşer. Clay kaptır, içerik düzdür.
 */
const cardVariants = cva(
  [
    "flex flex-col gap-4 rounded-sm border border-line bg-bg-paper p-4 text-ink-900",
    "clay:rounded-card clay:border-0 clay:p-5",
    "calm:clay-sm",
  ],
  {
    variants: {
      elevation: {
        sm: "clay:clay-sm calm:clay-sm",
        md: "clay:clay-md calm:clay-sm",
        lg: "clay:clay-lg calm:clay-sm",
      },
    },
    defaultVariants: {
      elevation: "md",
    },
  },
);

function Card({
  className,
  elevation = "md",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-elevation={elevation}
      className={cn(cardVariants({ elevation }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-col gap-1 has-data-[slot=card-action]:flex-row has-data-[slot=card-action]:items-start has-data-[slot=card-action]:justify-between",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-body leading-snug font-semibold clay:text-heading", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-small text-ink-500", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("shrink-0", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("text-small clay:text-body", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
};

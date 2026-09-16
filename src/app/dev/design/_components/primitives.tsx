import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Sadece /dev/design için küçük yerleşim yardımcıları. */

export function Section({
  number,
  title,
  note,
  children,
}: {
  number: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-16 first:mt-8">
      <div className="mb-5 flex flex-wrap items-baseline gap-3.5">
        <h2 className="text-title font-semibold tracking-tight lg:text-title-lg">
          {number} · {title}
        </h2>
        {note ? <p className="text-small text-ink-500">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Panel({
  variant,
  title,
  className,
  children,
}: {
  variant: "clay" | "flat";
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "p-6",
        variant === "clay"
          ? "rounded-lg bg-bg-surface"
          : "rounded-sm border border-line bg-bg-paper",
        className,
      )}
    >
      {title ? <p className="mb-4 text-small text-ink-500">{title}</p> : null}
      {children}
    </div>
  );
}

export function Token({ children }: { children: ReactNode }) {
  return <code className="font-mono text-micro text-ink-500">{children}</code>;
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-3.5 max-w-prose text-small leading-relaxed text-ink-500">{children}</p>;
}

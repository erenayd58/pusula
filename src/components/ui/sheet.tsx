"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSurface } from "@/components/layout/surface-root";
import { cn } from "@/lib/utils";

/*
 * Kenardan kayan panel (radix Dialog üstüne). `side="left"`: koç telefon menüsü (04 Bölüm 8.4,
 * `shadow-pop`); `side="bottom"`: alt panel. Portal ile body'ye çıktığı için yüzeyi
 * `useSurface()` ile alır. Diyalog/alt panel çiftinin tek API'si için `ResponsiveSheet`e bak.
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
  className,
  children,
  side = "left",
  title,
  description,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "left" | "bottom";
  /** Erişilebilirlik için zorunlu başlık; görsel olarak gizlenebilir. */
  title: string;
  description?: string;
}) {
  const surface = useSurface();
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        data-surface={surface}
        className={cn(
          "fixed inset-0 z-50 bg-ink-900/35 duration-150",
          "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          "clay:bg-bg-app/80",
        )}
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-surface={surface}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-bg-paper p-4 text-ink-900 shadow-pop duration-200 outline-none",
          "data-open:animate-in data-closed:animate-out",
          side === "left" &&
            "inset-y-0 left-0 w-[var(--coach-sidebar)] max-w-[85vw] border-r border-line data-open:slide-in-from-left data-closed:slide-out-to-left",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-lg border-t border-line data-open:slide-in-from-bottom data-closed:slide-out-to-bottom clay:rounded-t-xl clay:border-0 clay:bg-bg-raised clay:shadow-clay-lg",
          className,
        )}
        {...props}
      >
        <SheetPrimitive.Title className="sr-only">{title}</SheetPrimitive.Title>
        {description ? (
          <SheetPrimitive.Description className="sr-only">{description}</SheetPrimitive.Description>
        ) : null}
        {children}
        <SheetPrimitive.Close asChild>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Kapat"
            className="absolute top-3 right-3 clay:size-11 clay:rounded-md"
          >
            <XIcon />
          </Button>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetClose, SheetContent, SheetTrigger };

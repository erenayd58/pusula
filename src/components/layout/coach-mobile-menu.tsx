"use client";

import * as React from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/** Telefonda soldan açılan koç menüsü; bir bağlantıya tıklanınca kapanır. */
export function CoachMobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  function closeOnLink(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menüyü aç">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" title="Ana menü" className="gap-6">
        <div className="flex flex-1 flex-col gap-6" onClickCapture={closeOnLink}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

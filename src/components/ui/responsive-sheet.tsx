"use client";

import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/*
 * Tek API, iki görünüm (04 Bölüm 8, 10): < 768 px alttan açılan panel, ≥ 768 px ortada
 * diyalog. Sadece CSS ile (max-md:) yapılır; JS medya sorgusu yoktur, böylece sunucu ve istemci
 * aynı HTML'i üretir. Formlar bu bileşeni kullanır; Dialog'un alt parçaları aynen dışa açılır.
 */
const ResponsiveSheet = Dialog;
const ResponsiveSheetTrigger = DialogTrigger;
const ResponsiveSheetClose = DialogClose;
const ResponsiveSheetHeader = DialogHeader;
const ResponsiveSheetFooter = DialogFooter;
const ResponsiveSheetTitle = DialogTitle;
const ResponsiveSheetDescription = DialogDescription;

function ResponsiveSheetContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      data-slot="responsive-sheet-content"
      className={cn(
        "max-md:top-auto max-md:bottom-0 max-md:max-h-[90dvh] max-md:max-w-full max-md:translate-y-0 max-md:overflow-y-auto max-md:rounded-b-none max-md:pb-[max(env(safe-area-inset-bottom),16px)]",
        "max-md:data-open:zoom-in-100 max-md:data-open:slide-in-from-bottom-8 max-md:data-closed:zoom-out-100 max-md:data-closed:slide-out-to-bottom-8",
        "clay:max-md:rounded-t-xl",
        className,
      )}
      {...props}
    />
  );
}

export {
  ResponsiveSheet,
  ResponsiveSheetClose,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
  ResponsiveSheetTrigger,
};

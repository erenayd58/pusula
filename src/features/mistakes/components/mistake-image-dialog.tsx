"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Küçük görsel → tam görüntü diyaloğu (koç listesi ve öğrenci kartı). İmzalı URL sayfa yüklenirken
 * üretilir (10 dk); `next/image` kullanılmaz (imzalı, kısa ömürlü, harici olmayan URL).
 */
export function MistakeImageDialog({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`${title} fotoğrafını büyüt`}
          className={cn(
            "block shrink-0 overflow-hidden rounded-xs border border-line bg-bg-sunken clay:rounded-md clay:border-0 clay:clay-well",
            className,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- imzalı kısa ömürlü URL */}
          <img src={url} alt="" className="size-full object-cover" loading="lazy" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Soru fotoğrafı</DialogDescription>
        </DialogHeader>
        {/* eslint-disable-next-line @next/next/no-img-element -- imzalı kısa ömürlü URL */}
        <img
          src={url}
          alt={`${title} soru fotoğrafı`}
          className="max-h-[70vh] w-full object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}

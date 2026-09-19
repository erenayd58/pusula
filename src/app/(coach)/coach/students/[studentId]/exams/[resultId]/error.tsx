"use client";

import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SegmentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex items-center gap-2 text-error">
        <AlertCircleIcon className="size-5" aria-hidden="true" />
        <h1 className="text-heading font-semibold text-ink-900">Sayfa yüklenemedi</h1>
      </div>
      <p className="text-body text-ink-700">İnternet bağlantını kontrol edip tekrar dene.</p>
      <Button onClick={reset}>Tekrar dene</Button>
    </div>
  );
}

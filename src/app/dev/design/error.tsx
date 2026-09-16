"use client";

import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DesignError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-[var(--content-max)] flex-col items-start gap-4 px-4 py-12 md:px-8">
      <div className="flex items-center gap-2 text-error">
        <AlertCircleIcon className="size-5" aria-hidden="true" />
        <h1 className="text-title font-semibold text-ink-900">Sayfa yüklenemedi</h1>
      </div>
      <p className="text-body text-ink-700">Tasarım sayfası açılamadı. Tekrar dene.</p>
      <Button onClick={reset}>Tekrar dene</Button>
    </main>
  );
}

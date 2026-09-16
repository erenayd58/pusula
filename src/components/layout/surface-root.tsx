"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Yüzey dili (04-tasarim-sistemi.md Bölüm 2):
 * öğrenci `clay`, veli `clay-calm`, koç `flat`.
 */
export type Surface = "clay" | "clay-calm" | "flat";

const SurfaceContext = React.createContext<Surface | undefined>(undefined);

/**
 * Her rol layout'unun kök öğesi. `data-surface` özniteliğini koyar; ortak bileşenler
 * varyantını CSS'teki `clay:` / `calm:` / `flat:` varyantlarıyla buradan alır.
 * Yüzeyler iç içe konmaz. Portal ile dışarı çıkan bileşenler (Dialog) `useSurface()`
 * ile aynı özniteliği kendi üzerine koyar.
 */
export function SurfaceRoot({
  surface,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { surface: Surface }) {
  return (
    <SurfaceContext.Provider value={surface}>
      <div
        data-surface={surface}
        className={cn("flex min-h-dvh flex-col bg-bg-app text-ink-900", className)}
        {...props}
      >
        {children}
      </div>
    </SurfaceContext.Provider>
  );
}

/** En yakın SurfaceRoot'un yüzeyi; yüzey yoksa `undefined` (nötr görünüm). */
export function useSurface(): Surface | undefined {
  return React.useContext(SurfaceContext);
}

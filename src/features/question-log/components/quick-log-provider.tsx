"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { QuickLogContext, type QuickLogRequest } from "@/components/shared/quick-log-context";
import type { QuickLogOptions } from "../types";
import { QuickLogSheet } from "./quick-log-sheet";

export { useQuickLog } from "@/components/shared/quick-log-context";

/**
 * Hızlı kayıt sheet'ini tek kez render eder; (+) düğmesi, geçmiş sayfası ve plan görevi kartı
 * `useQuickLog().open()` ile açar. Seçenekler (dersler, konular, net kuralı) öğrenci
 * layout'unda sunucudan gelir. Context tanımı `components/shared/quick-log-context`.
 */
export function QuickLogProvider({
  studentId,
  options,
  children,
}: {
  studentId: string;
  options: QuickLogOptions | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<{
    open: boolean;
    request: QuickLogRequest;
    seq: number;
  }>({ open: false, request: {}, seq: 0 });

  const open = useCallback(
    (request?: QuickLogRequest) => {
      if (!options || options.subjects.length === 0) {
        toast("Kayıt için önce koçunun sana bir konu listesi (şablon) ataması gerekiyor.");
        return;
      }
      setState((s) => ({ open: true, request: request ?? {}, seq: s.seq + 1 }));
    },
    [options],
  );
  const value = useMemo(() => ({ open }), [open]);

  return (
    <QuickLogContext.Provider value={value}>
      {children}
      {options ? (
        <QuickLogSheet
          key={state.seq}
          open={state.open}
          onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}
          studentId={studentId}
          options={options}
          initial={state.request.edit ?? null}
          planItem={state.request.planItem ?? null}
          section={state.request.section ?? null}
        />
      ) : null}
    </QuickLogContext.Provider>
  );
}

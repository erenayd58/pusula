"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { QuickLogInitial, QuickLogOptions } from "../types";
import { QuickLogSheet } from "./quick-log-sheet";

type QuickLogContextValue = {
  /** Sheet'i açar; `initial` verilirse düzenleme modunda. */
  open: (initial?: QuickLogInitial) => void;
};

const QuickLogContext = createContext<QuickLogContextValue | null>(null);

/**
 * Hızlı kayıt sheet'ini tek kez render eder; (+) düğmesi ve geçmiş sayfası `useQuickLog().open()`
 * ile açar. Seçenekler (dersler, konular, net kuralı) öğrenci layout'unda sunucudan gelir.
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
    initial: QuickLogInitial | null;
    seq: number;
  }>({ open: false, initial: null, seq: 0 });

  const open = useCallback(
    (initial?: QuickLogInitial) => {
      if (!options || options.subjects.length === 0) {
        toast("Kayıt için önce koçunun sana bir konu listesi (şablon) ataması gerekiyor.");
        return;
      }
      setState((s) => ({ open: true, initial: initial ?? null, seq: s.seq + 1 }));
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
          initial={state.initial}
        />
      ) : null}
    </QuickLogContext.Provider>
  );
}

export function useQuickLog(): QuickLogContextValue {
  const ctx = useContext(QuickLogContext);
  if (!ctx) throw new Error("useQuickLog yalnızca QuickLogProvider içinde kullanılır.");
  return ctx;
}

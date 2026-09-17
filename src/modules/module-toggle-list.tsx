"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { LockIcon } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setStudentModule } from "@/modules/set-student-module";

/** İstemciye giden düz modül özeti (ikon gibi serileştirilemeyen alanlar yok). */
export type ModuleToggleRow = {
  id: string;
  name: string;
  description: string;
  core: boolean;
  /** Bağımlı olduğu modüllerin adları (arayüz metni için). */
  dependsOn: string[];
  enabled: boolean;
};

/**
 * Koç için modül aç/kapat listesi. Çekirdek modül kilitli görünür. Bağımlılık uyarısı satırda
 * yazılıdır; sunucu birlikte açılan/kapanan modülleri döndürür ve bildirim olarak gösterilir.
 */
export function ModuleToggleList({
  studentId,
  rows,
}: {
  studentId: string;
  rows: ModuleToggleRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    rows,
    (state, change: { moduleId: string; enabled: boolean }) =>
      state.map((r) => (r.id === change.moduleId ? { ...r, enabled: change.enabled } : r)),
  );

  function toggle(moduleId: string, enabled: boolean) {
    startTransition(async () => {
      setOptimistic({ moduleId, enabled });
      const result = await setStudentModule({ studentId, moduleId, enabled });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const others = result.data.changes.filter((c) => c.moduleId !== moduleId);
      const target = result.data.changes.find((c) => c.moduleId === moduleId);
      if (target) {
        const verb = enabled ? "açıldı" : "kapatıldı";
        toast.success(
          others.length > 0
            ? `${target.name} ${verb}; birlikte ${others.map((c) => c.name).join(", ")} da ${verb}.`
            : `${target.name} ${verb}.`,
        );
      }
      router.refresh();
    });
  }

  return (
    <ul className="divide-y divide-line rounded-sm border border-line bg-bg-paper">
      {optimistic.map((row) => {
        const switchId = `module-${row.id}`;
        return (
          <li key={row.id} className="flex items-start justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Label htmlFor={switchId} className="text-body font-medium text-ink-900">
                {row.name}
              </Label>
              <p className="text-small text-ink-700">{row.description}</p>
              {row.core ? (
                <p className="flex items-center gap-1 text-micro-lg text-ink-500">
                  <LockIcon aria-hidden="true" className="size-3.5" />
                  Çekirdek modül, kapatılamaz.
                </p>
              ) : row.dependsOn.length > 0 ? (
                <p className="text-micro-lg text-ink-500">
                  {`${row.dependsOn.join(", ")} modülünü gerektirir; birlikte açılır, o kapanınca bu da kapanır.`}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center p-2">
              <Switch
                id={switchId}
                checked={row.enabled}
                disabled={row.core || pending}
                aria-label={`${row.name} modülü`}
                onCheckedChange={(next) => toggle(row.id, next)}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

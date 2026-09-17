import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getEnabledModules } from "@/modules/get-enabled-modules";
import { ModuleToggleList } from "@/modules/module-toggle-list";
import { getModule, modules } from "@/modules/registry";

export const metadata: Metadata = { title: "Modüller" };

/** Öğrenci için modül aç/kapat (02-mimari Bölüm 3.3). Bağımlılıklar sunucuda birlikte çözülür. */
export default async function ModulesPage({
  params,
}: PageProps<"/coach/students/[studentId]/modules">) {
  const { studentId } = await params;
  await requireRole("coach", "owner");
  const enabled = await getEnabledModules(studentId);

  const rows = modules.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    core: m.core === true,
    dependsOn: (m.dependsOn ?? []).map((id) => getModule(id)?.name ?? id),
    enabled: enabled.has(m.id),
  }));

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading font-semibold">Modüller</h2>
        <p className="text-small text-ink-700">
          Kapatılan modül öğrencinin ve velinin menüsünden kalkar; adresi açılmaz. Bağımlı modüller
          birlikte açılır ve kapanır.
        </p>
      </div>
      <ModuleToggleList studentId={studentId} rows={rows} />
    </section>
  );
}

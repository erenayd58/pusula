import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGridIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getOrgSettings } from "@/features/core";
import {
  TemplateCalendar,
  TemplateEditor,
  getTemplateEditor,
  listTemplates,
} from "@/features/topics";
import { requireRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Şablonlar" };

const VIEWS = [
  { key: "topics", label: "Konular", href: "/coach/templates" },
  { key: "calendar", label: "Takvim", href: "/coach/templates?view=calendar" },
] as const;

/**
 * /coach/templates: şablonun ders ve konu listesi ("Konular") ya da okul takvimi ("Takvim",
 * `?view=calendar`; Faz 5a). Tek kurum ölçeğinde ilk (sistem) şablon gösterilir; şablon
 * kopyalama/seçimi kapsam dışı (Faz 2 planı). Takvimin varsayılan aralığı kurum ayarındaki
 * 1. sezon dönemi (09 §2 Parça 1).
 */
export default async function TemplatesPage({ searchParams }: PageProps<"/coach/templates">) {
  await requireRole("coach", "owner");
  const { view } = await searchParams;
  const activeView = view === "calendar" ? "calendar" : "topics";
  const [templates, settings] = await Promise.all([listTemplates(), getOrgSettings()]);
  const first = templates[0];
  const editor = first ? await getTemplateEditor(first.id) : null;
  const firstPeriod = settings.strategy.periods[0];
  const defaultRange = firstPeriod
    ? { from: firstPeriod.starts_on, to: firstPeriod.ends_on }
    : null;

  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold tracking-tight">Şablonlar</h1>
          {editor ? (
            <p className="text-small text-ink-500">
              {activeView === "calendar"
                ? `${editor.name} · her konu için okulun bitirmesi beklenen haftayı gir; "Sıradan dağıt" aralığa eşit yayar. Öğrenci haritasında ve uyarılarda kullanılır.`
                : `${editor.name} · konu ekle, adını değiştir, sırala veya sil. Değişiklik bu şablonu kullanan tüm öğrencilerin haritasına yansır.`}
            </p>
          ) : null}
        </div>
        {editor ? (
          <nav aria-label="Şablon görünümü" className="flex gap-1 border-b border-line">
            {VIEWS.map((v) => {
              const active = v.key === activeView;
              return (
                <Link
                  key={v.key}
                  href={v.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-small font-medium",
                    active
                      ? "border-ink-900 text-ink-900"
                      : "border-transparent text-ink-700 hover:text-ink-900",
                  )}
                >
                  {v.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>
      {editor ? (
        activeView === "calendar" ? (
          <TemplateCalendar template={editor} defaultRange={defaultRange} />
        ) : (
          <TemplateEditor template={editor} />
        )
      ) : (
        <EmptyState
          icon={LayoutGridIcon}
          title="Şablon bulunamadı"
          description="Sistem şablonu yüklenmemiş görünüyor. Veritabanı migration'larının uygulandığından emin olun."
        />
      )}
    </>
  );
}

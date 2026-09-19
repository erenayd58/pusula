import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGridIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { NativeSelect } from "@/components/shared/native-select";
import { getOrgSettings } from "@/features/core";
import {
  TemplateCalendar,
  TemplateCopyForm,
  TemplateEditor,
  getTemplateEditor,
  listTemplates,
} from "@/features/topics";
import { requireRole } from "@/lib/auth";
import { currentSeason } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Şablonlar" };

/** Sonraki sezon: "2026-2027" → "2027-2028" (kopya formu varsayılanı). */
function nextSeason(season: string): string {
  const start = Number(season.slice(0, 4));
  return Number.isFinite(start) ? `${start + 1}-${start + 2}` : season;
}

/**
 * /coach/templates: şablonun ders ve konu listesi ("Konular") ya da okul takvimi ("Takvim",
 * `?view=calendar`; Faz 5a). Birden fazla şablon varsa `?template=` seçici (Faz 7, karar D7:
 * kopyalanan şablon burada düzenlenir); yoksa ilk (sistem) şablon. Owner "Şablonu kopyala"
 * ile yeni sezon şablonu açar. Takvimin varsayılan aralığı kurum ayarındaki 1. sezon dönemi.
 */
export default async function TemplatesPage({ searchParams }: PageProps<"/coach/templates">) {
  const { profile } = await requireRole("coach", "owner");
  const { view, template } = await searchParams;
  const activeView = view === "calendar" ? "calendar" : "topics";
  const [templates, settings] = await Promise.all([listTemplates(), getOrgSettings()]);
  const selected =
    templates.find((t) => t.id === (typeof template === "string" ? template : "")) ?? templates[0];
  const templateQuery = selected && templates.length > 1 ? `template=${selected.id}` : "";
  const VIEWS = [
    {
      key: "topics",
      label: "Konular",
      href: `/coach/templates${templateQuery ? `?${templateQuery}` : ""}`,
    },
    {
      key: "calendar",
      label: "Takvim",
      href: `/coach/templates?view=calendar${templateQuery ? `&${templateQuery}` : ""}`,
    },
  ] as const;
  const editor = selected ? await getTemplateEditor(selected.id) : null;
  const firstPeriod = settings.strategy.periods[0];
  const defaultRange = firstPeriod
    ? { from: firstPeriod.starts_on, to: firstPeriod.ends_on }
    : null;

  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-title font-semibold tracking-tight">Şablonlar</h1>
            {templates.length > 1 && selected ? (
              <form method="get" className="flex items-center gap-2">
                {activeView === "calendar" ? (
                  <input type="hidden" name="view" value="calendar" />
                ) : null}
                <label htmlFor="template-select" className="text-small text-ink-700">
                  Şablon
                </label>
                <NativeSelect
                  id="template-select"
                  name="template"
                  defaultValue={selected.id}
                  className="w-auto min-w-48"
                  data-testid="template-select"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.isSystem ? " (sistem)" : ""}
                    </option>
                  ))}
                </NativeSelect>
                <button type="submit" className="text-small underline underline-offset-4">
                  Aç
                </button>
              </form>
            ) : null}
          </div>
          {selected && profile.role === "owner" ? (
            <TemplateCopyForm
              templateId={selected.id}
              templateName={selected.name}
              defaultSeason={nextSeason(currentSeason())}
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
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

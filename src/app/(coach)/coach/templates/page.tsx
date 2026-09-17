import type { Metadata } from "next";
import { LayoutGridIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { TemplateEditor, getTemplateEditor, listTemplates } from "@/features/topics";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Şablonlar" };

/**
 * /coach/templates: şablonun ders ve konu listesi. Tek kurum ölçeğinde ilk (sistem) şablon
 * gösterilir; şablon kopyalama/seçimi kapsam dışı (Faz 2 planı).
 */
export default async function TemplatesPage() {
  await requireRole("coach", "owner");
  const templates = await listTemplates();
  const first = templates[0];
  const editor = first ? await getTemplateEditor(first.id) : null;

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight">Şablonlar</h1>
        {editor ? (
          <p className="text-small text-ink-500">
            {editor.name} · konu ekle, adını değiştir, sırala veya sil. Değişiklik bu şablonu
            kullanan tüm öğrencilerin haritasına yansır.
          </p>
        ) : null}
      </header>
      {editor ? (
        <TemplateEditor template={editor} />
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

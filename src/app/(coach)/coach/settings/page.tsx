import type { Metadata } from "next";
import { OrgSettingsForm, getOrgSettings } from "@/features/core";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Ayarlar" };

/**
 * Kurum ayarları (karar A5): uyanık aralık, plan varsayılanları, uyarı eşikleri, öneri
 * sınırları. Owner düzenler; koç salt okunur görür. Değerler `organizations.settings`'ten.
 */
export default async function SettingsPage() {
  const { profile } = await requireRole("coach", "owner");
  const settings = await getOrgSettings();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight">Ayarlar</h1>
        <p className="text-small text-ink-500">
          Kurum geneli eşikler ve varsayılanlar; koda gömülü değer yok.
        </p>
      </header>
      <OrgSettingsForm initial={settings} canEdit={profile.role === "owner"} />
    </>
  );
}

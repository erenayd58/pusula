import type { Metadata } from "next";
import { roleLabels } from "@/content/labels";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Veli" };

export default async function Page() {
  const { profile } = await requireRole("parent");
  return (
    <>
      <header className="flex flex-col gap-1">
        <p className="text-small text-ink-500">{roleLabels[profile.role]}</p>
        <h1 className="text-title font-semibold tracking-tight">{`Hoş geldiniz, ${profile.full_name}`}</h1>
      </header>
      <p className="max-w-prose text-body text-ink-700">
        Bu ekran yer tutucu; menü ve modüller bir sonraki adımda geliyor.
      </p>
    </>
  );
}

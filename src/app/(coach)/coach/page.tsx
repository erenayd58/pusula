import type { Metadata } from "next";
import Link from "next/link";
import { roleLabels } from "@/content/labels";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Koç" };

export default async function Page() {
  const { profile } = await requireRole("coach", "owner");
  return (
    <>
      <header className="flex flex-col gap-1">
        <p className="text-small text-ink-500">{roleLabels[profile.role]}</p>
        <h1 className="text-title font-semibold tracking-tight">{profile.full_name}</h1>
      </header>
      <p className="max-w-prose text-body text-ink-700">
        Bu ekran yer tutucu; menü ve modüller bir sonraki adımda geliyor.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/coach/students"
          className="text-body font-medium text-ink-900 underline underline-offset-4"
        >
          Öğrenciler
        </Link>
      </div>
    </>
  );
}

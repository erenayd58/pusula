import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRightIcon, UsersIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { listChildren } from "@/features/core";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Çocuklarınız" };

/** Çocuk seçimi: tek çocuk varsa doğrudan özetine gider; birden fazlaysa liste. */
export default async function ParentHomePage() {
  const { profile } = await requireRole("parent");
  const children = await listChildren();
  if (children.length === 1) redirect(`/parent/${children[0]!.studentId}`);

  if (children.length === 0) {
    return (
      <EmptyState
        icon={UsersIcon}
        title="Henüz bağlı bir öğrenci yok"
        description="Koçunuzun gönderdiği davet koduyla çocuğunuzu hesabınıza bağlayabilirsiniz."
      />
    );
  }

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight">{`Hoş geldiniz, ${profile.full_name}`}</h1>
        <p className="text-body text-ink-700">Hangi çocuğunuzun özetine bakmak istersiniz?</p>
      </header>
      <ul className="flex flex-col gap-3">
        {children.map((child) => (
          <li key={child.studentId}>
            <Link
              href={`/parent/${child.studentId}`}
              className="flex min-h-14 clay-press items-center justify-between gap-3 rounded-card clay-sm px-5 py-4 text-body font-medium text-ink-900"
            >
              {child.fullName}
              <ChevronRightIcon aria-hidden="true" className="size-5 text-ink-500" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

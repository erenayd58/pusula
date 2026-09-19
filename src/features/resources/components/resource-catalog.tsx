"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resourceTypeLabels } from "@/content/labels";
import { formatCount } from "@/lib/format";
import { deleteResource, keepInCatalog } from "../server/actions";
import type { CatalogRow } from "../types";

const BASE = "/coach/resources";

/**
 * Kaynak kataloğu (koç, flat): kurum kataloğu tablosu (ad, yayınevi, tür, ders, test sayısı, atanan
 * öğrenci) + "Öğrenci ekledi" bölümü (öğrenci adı, kitap, test sayısı, "Katalogda tut" / "Kaldır").
 * Telefonda satırlar kart olur (tablo yatay kayar).
 */
export function ResourceCatalog({
  shared,
  studentAdded,
}: {
  shared: CatalogRow[];
  studentAdded: CatalogRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function keep(row: CatalogRow) {
    startTransition(async () => {
      const result = await keepInCatalog({ id: row.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`“${row.title}” kataloğa alındı.`);
      router.refresh();
    });
  }

  function remove(row: CatalogRow) {
    if (
      !window.confirm(
        `“${row.title}” kaldırılsın mı? Testleri silinir; öğrencilerin soru kayıtları kalır, kaynak bağı kalkar.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteResource({ id: row.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Kaynak kaldırıldı.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`${BASE}/new`}>
            <PlusIcon aria-hidden="true" />
            Kaynak tanımla
          </Link>
        </Button>
      </div>

      {shared.length === 0 ? (
        <p className="rounded-sm border border-line bg-bg-paper p-6 text-small text-ink-700">
          Katalogda kaynak yok. Bir kitabı test listesiyle tanımla; öğrenciye atadığında testleri
          işaretledikçe ilerlemesi burada ve kendi ekranında görünür.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper">
          <table className="w-full text-small" data-testid="resource-catalog">
            <thead className="text-left text-micro-lg text-ink-500">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Kaynak</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Ders</th>
                <th className="px-4 py-3 text-right font-medium">Test</th>
                <th className="px-4 py-3 text-right font-medium">Atanan</th>
              </tr>
            </thead>
            <tbody>
              {shared.map((r) => (
                <CatalogTr key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="student-added-heading">
        <div className="flex flex-col gap-1">
          <h2 id="student-added-heading" className="text-heading font-semibold text-ink-900">
            Öğrenci ekledi
          </h2>
          <p className="text-small text-ink-500">
            Öğrencilerin kendi eklediği kaynaklar yalnızca o öğrenciye görünür. “Katalogda tut” ile
            kurum kataloğuna alabilir, “Kaldır” ile silebilirsin.
          </p>
        </div>
        {studentAdded.length === 0 ? (
          <p className="text-small text-ink-500">Öğrenci eklemesi yok.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper">
            <table className="w-full text-small" data-testid="student-added-catalog">
              <thead className="text-left text-micro-lg text-ink-500">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-medium">Öğrenci</th>
                  <th className="px-4 py-3 font-medium">Kaynak</th>
                  <th className="px-4 py-3 font-medium">Ders</th>
                  <th className="px-4 py-3 text-right font-medium">Test</th>
                  <th className="px-4 py-3 text-right font-medium">Eylemler</th>
                </tr>
              </thead>
              <tbody>
                {studentAdded.map((r) => (
                  <tr
                    key={r.id}
                    data-testid="student-added-row"
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="px-4 py-3 text-ink-900">{r.studentName ?? "Öğrenci"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <Link
                          href={`${BASE}/${r.id}`}
                          className="font-medium text-ink-900 underline-offset-4 hover:underline"
                        >
                          {r.title}
                        </Link>
                        <span className="text-micro-lg text-ink-500">
                          {[r.publisher, resourceTypeLabels[r.type]].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SubjectCell row={r} />
                    </td>
                    <td className="px-4 py-3 text-right text-ink-900 tabular-nums">
                      {r.sectionCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          disabled={pending}
                          onClick={() => keep(r)}
                          aria-label={`${r.title} katalogda tut`}
                        >
                          Katalogda tut
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={pending}
                          onClick={() => remove(r)}
                          aria-label={`${r.title} kaldır`}
                        >
                          Kaldır
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CatalogTr({ row }: { row: CatalogRow }) {
  return (
    <tr data-testid="resource-row" className="border-b border-line last:border-b-0">
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <Link
            href={`${BASE}/${row.id}`}
            className="font-medium text-ink-900 underline-offset-4 hover:underline"
          >
            {row.title}
          </Link>
          <span className="text-micro-lg text-ink-500">
            {[row.publisher, row.publishYear].filter(Boolean).join(" · ") || "—"}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-ink-700">{resourceTypeLabels[row.type]}</td>
      <td className="px-4 py-3">
        <SubjectCell row={row} />
      </td>
      <td className="px-4 py-3 text-right text-ink-900 tabular-nums">{row.sectionCount}</td>
      <td className="px-4 py-3 text-right text-ink-900 tabular-nums">
        {formatCount(row.assignedCount, "öğrenci")}
      </td>
    </tr>
  );
}

function SubjectCell({ row }: { row: CatalogRow }) {
  if (row.subjectId && row.subjectColor && row.subjectShortName) {
    return <SubjectBadge color={row.subjectColor} shortName={row.subjectShortName} />;
  }
  return <Badge>Çok dersli</Badge>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resourceTypeLabels } from "@/content/labels";
import {
  AssignedStudents,
  ResourceActions,
  ResourceForm,
  SectionEditor,
  getResource,
  getResourceOptions,
  listStudentsForAssign,
} from "@/features/resources";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Kaynak" };

const BASE = "/coach/resources";

/**
 * Koç kitap detayı (flat): başlık + eylemler (Düzenle / Katalogda tut / Kaldır), test editörü
 * (toplu üretim, konuya eşleme, sıralama), atanan öğrenciler + "Öğrenciye ata". `?edit=1` kitap
 * alanları formu.
 */
export default async function CoachResourcePage({
  params,
  searchParams,
}: PageProps<"/coach/resources/[resourceId]">) {
  const { resourceId } = await params;
  const { edit } = await searchParams;
  await requireRole("coach", "owner");
  const resource = await getResource(resourceId);
  if (!resource) notFound();
  const [options, students] = await Promise.all([
    getResourceOptions(resource.templateId),
    listStudentsForAssign(resource.id),
  ]);
  if (!options) notFound();

  return (
    <>
      <header className="flex flex-col gap-2">
        <Button variant="ghost" asChild className="w-fit">
          <Link href={BASE}>
            <ArrowLeftIcon aria-hidden="true" />
            Kaynaklar
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-title font-semibold tracking-tight">{resource.title}</h1>
            <p className="flex flex-wrap items-center gap-2 text-small text-ink-500">
              {resource.subjectColor && resource.subjectShortName ? (
                <SubjectBadge color={resource.subjectColor} shortName={resource.subjectShortName} />
              ) : (
                <Badge>Çok dersli</Badge>
              )}
              <span>{resourceTypeLabels[resource.type]}</span>
              {resource.publisher ? <span>· {resource.publisher}</span> : null}
              {resource.publishYear ? <span>· {resource.publishYear}</span> : null}
            </p>
          </div>
          {edit === "1" ? null : <ResourceActions resource={resource} />}
        </div>
      </header>

      {edit === "1" ? (
        <ResourceForm
          options={options}
          catalog={[]}
          audience="coach"
          basePath={BASE}
          resource={resource}
        />
      ) : (
        <>
          <SectionEditor resource={resource} options={options} />
          <AssignedStudents resource={resource} students={students} />
        </>
      )}
    </>
  );
}

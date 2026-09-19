import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResourceForm,
  SectionEditor,
  StudentResourceDetail,
  getResource,
  getResourceOptions,
  getStudentResource,
} from "@/features/resources";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Kaynak" };

const BASE = "/student/resources";

/**
 * Kitap detayı (öğrenci, clay): testler, bitenler işaretli; dokununca hızlı kayıt. Öğrencinin
 * kendi özel kaynağında "Düzenle" (`?edit=1`): kitap alanları + test editörü.
 */
export default async function StudentResourcePage({
  params,
  searchParams,
}: PageProps<"/student/resources/[resourceId]">) {
  const { resourceId } = await params;
  const { edit } = await searchParams;
  const { userId } = await requireRole("student");
  await requireModule(userId, "resources");
  const detail = await getStudentResource(userId, resourceId);
  if (!detail) notFound();
  const editing = edit === "1" && detail.resource.isOwn;

  if (editing) {
    const resource = await getResource(resourceId);
    const options = resource ? await getResourceOptions(resource.templateId) : null;
    if (!resource || !options) notFound();
    return (
      <>
        <header className="flex flex-col gap-1">
          <Button variant="ghost" asChild className="w-fit">
            <Link href={`${BASE}/${resourceId}`}>
              <ArrowLeftIcon aria-hidden="true" />
              Kitaba dön
            </Link>
          </Button>
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
            {resource.title}
          </h1>
        </header>
        <ResourceForm
          options={options}
          catalog={[]}
          audience="student"
          basePath={BASE}
          resource={resource}
        />
        <SectionEditor resource={resource} options={options} />
      </>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-1">
        <Button variant="ghost" asChild className="w-fit">
          <Link href={BASE}>
            <ArrowLeftIcon aria-hidden="true" />
            Kaynaklarım
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
            {detail.resource.title}
          </h1>
          {detail.resource.isOwn ? (
            <Button variant="secondary" asChild>
              <Link href={`${BASE}/${resourceId}?edit=1`}>
                <PencilIcon aria-hidden="true" />
                Düzenle
              </Link>
            </Button>
          ) : null}
        </div>
        <p className="text-small text-ink-500">
          Bitirdiğin teste dokun; sayıları gir, kaydet. Kayıt bu testle bağlanır.
        </p>
      </header>
      <StudentResourceDetail resource={detail.resource} sections={detail.sections} />
    </>
  );
}

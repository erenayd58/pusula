import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, LayoutGridIcon } from "lucide-react";
import { z } from "zod";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { MistakeForm, getMistakeOptions } from "@/features/mistakes";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Yanlış ekle" };

const BASE = "/student/mistakes";

const uuidParam = (v: string | string[] | undefined) =>
  typeof v === "string" && z.uuid().safeParse(v).success ? v : undefined;

/** Yeni yanlış kaydı; `?subjectId=&topicId=&mockResultId=` ile ön dolgu (deneme detayındaki "Deftere ekle"). */
export default async function NewMistakePage({ searchParams }: PageProps<"/student/mistakes/new">) {
  const { userId } = await requireRole("student");
  await requireModule(userId, "mistakes");
  const sp = await searchParams;
  const options = await getMistakeOptions(userId);

  return (
    <>
      <header className="flex flex-col gap-2">
        <Button asChild variant="ghost" className="w-fit">
          <Link href={BASE}>
            <ChevronLeftIcon aria-hidden="true" />
            Yanlış defterim
          </Link>
        </Button>
        <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Yanlış ekle</h1>
        <p className="text-small text-ink-500">
          Fotoğraf çek ya da soruyu kısaca yaz; dersi seç, istersen nedenini işaretle.
        </p>
      </header>
      {options ? (
        <MistakeForm
          studentId={userId}
          options={options}
          initial={null}
          prefill={{
            subjectId: uuidParam(sp.subjectId),
            topicId: uuidParam(sp.topicId),
            mockResultId: uuidParam(sp.mockResultId),
          }}
          basePath={BASE}
        />
      ) : (
        <EmptyState
          icon={LayoutGridIcon}
          title="Konu listesi atanmamış"
          description="Koçun sana bir konu listesi atadığında yanlış ekleyebilirsin. Koçuna haber verebilirsin."
        />
      )}
    </>
  );
}

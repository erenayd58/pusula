import type { Metadata } from "next";
import { addDays } from "date-fns";
import { z } from "zod";
import {
  QuestionLogFilters,
  QuestionLogTable,
  getQuickLogOptions,
  listQuestionLogs,
} from "@/features/question-log";
import { requireRole } from "@/lib/auth";
import { toDateKey, todayInIstanbul } from "@/lib/dates";
import { formatCount } from "@/lib/format";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Sorular" };

const paramsSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  subject: z.uuid().optional(),
});

/** K2 Sorular sekmesi: tarih aralığı (varsayılan son 28 gün) ve ders filtreli kayıt tablosu. */
export default async function CoachStudentQuestionsPage({
  params,
  searchParams,
}: PageProps<"/coach/students/[studentId]/questions">) {
  const { studentId } = await params;
  await requireRole("coach", "owner");
  await requireModule(studentId, "question-log");

  const today = todayInIstanbul();
  const raw = await searchParams;
  const parsed = paramsSchema.safeParse({
    from: typeof raw.from === "string" && raw.from ? raw.from : undefined,
    to: typeof raw.to === "string" && raw.to ? raw.to : undefined,
    subject: typeof raw.subject === "string" && raw.subject ? raw.subject : undefined,
  });
  const filter = parsed.success ? parsed.data : {};
  const to = filter.to ?? toDateKey(today);
  const from = filter.from ?? toDateKey(addDays(today, -27));
  const subjectId = filter.subject ?? null;

  const [options, rows] = await Promise.all([
    getQuickLogOptions(studentId),
    listQuestionLogs(studentId, { from: from <= to ? from : to, to, subjectId }),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <QuestionLogFilters
        from={from}
        to={to}
        subjectId={subjectId}
        subjects={(options?.subjects ?? []).map((s) => ({ subjectId: s.subjectId, name: s.name }))}
      />
      <p className="text-small text-ink-500">
        {`${formatCount(rows.length, "kayıt")} · ${formatCount(
          rows.reduce((s, r) => s + r.total, 0),
          "soru",
        )}`}
      </p>
      <QuestionLogTable rows={rows} wrongPenalty={options?.wrongPenalty ?? 0} />
    </section>
  );
}

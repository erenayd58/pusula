import type { Metadata } from "next";
import { addDays } from "date-fns";
import { PencilLineIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { LogHistoryList, listQuestionLogs } from "@/features/question-log";
import { requireRole } from "@/lib/auth";
import { toDateKey, todayInIstanbul } from "@/lib/dates";
import { formatCount } from "@/lib/format";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Kayıtlarım" };

const DAYS = 60;

/** Kayıt geçmişi: son 60 gün, gün gruplu; düzenleme ve onaylı silme. Bugün'deki "Tümü" buraya gelir. */
export default async function LogsPage() {
  const { userId } = await requireRole("student");
  await requireModule(userId, "question-log");
  const today = todayInIstanbul();
  const rows = await listQuestionLogs(userId, {
    from: toDateKey(addDays(today, -(DAYS - 1))),
    to: toDateKey(today),
  });
  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Kayıtlarım</h1>
        <p className="text-small text-ink-500">
          {`Son ${DAYS} gün · ${formatCount(rows.length, "kayıt")} · ${formatCount(total, "soru")}`}
        </p>
      </header>
      {rows.length === 0 ? (
        <EmptyState
          icon={PencilLineIcon}
          title="Henüz kayıt yok"
          description="(+) düğmesiyle ilk soru kaydını gir; kayıtların gün gün burada listelenir."
        />
      ) : (
        <LogHistoryList rows={rows} />
      )}
    </>
  );
}

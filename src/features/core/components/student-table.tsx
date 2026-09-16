import Link from "next/link";
import { studentStatusLabels } from "@/content/labels";
import type { StudentListRow } from "../server/queries";
import { StudentRowActions } from "./student-row-actions";

/**
 * Yer tutucu öğrenci listesi (flat). Satır eylemleri (şifre sıfırlama, davet kodu, koç atama,
 * silme) ayrı istemci bileşenlerinde; kabuk ve gerçek tablo Faz 1c'de.
 */
export function StudentTable({
  students,
  viewerRole,
  coaches,
}: {
  students: StudentListRow[];
  viewerRole: "coach" | "owner";
  /** Owner için koç seçenekleri (koç ata diyaloğu); koçta boş. */
  coaches: { id: string; fullName: string }[];
}) {
  if (students.length === 0) {
    return (
      <div className="rounded-sm border border-line bg-bg-paper p-6 text-small text-ink-700">
        Henüz öğrenci yok.{" "}
        <Link
          href="/coach/students/new"
          className="font-medium text-ink-900 underline underline-offset-4"
        >
          İlk öğrenciyi ekle
        </Link>
        , kullanıcı adı ve geçici şifreyle giriş yapsın.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper">
      <table className="w-full text-small">
        <thead className="text-left text-micro-lg text-ink-500">
          <tr className="border-b border-line">
            <th className="px-4 py-3 font-medium">Öğrenci</th>
            <th className="px-4 py-3 font-medium">Kullanıcı adı</th>
            <th className="px-4 py-3 font-medium">Sezon</th>
            <th className="px-4 py-3 font-medium">Durum</th>
            {viewerRole === "owner" ? <th className="px-4 py-3 font-medium">Koç</th> : null}
            <th className="px-4 py-3 text-right font-medium">Eylemler</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.profileId} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3 font-medium text-ink-900">{s.fullName}</td>
              <td className="px-4 py-3 font-mono text-ink-700">{s.username}</td>
              <td className="px-4 py-3 text-ink-700">{s.season}</td>
              <td className="px-4 py-3 text-ink-700">{studentStatusLabels[s.status]}</td>
              {viewerRole === "owner" ? (
                <td className="px-4 py-3 text-ink-700">{s.coachName ?? "—"}</td>
              ) : null}
              <td className="px-4 py-3">
                <StudentRowActions
                  student={{ profileId: s.profileId, fullName: s.fullName, coachId: s.coachId }}
                  viewerRole={viewerRole}
                  coaches={coaches}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

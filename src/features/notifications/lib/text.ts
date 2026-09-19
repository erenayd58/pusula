import {
  formatCount,
  formatDateTr,
  formatDuration,
  formatNamePossessive,
  formatNet,
  formatPossessive,
  formatWeekRange,
} from "@/lib/format";
import type { NotificationType } from "@/types";
import {
  announcementData,
  mockResultAddedData,
  noteAddedData,
  planPublishedData,
  reviewDueData,
  studentInactiveData,
  studentNoteData,
  weeklySummaryCoachData,
  weeklySummaryStudentData,
} from "../schemas";

/**
 * Bildirim metni (12 §3.1, karar E2): tür + `data` + rol → başlık, gövde, bağlantı. Saf;
 * sayılar `lib/format` (NBSP, U+2212), öğrenciye "sen", veliye "siz" (üçüncü tekil ad), koça
 * nötr. Bozuk/eksik veri ya da role uymayan tür → nötr "Bildirim" satırı, bağlantı liste sayfası.
 */
export type NotificationRole = "student" | "coach" | "parent";

export type NotificationText = { title: string; body: string; href: string };

export type NotificationTextInput = {
  type: NotificationType;
  data: unknown;
  role: NotificationRole;
  studentId: string | null;
  /** İlgili öğrencinin adı (koç ve veli metinleri); yoksa nötr ad. */
  studentName: string | null;
};

/** Sayı iyeliğinin belirtme hâli: `80'i` → `80'ini`, `9'u` → `9'unu`, `3'ü` → `3'ünü`. */
function possessiveAccusative(value: number): string {
  const p = formatPossessive(value);
  const last = p.at(-1) ?? "i";
  return `${p}n${last}`;
}

function firstName(name: string | null, fallback: string): string {
  const trimmed = name?.trim() ?? "";
  return trimmed === "" ? fallback : (trimmed.split(/\s+/)[0] ?? fallback);
}

function fallback(role: NotificationRole): NotificationText {
  return { title: "Bildirim", body: "", href: `/${role}/notifications` };
}

export function notificationText(input: NotificationTextInput): NotificationText {
  const { type, data, role, studentId } = input;
  const listHref = `/${role}/notifications`;

  switch (type) {
    case "plan_published": {
      const d = planPublishedData.safeParse(data);
      if (!d.success || role !== "student") return fallback(role);
      return {
        title: "Haftalık planın hazır",
        body: `${formatWeekRange(d.data.week_start)} için ${formatCount(d.data.items_count, "görev")}${d.data.has_message ? " · koçundan mesaj var" : ""}`,
        href: `/student/plan?week=${d.data.week_start}`,
      };
    }
    case "note_added": {
      const d = noteAddedData.safeParse(data);
      if (!d.success) return fallback(role);
      if (role === "student") {
        return { title: "Koçun not yazdı", body: d.data.excerpt, href: "/student/notes" };
      }
      if (role === "parent" && studentId) {
        const name = firstName(input.studentName, "çocuğunuz");
        return {
          title: `Koç ${name} için not yazdı`,
          body: d.data.excerpt,
          href: `/parent/${studentId}/notes`,
        };
      }
      return fallback(role);
    }
    case "announcement": {
      const d = announcementData.safeParse(data);
      if (!d.success || role === "coach") return fallback(role);
      return { title: d.data.title, body: d.data.body, href: listHref };
    }
    case "mock_result_added": {
      const d = mockResultAddedData.safeParse(data);
      if (!d.success || role !== "coach" || !studentId) return fallback(role);
      const name = firstName(input.studentName, "Öğrenci");
      const parts = [d.data.title, formatDateTr(d.data.taken_on)].filter((v): v is string => !!v);
      return {
        title: `${name} deneme sonucu girdi`,
        body: `${parts.join(" · ")}${d.data.is_branch ? " · branş" : ""}`,
        href: `/coach/students/${studentId}/exams/${d.data.result_id}`,
      };
    }
    case "student_note": {
      const d = studentNoteData.safeParse(data);
      if (!d.success || role !== "coach" || !studentId) return fallback(role);
      const name = firstName(input.studentName, "Öğrenci");
      const title =
        d.data.kind === "reflection"
          ? `${name} haftasını değerlendirdi`
          : `${name} görev notu bıraktı`;
      const body = d.data.item_title ? `${d.data.item_title}: ${d.data.excerpt}` : d.data.excerpt;
      return { title, body, href: `/coach/students/${studentId}/plan?week=${d.data.week_start}` };
    }
    case "review_due": {
      const d = reviewDueData.safeParse(data);
      if (!d.success || role !== "student") return fallback(role);
      const rest = d.data.count - d.data.topics.length;
      const list = d.data.topics.join(", ");
      return {
        title:
          d.data.count === 1
            ? "1 konunun tekrar zamanı geldi"
            : `${formatCount(d.data.count, "konunun")} tekrar zamanı geldi`,
        body: rest > 0 ? `${list} ve ${formatCount(rest, "konu")} daha` : list,
        href: "/student/topics",
      };
    }
    case "student_inactive": {
      const d = studentInactiveData.safeParse(data);
      if (!d.success || role !== "coach" || !studentId) return fallback(role);
      const name = firstName(input.studentName, "Öğrenci");
      return {
        title: `${name} ${formatCount(d.data.days, "gündür")} kayıt girmedi`,
        body: "Bir not yazabilir ya da planı gözden geçirebilirsin.",
        href: `/coach/students/${studentId}`,
      };
    }
    case "weekly_summary":
      return weeklySummary(input);
  }
}

function weeklySummary(input: NotificationTextInput): NotificationText {
  const { role, data, studentId } = input;
  if (role === "coach") {
    const d = weeklySummaryCoachData.safeParse(data);
    if (!d.success) return fallback(role);
    const t = d.data.totals;
    const parts = [formatCount(t.students, "öğrenci"), formatCount(t.questions, "soru")];
    if (t.plan_percent_avg !== null)
      parts.push(`plan uyumu ort. %${formatCount(t.plan_percent_avg)}`);
    return {
      title: `Haftalık özet · ${formatWeekRange(d.data.week_start)}`,
      body: parts.join(" · "),
      href: "/coach/students",
    };
  }

  const d = weeklySummaryStudentData.safeParse(data);
  if (!d.success) return fallback(role);
  const s = d.data;
  const hasWork = s.questions > 0 || s.study_minutes > 0;

  if (role === "student") {
    const parts: string[] = [];
    if (hasWork) {
      parts.push(`${formatCount(s.questions, "soru")} çözdün`);
      if (s.study_minutes > 0) parts.push(`${formatDuration(s.study_minutes)} çalıştın`);
    } else {
      parts.push("bu hafta soru kaydı yok");
    }
    let body = parts.join(", ");
    if (s.plan_percent !== null) body += `; planının %${formatPossessive(s.plan_percent)} tamam`;
    if (s.topics_done > 0) body += `; ${formatCount(s.topics_done, "konu")} bitirdin`;
    if (s.last_net !== null) body += ` · son net ${formatNet(s.last_net)}`;
    return {
      title: `Haftan böyle geçti · ${formatWeekRange(s.week_start)}`,
      body: body.charAt(0).toLocaleUpperCase("tr-TR") + body.slice(1) + ".",
      href: "/student/today",
    };
  }

  if (role === "parent" && studentId) {
    const name = firstName(input.studentName, "Çocuğunuz");
    let body = hasWork
      ? `${name} bu hafta ${formatCount(s.questions, "soru")} çözdü${s.study_minutes > 0 ? ` ve ${formatDuration(s.study_minutes)} çalıştı` : ""}`
      : `${name} bu hafta soru kaydı girmedi`;
    if (s.plan_percent !== null)
      body += `; planının %${possessiveAccusative(s.plan_percent)} tamamladı`;
    if (s.topics_done > 0) body += `; ${formatCount(s.topics_done, "konu")} bitirdi`;
    return {
      title: `${formatNamePossessive(name)} haftası · ${formatWeekRange(s.week_start)}`,
      body: `${body}.`,
      href: `/parent/${studentId}?week=${s.week_start}`,
    };
  }
  return fallback(role);
}

import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/format";
import { notificationText } from "./text";

const SID = "b0000000-0000-4000-8000-000000000011";
const UUID = "c0000000-0000-4000-8000-000000000001";
const DASH = ` ${String.fromCharCode(0x2013)} `;

describe("notificationText", () => {
  it("plan yayını: öğrenciye sen dili, hafta ve görev sayısı, plan bağlantısı", () => {
    const t = notificationText({
      type: "plan_published",
      data: { plan_id: UUID, week_start: "2026-09-14", items_count: 12, has_message: true },
      role: "student",
      studentId: SID,
      studentName: "Ayşe Kılıç",
    });
    expect(t).toEqual({
      title: "Haftalık planın hazır",
      body: `14${DASH}20${NBSP}Eylül için 12${NBSP}görev · koçundan mesaj var`,
      href: "/student/plan?week=2026-09-14",
    });
  });

  it("koç notu: öğrenciye ve veliye farklı başlık ve bağlantı", () => {
    const data = { note_id: UUID, author_name: "Murat Kaya", excerpt: "Paragrafa ağırlık ver." };
    expect(
      notificationText({
        type: "note_added",
        data,
        role: "student",
        studentId: SID,
        studentName: "Ayşe",
      }),
    ).toEqual({ title: "Koçun not yazdı", body: "Paragrafa ağırlık ver.", href: "/student/notes" });
    expect(
      notificationText({
        type: "note_added",
        data,
        role: "parent",
        studentId: SID,
        studentName: "Ayşe Kılıç",
      }),
    ).toEqual({
      title: "Koç Ayşe için not yazdı",
      body: "Paragrafa ağırlık ver.",
      href: `/parent/${SID}/notes`,
    });
  });

  it("duyuru: başlık ve gövde, liste bağlantısı; koça uymaz → nötr", () => {
    const data = { announcement_id: UUID, title: "Deneme günü", body: "Cumartesi 10:00" };
    expect(
      notificationText({
        type: "announcement",
        data,
        role: "parent",
        studentId: SID,
        studentName: null,
      }),
    ).toEqual({
      title: "Deneme günü",
      body: "Cumartesi 10:00",
      href: "/parent/notifications",
    });
    expect(
      notificationText({
        type: "announcement",
        data,
        role: "coach",
        studentId: SID,
        studentName: null,
      }),
    ).toEqual({
      title: "Bildirim",
      body: "",
      href: "/coach/notifications",
    });
  });

  it("deneme girildi: koça öğrenci adı, deneme adı ve tarih; sonuç sayfası", () => {
    const t = notificationText({
      type: "mock_result_added",
      data: { result_id: UUID, taken_on: "2026-09-14", title: "Kafa Dengi 6", is_branch: false },
      role: "coach",
      studentId: SID,
      studentName: "Ayşe Kılıç",
    });
    expect(t).toEqual({
      title: "Ayşe deneme sonucu girdi",
      body: `Kafa Dengi 6 · 14${NBSP}Eylül`,
      href: `/coach/students/${SID}/exams/${UUID}`,
    });
  });

  it("öğrenci notu: görev ve değerlendirme", () => {
    expect(
      notificationText({
        type: "student_note",
        data: {
          kind: "item",
          plan_id: UUID,
          week_start: "2026-09-14",
          item_id: UUID,
          item_title: "Test 12",
          excerpt: "Zor geldi",
        },
        role: "coach",
        studentId: SID,
        studentName: "Ayşe",
      }),
    ).toEqual({
      title: "Ayşe görev notu bıraktı",
      body: "Test 12: Zor geldi",
      href: `/coach/students/${SID}/plan?week=2026-09-14`,
    });
    expect(
      notificationText({
        type: "student_note",
        data: { kind: "reflection", plan_id: UUID, week_start: "2026-09-14", excerpt: "İyi geçti" },
        role: "coach",
        studentId: SID,
        studentName: "Ayşe",
      }).title,
    ).toBe("Ayşe haftasını değerlendirdi");
  });

  it("tekrar zamanı: sayı ve ilk konular, fazlası 've N konu daha'", () => {
    expect(
      notificationText({
        type: "review_due",
        data: { count: 5, topics: ["Üslü İfadeler", "Basınç", "Paragraf"] },
        role: "student",
        studentId: SID,
        studentName: null,
      }),
    ).toEqual({
      title: `5${NBSP}konunun tekrar zamanı geldi`,
      body: `Üslü İfadeler, Basınç, Paragraf ve 2${NBSP}konu daha`,
      href: "/student/topics",
    });
    expect(
      notificationText({
        type: "review_due",
        data: { count: 1, topics: ["Basınç"] },
        role: "student",
        studentId: SID,
        studentName: null,
      }),
    ).toMatchObject({ title: "1 konunun tekrar zamanı geldi", body: "Basınç" });
  });

  it("hareketsizlik: koça", () => {
    expect(
      notificationText({
        type: "student_inactive",
        data: { days: 5 },
        role: "coach",
        studentId: SID,
        studentName: "Zeynep Arslan",
      }),
    ).toEqual({
      title: `Zeynep 5${NBSP}gündür kayıt girmedi`,
      body: "Bir not yazabilir ya da planı gözden geçirebilirsin.",
      href: `/coach/students/${SID}`,
    });
  });

  it("haftalık özet: öğrenci, veli ve koç metinleri", () => {
    const data = {
      week_start: "2026-09-14",
      questions: 612,
      study_minutes: 860,
      plan_total: 10,
      plan_done: 8,
      plan_percent: 80,
      topics_done: 2,
      last_net: 71.33,
    };
    expect(
      notificationText({
        type: "weekly_summary",
        data,
        role: "student",
        studentId: SID,
        studentName: "Ayşe",
      }),
    ).toEqual({
      title: `Haftan böyle geçti · 14${DASH}20${NBSP}Eylül`,
      body: `612${NBSP}soru çözdün, 14${NBSP}sa${NBSP}20${NBSP}dk çalıştın; planının %80'i tamam; 2${NBSP}konu bitirdin · son net 71,33.`,
      href: "/student/today",
    });
    expect(
      notificationText({
        type: "weekly_summary",
        data,
        role: "parent",
        studentId: SID,
        studentName: "Ayşe Kılıç",
      }),
    ).toEqual({
      title: `Ayşe'nin haftası · 14${DASH}20${NBSP}Eylül`,
      body: `Ayşe bu hafta 612${NBSP}soru çözdü ve 14${NBSP}sa${NBSP}20${NBSP}dk çalıştı; planının %80'ini tamamladı; 2${NBSP}konu bitirdi.`,
      href: `/parent/${SID}?week=2026-09-14`,
    });
    const quiet = {
      ...data,
      questions: 0,
      study_minutes: 0,
      plan_percent: null,
      topics_done: 0,
      last_net: null,
    };
    expect(
      notificationText({
        type: "weekly_summary",
        data: quiet,
        role: "parent",
        studentId: SID,
        studentName: "Ayşe",
      }).body,
    ).toBe("Ayşe bu hafta soru kaydı girmedi.");
    expect(
      notificationText({
        type: "weekly_summary",
        data: quiet,
        role: "student",
        studentId: SID,
        studentName: null,
      }).body,
    ).toBe("Bu hafta soru kaydı yok.");
    expect(
      notificationText({
        type: "weekly_summary",
        data: {
          week_start: "2026-09-14",
          students: [{ student_id: SID, name: "Ayşe", questions: 330, plan_percent: 28 }],
          totals: { students: 3, questions: 1240, plan_percent_avg: 62 },
        },
        role: "coach",
        studentId: null,
        studentName: null,
      }),
    ).toEqual({
      title: `Haftalık özet · 14${DASH}20${NBSP}Eylül`,
      body: `3${NBSP}öğrenci · 1.240${NBSP}soru · plan uyumu ort. %62`,
      href: "/coach/students",
    });
  });

  it("bozuk veri nötr satıra düşer", () => {
    expect(
      notificationText({
        type: "plan_published",
        data: { nope: 1 },
        role: "student",
        studentId: SID,
        studentName: null,
      }),
    ).toEqual({
      title: "Bildirim",
      body: "",
      href: "/student/notifications",
    });
  });
});

import { CircleIcon, SquareIcon } from "lucide-react";
import { describe, expect, it } from "vitest";
import { defineModule } from "@/modules/define-module";
import {
  findModuleByHref,
  findModuleBySegment,
  getCoachNav,
  getCoachStudentTabs,
  getParentNav,
  getStudentNav,
  mergeEnabled,
  resolveToggle,
} from "./registry-helpers";

const core = defineModule({
  id: "core",
  name: "Çekirdek",
  description: "",
  icon: CircleIcon,
  core: true,
  defaultEnabled: true,
  nav: {
    student: [
      { href: "/student/today", label: "Bugün", order: 10, mobile: true },
      { href: "/student/profile", label: "Ben", icon: SquareIcon, order: 90, mobile: true },
    ],
    coach: [{ href: "/coach/students", label: "Öğrenciler", order: 10 }],
    parent: [{ segment: "", label: "Özet", order: 10 }],
  },
  coachStudentTabs: [{ segment: "", label: "Genel bakış", order: 10 }],
});

const topics = defineModule({
  id: "topics",
  name: "Konular",
  description: "",
  icon: CircleIcon,
  defaultEnabled: true,
  nav: { student: [{ href: "/student/topics", order: 20, mobile: true }] },
  coachStudentTabs: [{ segment: "topics", label: "Konular", order: 20 }],
});

const questionLog = defineModule({
  id: "question-log",
  name: "Sorular",
  description: "",
  icon: CircleIcon,
  defaultEnabled: true,
  dependsOn: ["topics"],
  coachStudentTabs: [{ segment: "questions", label: "Sorular", order: 30 }],
});

const exams = defineModule({
  id: "exams",
  name: "Denemeler",
  description: "",
  icon: CircleIcon,
  defaultEnabled: false,
  dependsOn: ["question-log"],
  nav: {
    student: [{ href: "/student/exams", order: 40 }],
    coach: [{ href: "/coach/exams", order: 5 }],
    parent: [{ segment: "exams", label: "Denemeler", order: 20 }],
  },
  coachStudentTabs: [{ segment: "exams", label: "Denemeler", order: 50 }],
});

const modules = [exams, questionLog, topics, core];
const all = new Set(["topics", "question-log", "exams"]);

describe("getStudentNav", () => {
  it("açık modüllerin öğelerini sıraya göre verir; etiket ve ikon modülden düşer", () => {
    const nav = getStudentNav(modules, all);
    expect(nav.map((i) => i.href)).toEqual([
      "/student/today",
      "/student/topics",
      "/student/exams",
      "/student/profile",
    ]);
    expect(nav[1]).toMatchObject({ moduleId: "topics", label: "Konular", icon: CircleIcon });
    expect(nav[3]?.icon).toBe(SquareIcon);
  });

  it("kapalı modül menüde görünmez, core her zaman görünür", () => {
    const nav = getStudentNav(modules, new Set());
    expect(nav.map((i) => i.href)).toEqual(["/student/today", "/student/profile"]);
  });

  it("mobile filtresi alt menü öğelerini seçer", () => {
    const nav = getStudentNav(modules, all, { mobile: true });
    expect(nav.map((i) => i.label)).toEqual(["Bugün", "Konular", "Ben"]);
  });
});

describe("getCoachNav / sekmeler / veli menüsü", () => {
  it("koç menüsü öğrenciye bağlı değildir ve sıraya göre gelir", () => {
    expect(getCoachNav(modules).map((i) => i.href)).toEqual(["/coach/exams", "/coach/students"]);
  });

  it("koç sekmeleri açık modüllere göre filtrelenir", () => {
    expect(getCoachStudentTabs(modules, new Set(["topics"])).map((t) => t.segment)).toEqual([
      "",
      "topics",
    ]);
  });

  it("veli menüsü segment taşır", () => {
    expect(getParentNav(modules, all)).toEqual([
      { moduleId: "core", segment: "", label: "Özet" },
      { moduleId: "exams", segment: "exams", label: "Denemeler" },
    ]);
  });

  it("href ve segment ile modül bulunur", () => {
    expect(findModuleByHref(modules, "student", "/student/exams")?.id).toBe("exams");
    expect(findModuleByHref(modules, "coach", "/student/exams")).toBeUndefined();
    expect(findModuleBySegment(modules, "coachStudentTab", "questions")?.id).toBe("question-log");
    expect(findModuleBySegment(modules, "parent", "exams")?.id).toBe("exams");
    expect(findModuleBySegment(modules, "parent", "questions")).toBeUndefined();
  });
});

describe("mergeEnabled", () => {
  it("satır yoksa defaultEnabled, varsa satır; core hep açık; bilinmeyen id yok sayılır", () => {
    const enabled = mergeEnabled(modules, [
      { module_id: "topics", enabled: false },
      { module_id: "exams", enabled: true },
      { module_id: "core", enabled: false },
      { module_id: "ghost", enabled: true },
    ]);
    expect([...enabled].sort()).toEqual(["core", "exams", "question-log"]);
  });
});

describe("resolveToggle", () => {
  it("açarken kapalı bağımlılıklar zincir halinde açılır", () => {
    expect(resolveToggle(modules, new Set(), "exams", true)).toEqual([
      { moduleId: "exams", enabled: true },
      { moduleId: "question-log", enabled: true },
      { moduleId: "topics", enabled: true },
    ]);
  });

  it("bağımlılık zaten açıksa yalnızca hedef değişir", () => {
    expect(resolveToggle(modules, new Set(["topics", "question-log"]), "exams", true)).toEqual([
      { moduleId: "exams", enabled: true },
    ]);
  });

  it("kapatırken bu modüle bağımlı açık modüller de kapanır", () => {
    expect(resolveToggle(modules, all, "topics", false)).toEqual([
      { moduleId: "topics", enabled: false },
      { moduleId: "question-log", enabled: false },
      { moduleId: "exams", enabled: false },
    ]);
  });

  it("core kapatılamaz; zaten istenen durumdaysa boş", () => {
    expect(resolveToggle(modules, all, "core", false)).toEqual([]);
    expect(resolveToggle(modules, all, "topics", true)).toEqual([]);
    expect(resolveToggle(modules, all, "yok", true)).toEqual([]);
  });
});

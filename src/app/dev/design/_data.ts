/*
 * /dev/design için örnek veriler. Bağlayıcı değildir; gerçek dersler, konular ve sayılar
 * veritabanından gelir (04-tasarim-sistemi.md Bölüm 1).
 */
export const basePalette = [
  { name: "Mürekkep 900", token: "--ink-900" },
  { name: "Mürekkep 700", token: "--ink-700" },
  { name: "Mürekkep 500", token: "--ink-500" },
  { name: "Mürekkep 300", token: "--ink-300" },
  { name: "Uygulama zemini", token: "--bg-app" },
  { name: "Yüzey", token: "--bg-surface" },
  { name: "Kabarık yüzey", token: "--bg-raised" },
  { name: "Çukur yüzey", token: "--bg-sunken" },
  { name: "Kâğıt (koç)", token: "--bg-paper" },
  { name: "Çizgi", token: "--line" },
  { name: "Çizgi (belirgin)", token: "--line-strong" },
] as const;

export const subjects = [
  { color: "subject-tr", shortName: "Tür", name: "Türkçe" },
  { color: "subject-math", shortName: "Mat", name: "Matematik" },
  { color: "subject-sci", shortName: "Fen", name: "Fen Bilimleri" },
  { color: "subject-hist", shortName: "İnk", name: "T.C. İnkılap Tarihi" },
  { color: "subject-rel", shortName: "Din", name: "Din Kültürü" },
  { color: "subject-eng", shortName: "İng", name: "İngilizce" },
] as const;

export const reserveSubjects = [
  { color: "subject-r1", shortName: "Y1" },
  { color: "subject-r2", shortName: "Y2" },
  { color: "subject-r3", shortName: "Y3" },
  { color: "subject-r4", shortName: "Y4" },
] as const;

export const radii = [
  { token: "--radius-xs", label: "8 px", cls: "rounded-xs" },
  { token: "--radius-sm", label: "12 px", cls: "rounded-sm" },
  { token: "--radius-md", label: "16 px", cls: "rounded-md" },
  { token: "--radius-card", label: "20 px", cls: "rounded-card" },
  { token: "--radius-lg", label: "28 px", cls: "rounded-lg" },
  { token: "--radius-xl", label: "36 px", cls: "rounded-xl" },
  { token: "--radius-pill", label: "pill", cls: "rounded-pill" },
] as const;

export const spacing = [
  { cls: "w-1", label: "4 px", tw: "1" },
  { cls: "w-2", label: "8 px", tw: "2" },
  { cls: "w-3", label: "12 px", tw: "3" },
  { cls: "w-4", label: "16 px", tw: "4" },
  { cls: "w-5", label: "20 px", tw: "5" },
  { cls: "w-6", label: "24 px", tw: "6" },
  { cls: "w-8", label: "32 px", tw: "8" },
  { cls: "w-10", label: "40 px", tw: "10" },
  { cls: "w-12", label: "48 px", tw: "12" },
] as const;

export const typeScale = [
  {
    token: "text-display / -lg",
    sizes: "32 / 44 px · 600",
    cls: "text-display font-semibold tracking-tight lg:text-display-lg",
    sample: "86 soru",
  },
  {
    token: "text-title / -lg",
    sizes: "24 / 28 px · 600",
    cls: "text-title font-semibold lg:text-title-lg",
    sample: "Bugün ne yapacağım?",
  },
  {
    token: "text-heading / -lg",
    sizes: "18 / 20 px · 600",
    cls: "text-heading font-semibold lg:text-heading-lg",
    sample: "Konu haritası",
  },
  {
    token: "text-body",
    sizes: "16 px · 400",
    cls: "text-body",
    sample: "Bu hafta paragrafa ağırlık veriyoruz.",
  },
  {
    token: "text-small",
    sizes: "14 px · 400",
    cls: "text-small",
    sample: "Son çalışma 3 gün önce",
  },
  {
    token: "text-micro / -lg",
    sizes: "12 / 12,5 px · 500",
    cls: "text-micro font-medium lg:text-micro-lg",
    sample: "40 soru · 35 dk",
  },
] as const;

export const upcoming = [
  { name: "NumberStepper, GoalRing, ProgressBar", phase: "Faz 3" },
  { name: "StudentBottomNav, StudentRail, CoachSidebar, ResponsiveSheet", phase: "Faz 1c" },
  { name: "PlanTaskCard", phase: "Faz 4" },
  { name: "TopicMasteryCell, TopicMap", phase: "Faz 6" },
  { name: "DataTable, AlertRow, Toast (sonner)", phase: "Faz 3 / 7" },
  { name: "StreakBadge, AchievementBadge, CountdownChip", phase: "Faz 3 / 8" },
] as const;

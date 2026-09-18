import type { BusySlotKind } from "@/types";

/** Ekranda bir meşguliyet satırı; saatler `SS:DD`. */
export type BusySlotRow = {
  id: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  kind: BusySlotKind;
  note: string | null;
};

/** Ekranda bir istisna satırı; tüm günde saatler null. */
export type ScheduleExceptionRow = {
  id: string;
  onDate: string;
  startsAt: string | null;
  endsAt: string | null;
  title: string;
  note: string | null;
};

export type WeekSchedule = {
  slots: BusySlotRow[];
  /** Yalnızca istenen haftanın istisnaları, tarihe göre sıralı. */
  exceptions: ScheduleExceptionRow[];
  /** Kurum uyanık aralığı (`SS:DD`). */
  wake: { start: string; end: string };
};

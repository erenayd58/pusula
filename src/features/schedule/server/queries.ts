import "server-only";

import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import { getOrgSettings } from "@/features/core";
import { TIME_ZONE, toDateKey, todayInIstanbul } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { availabilityForWeek, wakeInterval, type DayAvailability } from "../lib/availability";
import type { BusySlotRow, ScheduleExceptionRow, WeekSchedule } from "../types";

/**
 * Haftalık program okuma sorguları. Oturumla çalışır (RLS: öğrenci kendisi, koç öğrencisi,
 * veli çocuğu). Saatler Postgres `time` (SS:DD:SS) → ekrana SS:DD.
 */

const hhmm = (t: string) => t.slice(0, 5);

async function listSlots(studentId: string): Promise<BusySlotRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("busy_slots")
    .select("id, day_of_week, starts_at, ends_at, kind, note")
    .eq("student_id", studentId)
    .order("day_of_week")
    .order("starts_at");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    dayOfWeek: r.day_of_week,
    startsAt: hhmm(r.starts_at),
    endsAt: hhmm(r.ends_at),
    kind: r.kind,
    note: r.note,
  }));
}

/** `from` dahil, `to` hariç aralığın istisnaları (YYYY-MM-DD); `to` boşsa sınırsız. */
async function listExceptions(
  studentId: string,
  from: string,
  to?: string,
): Promise<ScheduleExceptionRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("schedule_exceptions")
    .select("id, on_date, starts_at, ends_at, title, note")
    .eq("student_id", studentId)
    .gte("on_date", from)
    .order("on_date")
    .order("starts_at", { nullsFirst: true });
  if (to) query = query.lt("on_date", to);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    onDate: r.on_date,
    startsAt: r.starts_at ? hhmm(r.starts_at) : null,
    endsAt: r.ends_at ? hhmm(r.ends_at) : null,
    title: r.title,
    note: r.note,
  }));
}

async function wakeRange() {
  const settings = await getOrgSettings();
  return { start: settings.schedule.wake_start, end: settings.schedule.wake_end };
}

/** Program düzenleyici: tüm sabit meşguliyetler + bugünden itibaren istisnalar. */
export async function getScheduleForEditor(studentId: string): Promise<WeekSchedule> {
  const today = toDateKey(todayInIstanbul());
  const [slots, exceptions, wake] = await Promise.all([
    listSlots(studentId),
    listExceptions(studentId, today),
    wakeRange(),
  ]);
  return { slots, exceptions, wake };
}

/** Belirli haftanın programı (pazartesi YYYY-MM-DD): meşguliyetler + o haftanın istisnaları. */
export async function getWeekSchedule(studentId: string, weekStart: string): Promise<WeekSchedule> {
  const weekEndExclusive = toDateKey(addDays(new TZDate(weekStart, TIME_ZONE), 7));
  const [slots, exceptions, wake] = await Promise.all([
    listSlots(studentId),
    listExceptions(studentId, weekStart, weekEndExclusive),
    wakeRange(),
  ]);
  return { slots, exceptions, wake };
}

/** Haftanın 7 günü için müsait süre (plan oluşturucu gün başlıkları bunu kullanır). */
export async function getWeekAvailability(
  studentId: string,
  weekStart: string,
): Promise<DayAvailability[]> {
  const schedule = await getWeekSchedule(studentId, weekStart);
  return availabilityForWeek({
    weekStart,
    wake: wakeInterval({ wake_start: schedule.wake.start, wake_end: schedule.wake.end }),
    slots: schedule.slots,
    exceptions: schedule.exceptions,
  });
}

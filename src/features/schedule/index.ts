/**
 * `schedule` modülü dışa açık API'si. İstemci bileşenleri bu dosyayı import etmez (sunucu
 * dosyaları da dışa açılır); sayfalar ve diğer modüllerin sunucu kodu buradan alır.
 */
export { scheduleModule } from "./module";
export { ScheduleEditor } from "./components/schedule-editor";
export { AvailabilitySummary } from "./components/availability-summary";
export { getScheduleForEditor, getWeekSchedule, getWeekAvailability } from "./server/queries";
export {
  upsertBusySlot,
  deleteBusySlot,
  upsertScheduleException,
  deleteScheduleException,
} from "./server/actions";
export {
  availabilityForWeek,
  availableMinutes,
  mergeIntervals,
  wakeInterval,
  timeToMinutes,
  type DayAvailability,
  type Interval,
} from "./lib/availability";
export type { BusySlotRow, ScheduleExceptionRow, WeekSchedule } from "./types";

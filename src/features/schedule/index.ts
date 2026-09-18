/**
 * `schedule` modülü dışa açık API'si. İstemci bileşenleri bu dosyayı import etmez (sunucu
 * dosyaları da dışa açılır); sayfalar ve diğer modüllerin sunucu kodu buradan alır.
 */
export { scheduleModule } from "./module";
export { ScheduleEditor } from "./components/schedule-editor";
export { AvailabilitySummary } from "./components/availability-summary";
export {
  getScheduleForEditor,
  getWeekSchedule,
  getWeekAvailability,
  getWakeWindow,
  getTypicalWeekAvailability,
} from "./server/queries";
export { WakeWindowForm } from "./components/wake-window-form";
export {
  upsertBusySlot,
  deleteBusySlot,
  upsertScheduleException,
  deleteScheduleException,
  setWakeWindow,
} from "./server/actions";
export { setWakeWindowSchema, type SetWakeWindowInput } from "./schemas";
export {
  availabilityForWeek,
  availableMinutes,
  mergeIntervals,
  wakeInterval,
  timeToMinutes,
  type DayAvailability,
  type Interval,
} from "./lib/availability";
export type { BusySlotRow, ScheduleExceptionRow, WakeWindow, WeekSchedule } from "./types";

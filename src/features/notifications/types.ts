import type { NotificationType } from "@/types";

/** Bildirim satırı + ilgili öğrencinin adı (koç/veli metinleri için). Metin `notificationText` ile. */
export type Notification = {
  id: string;
  type: NotificationType;
  studentId: string | null;
  studentName: string | null;
  data: unknown;
  readAt: string | null;
  createdAt: string;
};

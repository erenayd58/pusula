import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Bildirimler" };

/** Öğrenci bildirimleri (clay; 12 §2 Adım 5): liste + tercihler. */
export default async function StudentNotificationsPage() {
  await requireRole("student");
  return <NotificationsPage role="student" />;
}

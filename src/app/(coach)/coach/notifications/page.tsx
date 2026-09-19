import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Bildirimler" };

/** Koç bildirimleri (flat; 12 §2 Adım 5): liste + tercihler. Owner da koç metinlerini alır. */
export default async function CoachNotificationsPage() {
  await requireRole("coach", "owner");
  return <NotificationsPage role="coach" />;
}

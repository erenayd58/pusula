import type { Metadata } from "next";
import { NotificationsPage } from "@/features/notifications";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Bildirimler" };

/** Veli bildirimleri (clay-calm; 12 §2 Adım 5): çocuklardan bağımsız liste + tercihler. */
export default async function ParentNotificationsPage() {
  await requireRole("parent");
  return <NotificationsPage role="parent" />;
}

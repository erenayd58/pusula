import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Henüz uygulanmamış modül sayfası. Metin role göre değişmez (nötr, kısa); modül adı ve
 * açıklaması manifestten gelir.
 */
export function ComingSoon({
  name,
  description,
  icon,
}: {
  name: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <EmptyState
      icon={icon}
      title={`${name}: bu bölüm yakında`}
      description={`${description}. Bu bölüm sonraki güncellemelerde açılacak.`}
    />
  );
}

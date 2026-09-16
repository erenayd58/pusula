import { AlertCircleIcon } from "lucide-react";

/** Sistem/işlem hatası: kırmızı yalnızca ikon + metinle (04 Bölüm 4). Mesaj yoksa hiçbir şey çizmez. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 text-small text-error">
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

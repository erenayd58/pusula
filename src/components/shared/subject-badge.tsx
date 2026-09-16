import * as React from "react";
import { cn } from "@/lib/utils";
import { subjectVars, type SubjectColorToken } from "./subject-scope";

/**
 * Ders rozeti (04 Bölüm 4.2): metin `-ink` tonunda `-soft` zemin üzerinde, yanında tam
 * renkli nokta. Ders rengi tek başına bilgi taşımaz; kısa ad (Tür, Mat, Fen…) zorunludur.
 * Clay: 36 px pill; koç (flat): 26 px, köşe xs.
 */
export function SubjectBadge({
  color,
  shortName,
  className,
  style,
  ...props
}: React.ComponentProps<"span"> & {
  color: SubjectColorToken | string;
  shortName: string;
}) {
  return (
    <span
      data-slot="subject-badge"
      style={{ ...subjectVars(color), ...style }}
      className={cn(
        "inline-flex h-[26px] w-fit shrink-0 items-center gap-1.5 rounded-xs bg-subject-soft px-2.5 text-micro-lg font-medium whitespace-nowrap text-subject-ink",
        "clay:h-auto clay:min-h-9 clay:gap-2 clay:rounded-pill clay:px-3.5 clay:text-small clay:font-semibold",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="size-[7px] shrink-0 rounded-[2px] bg-subject clay:size-[9px] clay:rounded-full"
      />
      {shortName}
    </span>
  );
}

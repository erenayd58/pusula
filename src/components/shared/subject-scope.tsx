import type { CSSProperties } from "react";

/**
 * `subjects.color` alanındaki token öneki: `subject-tr`, `subject-math`, … `subject-r4`.
 * Yeni dersler kod değişmeden renk alır (02-mimari karar #9).
 */
export type SubjectColorToken = `subject-${string}`;

/**
 * Ders rengini bileşen köküne CSS değişkeni olarak verir (04 Bölüm 4.2).
 * Tailwind dinamik sınıf üretemediği için içeride sabit sınıflar kullanılır:
 * `bg-subject`, `bg-subject-soft`, `text-subject-ink`, `border-subject`.
 * Yedek renklerin `-soft` ve `-ink` tonları tanımlı olmadığından `color-mix` ile türetilir.
 *
 * Kullanım: `<div style={subjectVars(subject.color)} className="border-l-4 border-subject">`
 */
export function subjectVars(color: SubjectColorToken | string): CSSProperties {
  const vars: Record<`--${string}`, string> = {
    "--s": `var(--${color})`,
    "--s-soft": `var(--${color}-soft, color-mix(in srgb, var(--${color}) 12%, white))`,
    "--s-ink": `var(--${color}-ink, color-mix(in srgb, var(--${color}) 80%, black))`,
  };
  return vars as CSSProperties;
}

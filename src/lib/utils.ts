import { createCn } from "cn/config";

/**
 * Tailwind sınıflarını birleştirir (clsx + tailwind-merge eşdeğeri; shadcn v4'ün `cn` motoru).
 * globals.css'teki özel ölçekler burada tanıtılır; yoksa `text-small` gibi sınıflar renk sanılıp
 * `text-ink-500` ile çakıştırılır ve düşürülür. `cn` her zaman buradan import edilir, "cn"
 * paketinden değil (ESLint kuralı).
 */
const FONT_SIZES = [
  "display",
  "display-lg",
  "title",
  "title-lg",
  "heading",
  "heading-lg",
  "body",
  "small",
  "micro",
  "micro-lg",
];
const SHADOWS = ["clay-sm", "clay-md", "clay-lg", "clay-pressed", "clay-well", "pop", "drag"];
const RADII = ["xs", "sm", "md", "card", "lg", "xl", "pill"];

export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
      shadow: [{ shadow: SHADOWS }],
      rounded: [{ rounded: RADII }],
      "rounded-t": [{ "rounded-t": RADII }],
      "rounded-b": [{ "rounded-b": RADII }],
      "rounded-l": [{ "rounded-l": RADII }],
      "rounded-r": [{ "rounded-r": RADII }],
    },
  },
});

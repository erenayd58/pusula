/**
 * `LineChart` ölçek yardımcıları (10 §3.1): saf, birim testli. Dikey eksen 0 → `niceCeil(max)`;
 * yatay eksen eşit aralıklı (zaman ölçeği değil; bileşen indeksle konumlar).
 */

/**
 * "Güzel" üst sınır: `71,33 → 80`, `18 → 20`, `150 → 150`, `0 → 10`. Onluk birim; birimin iki
 * katından küçük değerlerde yarım birim (18 → 20, 150 → 150).
 */
export function niceCeil(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 10;
  let unit = 10 ** Math.floor(Math.log10(max));
  if (max / unit < 2) unit /= 2;
  const top = Math.ceil(max / unit - 1e-9) * unit;
  return Math.round(top * 100) / 100;
}

/** Dikey eksen değerleri: 0 → niceCeil(max), `count` eşit aralık (varsayılan 4 → 5 değer). */
export function yTicks(max: number, count = 4): number[] {
  const top = niceCeil(max);
  const n = Math.max(1, Math.floor(count));
  return Array.from({ length: n + 1 }, (_, i) => Math.round(((top * i) / n) * 100) / 100);
}

/**
 * SVG yol dizesi: ardışık noktalar `L` ile bağlanır; `y` null olan noktada çizgi kesilir ve bir
 * sonraki dolu noktada `M` ile yeniden başlar. Boş ya da tümü null → "".
 */
export function linePath(points: readonly { x: number; y: number | null }[]): string {
  const parts: string[] = [];
  let open = false;
  for (const p of points) {
    if (p.y === null) {
      open = false;
      continue;
    }
    parts.push(`${open ? "L" : "M"}${round(p.x)} ${round(p.y)}`);
    open = true;
  }
  return parts.join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

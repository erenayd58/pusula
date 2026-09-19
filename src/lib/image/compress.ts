/**
 * Yanlış defteri fotoğrafı sıkıştırma (10 §3.1, karar C8): bağımlılıksız canvas. En uzun kenar
 * `MAX_EDGE` px'e indirilir (büyütülmez), `image/webp` q 0,8; tarayıcı webp üretemezse `image/jpeg`
 * q 0,8. EXIF yönü `createImageBitmap(file, { imageOrientation: "from-image" })` ile düzeltilir.
 * Saf kısım (`fitWithin`) birim testli; `compressImage` yalnızca tarayıcıda çalışır.
 */

export const MAX_EDGE = 1600;
export const QUALITY = 0.8;

/** Oran korunarak en uzun kenar `maxEdge`'e sığdırılır; küçük görüntü büyütülmez. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest <= 0) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type CompressedImage = { blob: Blob; ext: "webp" | "jpg"; width: number; height: number };

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** Dosyayı sıkıştırır; çözümlenemeyen görüntüde hata fırlatır (form "Fotoğraf okunamadı" der). */
export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const webp = await toBlob(canvas, "image/webp");
    if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp", width, height };
    const jpeg = await toBlob(canvas, "image/jpeg");
    if (!jpeg) throw new Error("encode");
    return { blob: jpeg, ext: "jpg", width, height };
  } finally {
    bitmap.close();
  }
}

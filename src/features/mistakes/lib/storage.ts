/** Depo sabitleri (istemci ve sunucu ortak; `server-only` değil). Yol: {org}/{öğrenci}/{uuid}.ext (03 §8). */
export const BUCKET = "mistake-images";

export function imagePathFor(organizationId: string, studentId: string, ext: "webp" | "jpg"): string {
  return `${organizationId}/${studentId}/${crypto.randomUUID()}.${ext}`;
}

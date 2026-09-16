/**
 * Davet kodu (03-veri-modeli.md invitations.code): 8 karakter, karışması kolay karakterler
 * hariç (I, L, O, 0, 1), kriptografik rastgele. Red örnekleme ile modulo yanlılığı yok.
 */
export const INVITATION_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITATION_CODE_LENGTH = 8;
export const INVITATION_TTL_DAYS = 7;

const ALPHABET_SIZE = INVITATION_CODE_ALPHABET.length; // 31
const MAX_UNBIASED = 256 - (256 % ALPHABET_SIZE); // 248: bu değerin altındaki baytlar eşit dağılır

/** `randomBytes` test edilebilirlik için parametre; varsayılan WebCrypto. */
export function generateInvitationCode(
  randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  let code = "";
  while (code.length < INVITATION_CODE_LENGTH) {
    const bytes = randomBytes(INVITATION_CODE_LENGTH * 2);
    for (const byte of bytes) {
      if (byte >= MAX_UNBIASED) continue;
      code += INVITATION_CODE_ALPHABET[byte % ALPHABET_SIZE];
      if (code.length === INVITATION_CODE_LENGTH) break;
    }
  }
  return code;
}

/** Kullanıcının yazdığını karşılaştırılabilir hale getirir: büyük harf, boşluk/tire temizle. */
export function normalizeInvitationCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function isWellFormedInvitationCode(code: string): boolean {
  return (
    code.length === INVITATION_CODE_LENGTH &&
    [...code].every((c) => INVITATION_CODE_ALPHABET.includes(c))
  );
}

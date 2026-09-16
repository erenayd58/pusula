import { describe, expect, it } from "vitest";
import {
  INVITATION_CODE_ALPHABET,
  INVITATION_CODE_LENGTH,
  generateInvitationCode,
  isWellFormedInvitationCode,
  normalizeInvitationCode,
} from "./code";

describe("davet kodu", () => {
  it("alfabede karışabilen karakterler yok", () => {
    for (const c of ["I", "L", "O", "0", "1"]) expect(INVITATION_CODE_ALPHABET).not.toContain(c);
    expect(INVITATION_CODE_ALPHABET).toHaveLength(31);
  });

  it("8 karakter, sadece alfabeden", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInvitationCode();
      expect(code).toHaveLength(INVITATION_CODE_LENGTH);
      expect(isWellFormedInvitationCode(code)).toBe(true);
    }
  });

  it("248 ve üzeri baytları atlar (modulo yanlılığı yok), gerekirse yeniden çeker", () => {
    // İlk çağrı tamamen reddedilen baytlar, ikincisi 0..7 → alfabenin ilk 8 harfi.
    const draws = [new Uint8Array(16).fill(255), Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7])];
    let i = 0;
    const code = generateInvitationCode(() => draws[i++] ?? new Uint8Array(16));
    expect(code).toBe("ABCDEFGH");
  });

  it("normalize: küçük harf, boşluk ve tire temizlenir", () => {
    expect(normalizeInvitationCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(normalizeInvitationCode("abcd efgh")).toBe("ABCDEFGH");
    expect(isWellFormedInvitationCode(normalizeInvitationCode("abc"))).toBe(false);
    expect(isWellFormedInvitationCode("ABCDEFG1")).toBe(false);
  });
});

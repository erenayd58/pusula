import { describe, expect, it } from "vitest";
import {
  emailToUsername,
  identifierToEmail,
  isStudentEmail,
  isValidUsername,
  normalizeUsername,
  usernameToEmail,
} from "./username";

const DOMAIN = "ogrenci.pusula.local";

describe("username ↔ e-posta", () => {
  it("kullanıcı adını sentetik e-postaya çevirir", () => {
    expect(usernameToEmail("ayse.k", DOMAIN)).toBe("ayse.k@ogrenci.pusula.local");
  });

  it("sentetik e-postadan kullanıcı adını çıkarır, başka alanı reddeder", () => {
    expect(emailToUsername("ayse.k@ogrenci.pusula.local", DOMAIN)).toBe("ayse.k");
    expect(emailToUsername("veli@pusula.local", DOMAIN)).toBeNull();
    expect(isStudentEmail("AYSE.K@OGRENCI.PUSULA.LOCAL", DOMAIN)).toBe(true);
  });

  it("giriş alanında @ varsa e-posta, yoksa kullanıcı adı sayar", () => {
    expect(identifierToEmail("  Koc@Pusula.local ", DOMAIN)).toBe("koc@pusula.local");
    expect(identifierToEmail(" Ayse.K ", DOMAIN)).toBe("ayse.k@ogrenci.pusula.local");
  });
});

describe("kullanıcı adı kuralı", () => {
  it("geçerli adları kabul eder", () => {
    expect(isValidUsername("ayse.k")).toBe(true);
    expect(isValidUsername("mehmet_y1")).toBe(true);
  });

  it("Türkçe karakter, büyük harf ve kısa adı reddeder (otomatik dönüştürme yok)", () => {
    expect(isValidUsername("ayşe.k")).toBe(false);
    expect(isValidUsername("Ayse.k")).toBe(false);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(31))).toBe(false);
  });

  it("normalize sadece ASCII büyük harfi küçültür, Türkçe harfe dokunmaz", () => {
    expect(normalizeUsername(" Ayse.K ")).toBe("ayse.k");
    expect(normalizeUsername("Işık")).toBe("Işık".replace("I", "i"));
  });
});

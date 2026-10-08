import { describe, expect, it } from "vitest";
import { zEmail, zId, zIsoDate, zNewPassword, zText } from "@/server/validation";

describe("validació d'entrada", () => {
  it("zId només accepta identificadors segurs", () => {
    expect(zId.safeParse("p_biel").success).toBe(true);
    for (const bad of ["../../etc/passwd", "1 OR 1=1", "<script>", "", "a".repeat(65), "p biel", "p_biel'--"]) expect(zId.safeParse(bad).success).toBe(false);
  });

  it("zText limita la longitud i elimina caràcters de control", () => {
    expect(zText(5).safeParse("123456").success).toBe(false);
    expect(zText(10, 3).safeParse("  a ").success).toBe(false);
    expect(zText(20).parse("ok\u0000\u0007 text")).toBe("ok text");
    // l'HTML es desa com a text: React l'escapa en mostrar-lo (sense dangerouslySetInnerHTML)
    expect(zText(100).parse("<img src=x onerror=alert(1)>")).toBe("<img src=x onerror=alert(1)>");
  });

  it("zIsoDate rebutja dates invàlides o fora de rang", () => {
    expect(zIsoDate.safeParse("2026-11-01T10:00:00Z").success).toBe(true);
    expect(zIsoDate.safeParse("2026-11-01").success).toBe(true);
    for (const bad of ["zzz", "2026-13-45", "1800-01-01", "9999-01-01", "2026-11-01T10:00:00Z; DROP TABLE"]) expect(zIsoDate.safeParse(bad).success).toBe(false);
  });

  it("correu i contrasenya", () => {
    expect(zEmail.parse("  Marta@Club.CAT ")).toBe("marta@club.cat");
    expect(zEmail.safeParse("no-es-un-correu").success).toBe(false);
    expect(zNewPassword.safeParse("curta").success).toBe(false);
    expect(zNewPassword.safeParse("una-contrasenya-llarga").success).toBe(true);
  });
});

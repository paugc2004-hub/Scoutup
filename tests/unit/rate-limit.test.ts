import { beforeEach, describe, expect, it } from "vitest";
import { RULES, checkRate, rateStore } from "@/server/security/rate-limit";

describe("rate limiting", () => {
  beforeEach(() => rateStore().reset());

  it("bloqueja després del límit i es recupera quan passa la finestra", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < RULES.login.limit; i++) expect(checkRate("login", "1.2.3.4:a@b.c", t0 + i).ok).toBe(true);
    const blocked = checkRate("login", "1.2.3.4:a@b.c", t0 + 100);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(checkRate("login", "1.2.3.4:a@b.c", t0 + RULES.login.windowMs + 50).ok).toBe(true);
  });

  it("les claus són independents", () => {
    for (let i = 0; i < RULES.login.limit; i++) checkRate("login", "x", 1);
    expect(checkRate("login", "x", 2).ok).toBe(false);
    expect(checkRate("login", "y", 2).ok).toBe(true);
    expect(checkRate("message", "x", 2).ok).toBe(true);
  });
});

/**
 * Limitador de peticions (finestra lliscant en memòria).
 *
 * Suficient per a una demo d'un sol procés. La interfície `RateLimitStore` permet substituir-lo
 * per un magatzem compartit (Redis, Upstash…) quan l'aplicació s'executi en diverses instàncies.
 */
export type RateRule = { limit: number; windowMs: number };

export interface RateLimitStore {
  hit(key: string, rule: RateRule, now: number): { ok: boolean; remaining: number; retryAfterMs: number };
  reset(): void;
}

class MemoryStore implements RateLimitStore {
  private hits = new Map<string, number[]>();
  hit(key: string, rule: RateRule, now: number) {
    const from = now - rule.windowMs;
    const list = (this.hits.get(key) ?? []).filter((t) => t > from);
    if (list.length >= rule.limit) {
      this.hits.set(key, list);
      return { ok: false, remaining: 0, retryAfterMs: list[0] + rule.windowMs - now };
    }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 50_000) this.sweep(now);
    return { ok: true, remaining: rule.limit - list.length, retryAfterMs: 0 };
  }
  reset() {
    this.hits.clear();
  }
  private sweep(now: number) {
    for (const [k, v] of this.hits) if (!v.length || v[v.length - 1] < now - 3_600_000) this.hits.delete(k);
  }
}

/** Regles per tipus d'acció. Ajustables per entorn sense tocar el codi que les fa servir. */
export const RULES = {
  login: { limit: 8, windowMs: 10 * 60_000 }, // per IP + correu
  loginIp: { limit: 30, windowMs: 10 * 60_000 }, // per IP
  register: { limit: 5, windowMs: 60 * 60_000 },
  demoLogin: { limit: 30, windowMs: 60_000 },
  contact: { limit: 20, windowMs: 60 * 60_000 },
  message: { limit: 30, windowMs: 60_000 },
  search: { limit: 60, windowMs: 60_000 },
  ai: { limit: 20, windowMs: 60_000 },
  write: { limit: 120, windowMs: 60_000 }, // escriptures genèriques per usuari
  reset: { limit: 3, windowMs: 10 * 60_000 },
} satisfies Record<string, RateRule>;
export type RuleName = keyof typeof RULES;

const g = globalThis as unknown as { __scoutupRate?: RateLimitStore };
export function rateStore(): RateLimitStore {
  if (!g.__scoutupRate) g.__scoutupRate = new MemoryStore();
  return g.__scoutupRate;
}

export function checkRate(rule: RuleName, key: string, now = Date.now()) {
  if (process.env.SCOUTUP_RATE_LIMIT === "off") return { ok: true, remaining: Infinity, retryAfterMs: 0 };
  return rateStore().hit(`${rule}:${key}`, RULES[rule], now);
}

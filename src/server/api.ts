import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { currentUser } from "@/server/auth/session";
import type { SessionUser } from "@/server/auth/session";
import type { Role } from "@/lib/domain";
import { CLUB_ROLES, hasPermission } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";
import { checkRate } from "@/server/security/rate-limit";
import type { RuleName } from "@/server/security/rate-limit";
import { audit } from "@/server/security/audit";
import { log } from "@/server/log";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<unknown> | unknown;

/** Mida màxima del cos d'una petició JSON (protecció contra càrregues absurdes). */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * Envolcall comú de les rutes d'API: errors coherents i respostes JSON.
 * Mai retorna detalls interns (SQL, stack traces, rutes) a l'usuari: es registren al log.
 */
export function api<C = { params: Promise<Record<string, string>> }>(fn: Handler<C>) {
  return async (req: Request, ctx: C) => {
    const t0 = Date.now();
    try {
      const out = await fn(req, ctx);
      const ms = Date.now() - t0;
      if (ms > 800) log.warn("api.slow", { method: req.method, path: new URL(req.url).pathname, ms });
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (e instanceof ApiError) {
        const h: Record<string, string> = { "Cache-Control": "no-store" };
        if (e instanceof RateLimitError) h["Retry-After"] = String(Math.ceil(e.retryAfterMs / 1000));
        return NextResponse.json({ error: e.message }, { status: e.status, headers: h });
      }
      if (e instanceof ZodError) {
        return NextResponse.json({ error: "Dades no vàlides: " + e.issues.slice(0, 5).map((i) => (i.path.length ? i.path.join(".") + " " : "") + i.message).join("; ") }, { status: 400 });
      }
      log.error("api.unhandled", { method: req.method, path: new URL(req.url).pathname, error: e });
      return NextResponse.json({ error: "Ha ocorregut un error. Torna-ho a provar d'aquí a una estona." }, { status: 500 });
    }
  };
}

export class RateLimitError extends ApiError {
  retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super(429, "Massa peticions seguides. Espera un moment i torna-ho a provar.");
    this.retryAfterMs = retryAfterMs;
  }
}

/** IP del client (darrere del proxy de la plataforma). Només s'usa per al rate limiting. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export function rateLimit(rule: RuleName, key: string): void {
  const r = checkRate(rule, key);
  if (!r.ok) {
    log.warn("rate_limit.blocked", { rule, key: key.slice(0, 80) });
    throw new RateLimitError(r.retryAfterMs);
  }
}

export async function apiUser(roles?: readonly Role[]): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new ApiError(401, "Cal iniciar sessió.");
  if (roles && !roles.includes(u.role)) throw new ApiError(403, "No tens permís per fer aquesta acció.");
  return u;
}

export type Staff = SessionUser & { club_id: string };

export async function apiStaff(perm?: Permission): Promise<Staff> {
  const u = await apiUser(CLUB_ROLES);
  if (!u.club_id) throw new ApiError(403, "Usuari sense club.");
  const s = u as Staff;
  if (perm) requirePermission(s, perm);
  return s;
}

/** Comprova un permís del RBAC i registra el rebuig a l'auditoria. */
export function requirePermission(u: Staff, perm: Permission, message = "El teu rol no permet fer aquesta acció."): void {
  if (hasPermission(u.role, perm)) return;
  audit({ actor: u, action: `permission.${perm}`, result: "denied", detail: `rol ${u.role}` });
  throw new ApiError(403, message);
}

export async function apiPlayer(): Promise<SessionUser & { player_id: string }> {
  const u = await apiUser(["player"]);
  if (!u.player_id) throw new ApiError(403, "Usuari sense perfil de jugador.");
  return u as SessionUser & { player_id: string };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) throw new ApiError(413, "La petició és massa gran.");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError(413, "La petició és massa gran.");
  try {
    const v = JSON.parse(text || "{}");
    if (v === null || typeof v !== "object" || Array.isArray(v)) throw new Error("not an object");
    return v as T;
  } catch {
    throw new ApiError(400, "Cos de la petició no vàlid.");
  }
}

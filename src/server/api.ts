import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentUser } from "@/server/auth/session";
import type { SessionUser } from "@/server/auth/session";
import type { Role } from "@/lib/domain";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<unknown> | unknown;

/** Envolcall comú de les rutes d'API: errors coherents i respostes JSON. */
export function api<C = { params: Promise<Record<string, string>> }>(fn: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      const out = await fn(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: "Dades no vàlides: " + e.issues.map((i) => i.path.join(".") + " " + i.message).join("; ") }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Error inesperat del servidor." }, { status: 500 });
    }
  };
}

export async function apiUser(roles?: Role[]): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new ApiError(401, "Cal iniciar sessió.");
  if (roles && !roles.includes(u.role)) throw new ApiError(403, "No tens permís per fer aquesta acció.");
  return u;
}
export async function apiStaff(): Promise<SessionUser & { club_id: string }> {
  const u = await apiUser(["director", "coach"]);
  if (!u.club_id) throw new ApiError(403, "Usuari sense club.");
  return u as SessionUser & { club_id: string };
}
export async function apiPlayer(): Promise<SessionUser & { player_id: string }> {
  const u = await apiUser(["player"]);
  if (!u.player_id) throw new ApiError(403, "Usuari sense perfil de jugador.");
  return u as SessionUser & { player_id: string };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Cos de la petició no vàlid.");
  }
}

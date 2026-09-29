import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import { get, run, nowIso } from "@/server/db/client";
import type { Role } from "@/lib/domain";

export const SESSION_COOKIE = "su_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  title: string | null;
  club_id: string | null;
  team_id: string | null;
  player_id: string | null;
  avatar_hue: number;
  is_demo_login: number;
};

export function homeFor(u: Pick<SessionUser, "role">): string {
  if (u.role === "director" || u.role === "coach") return "/club";
  if (u.role === "player") return "/jugador";
  return "/tutor";
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  run("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)", token, userId, nowIso(), expires.toISOString());
  run("UPDATE users SET last_login_at = ? WHERE id = ?", nowIso(), userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", expires, secure: process.env.NODE_ENV === "production" && process.env.SCOUTUP_INSECURE_COOKIES !== "1" });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) run("DELETE FROM sessions WHERE token = ?", token);
  jar.delete(SESSION_COOKIE);
}

/** Usuari de la sessió actual (o null). Cachejat per petició. */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const u = get<SessionUser & { expires_at: string }>(
    `SELECT u.id, u.email, u.name, u.role, u.title, u.club_id, u.team_id, u.player_id, u.avatar_hue, u.is_demo_login, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    token,
  );
  if (!u || new Date(u.expires_at) < new Date()) return null;
  return u;
});

/** Per a pàgines: exigeix sessió (i rol). Redirigeix si no es compleix. */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/entrar");
  if (roles && !roles.includes(u.role)) redirect(homeFor(u));
  return u;
}
export async function requireClubStaff(): Promise<SessionUser & { club_id: string }> {
  const u = await requireUser(["director", "coach"]);
  return u as SessionUser & { club_id: string };
}
export async function requirePlayer(): Promise<SessionUser & { player_id: string }> {
  const u = await requireUser(["player"]);
  return u as SessionUser & { player_id: string };
}

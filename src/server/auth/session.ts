import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { get, run, nowIso } from "@/server/db/client";
import type { Role } from "@/lib/domain";
import { isClubRole } from "@/lib/permissions";

export const SESSION_COOKIE = "su_session";
/** Durada màxima d'una sessió. */
const SESSION_DAYS = 7;

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
  if (isClubRole(u.role)) return "/club";
  if (u.role === "player") return "/jugador";
  return "/tutor";
}

/**
 * A la base de dades només es guarda el hash SHA-256 del token: si algú n'obté una còpia,
 * no pot reutilitzar les sessions. La cookie conté el token en clar (httpOnly).
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function secureCookies(): boolean {
  return process.env.NODE_ENV === "production" && process.env.SCOUTUP_INSECURE_COOKIES !== "1";
}

export async function createSession(userId: string): Promise<void> {
  const jar = await cookies();
  // Rotació: una sessió prèvia en aquest navegador s'invalida abans de crear-ne una de nova.
  const prev = jar.get(SESSION_COOKIE)?.value;
  if (prev) run("DELETE FROM sessions WHERE token = ?", hashToken(prev));
  run("DELETE FROM sessions WHERE expires_at < ?", nowIso());
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  run("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)", hashToken(token), userId, nowIso(), expires.toISOString());
  run("UPDATE users SET last_login_at = ? WHERE id = ?", nowIso(), userId);
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", expires, secure: secureCookies() });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) run("DELETE FROM sessions WHERE token = ?", hashToken(token));
  jar.delete(SESSION_COOKIE);
}

/** Tanca totes les sessions d'un usuari (p. ex. quan se li canvia el rol o es desactiva). */
export function revokeUserSessions(userId: string): void {
  run("DELETE FROM sessions WHERE user_id = ?", userId);
}

/** Usuari de la sessió actual (o null). Cachejat per petició. */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const u = get<SessionUser & { expires_at: string; status: string }>(
    `SELECT u.id, u.email, u.name, u.role, u.title, u.club_id, u.team_id, u.player_id, u.avatar_hue, u.is_demo_login, u.status, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    hashToken(token),
  );
  if (!u || new Date(u.expires_at) < new Date() || u.status !== "active") return null;
  const { expires_at: _e, status: _s, ...user } = u;
  return user;
});

/** Per a pàgines: exigeix sessió (i rol). Redirigeix si no es compleix. */
export async function requireUser(roles?: readonly Role[]): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/entrar");
  if (roles && !roles.includes(u.role)) redirect(homeFor(u));
  return u;
}
export async function requireClubStaff(): Promise<SessionUser & { club_id: string }> {
  const u = await requireUser(["director", "coordinator", "coach"]);
  if (!u.club_id) redirect("/entrar");
  return u as SessionUser & { club_id: string };
}
export async function requirePlayer(): Promise<SessionUser & { player_id: string }> {
  const u = await requireUser(["player"]);
  return u as SessionUser & { player_id: string };
}

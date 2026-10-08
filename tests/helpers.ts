/** Utilitats per als tests d'integració: usuaris de sessió reals llegits de la base de dades de demo. */
import { get, all } from "@/server/db/client";
import type { Staff } from "@/server/api";
import type { SessionUser } from "@/server/auth/session";

export function userByEmail(email: string): SessionUser {
  const u = get<SessionUser>("SELECT id, email, name, role, title, club_id, team_id, player_id, avatar_hue, is_demo_login FROM users WHERE email = ?", email);
  if (!u) throw new Error(`usuari ${email} no trobat`);
  return u;
}
export const staff = (email: string) => userByEmail(email) as Staff;

export const director = () => staff("director@scoutup.demo");
export const coordinator = () => staff("coordinacio@scoutup.demo");
export const coach = () => staff("coach@scoutup.demo");
export const clubB = () => staff("club-b@scoutup.demo");
export const player = () => userByEmail("player@scoutup.demo") as SessionUser & { player_id: string };

/** Menor sense consentiment del tutor i d'un altre club: invisible per al CF Vallès Nord. */
export function hiddenMinorFor(clubId: string): string {
  const rows = all<{ id: string }>(
    "SELECT id FROM players WHERE guardian_consent = 0 AND birth_date > date('now','-18 years') AND (club_id IS NULL OR club_id != ?) LIMIT 1",
    clubId,
  );
  if (!rows[0]) throw new Error("cap menor ocult al seed");
  return rows[0].id;
}

/** Executa i retorna l'estat HTTP de l'ApiError llançat (o 200 si no falla). */
export function statusOf(fn: () => unknown): number {
  try {
    fn();
    return 200;
  } catch (e) {
    const s = (e as { status?: number }).status;
    if (typeof s === "number") return s;
    throw e;
  }
}

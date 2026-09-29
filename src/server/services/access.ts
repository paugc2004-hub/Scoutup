/**
 * Permisos (rols) i visibilitat (privacitat del jugador i protecció de menors).
 * Totes les comprovacions es fan al servidor; la interfície només reflecteix el resultat.
 */
import { all, get } from "@/server/db/client";
import { isMinor } from "@/lib/domain";
import type { SessionUser } from "@/server/auth/session";
import type { PlayerRow } from "@/server/services/players";
import { privacyOf } from "@/server/services/players";

// ─── Rols ─────────────────────────────────────────────────────────────────────
export const can = {
  manageOffers: (u: SessionUser) => u.role === "director",
  editClub: (u: SessionUser) => u.role === "director",
  resetDemo: (u: SessionUser) => u.role === "director",
  manageUsers: (u: SessionUser) => u.role === "director",
  /** El director veu tot el club; l'entrenador només el seu equip. */
  seeTeam: (u: SessionUser, teamId: string | null | undefined) => u.role === "director" || (!!teamId && teamId === u.team_id),
};

/** Llista d'equips que pot veure l'usuari de club (null = tots). */
export function teamScope(u: SessionUser): string[] | null {
  return u.role === "director" ? null : u.team_id ? [u.team_id] : [];
}

/** Fragment SQL per filtrar una columna team_id segons el rol. */
export function teamFilterSql(u: SessionUser, col = "team_id", includeNull = false): { sql: string; params: string[] } {
  const scope = teamScope(u);
  if (scope === null) return { sql: "1=1", params: [] };
  if (!scope.length) return { sql: includeNull ? `${col} IS NULL` : "0=1", params: [] };
  return { sql: `(${col} IN (${scope.map(() => "?").join(",")})${includeNull ? ` OR ${col} IS NULL` : ""})`, params: scope };
}

// ─── Relacions club ↔ jugador ────────────────────────────────────────────────
export type ClubRelations = {
  contacted: Set<string>; // contacte acceptat o conversa
  applied: Set<string>; // el jugador s'ha inscrit a una oferta del club
  blockedBy: Set<string>; // jugadors que han bloquejat el club
  pending: Set<string>; // sol·licituds pendents
};

export function clubRelations(clubId: string): ClubRelations {
  const contacted = new Set(all<{ player_id: string }>("SELECT player_id FROM contact_requests WHERE club_id = ? AND status = 'acceptada' UNION SELECT player_id FROM conversations WHERE club_id = ?", clubId, clubId).map((r) => r.player_id));
  const applied = new Set(all<{ player_id: string }>("SELECT a.player_id FROM applications a JOIN offers o ON o.id = a.offer_id WHERE o.club_id = ?", clubId).map((r) => r.player_id));
  const blockedBy = new Set(all<{ player_id: string }>("SELECT player_id FROM blocks WHERE club_id = ?", clubId).map((r) => r.player_id));
  const pending = new Set(all<{ player_id: string }>("SELECT player_id FROM contact_requests WHERE club_id = ? AND status IN ('pendent','pendent_tutor')", clubId).map((r) => r.player_id));
  return { contacted, applied, blockedBy, pending };
}

export type Visibility = { visible: boolean; reason?: string };

/**
 * Pot aquest club veure el perfil del jugador?
 * - Els jugadors del mateix club sempre són visibles per al seu club.
 * - Un jugador que ha bloquejat el club no és visible.
 * - Un menor sense consentiment del tutor no és visible per a cap club.
 * - Un menor, com a màxim, és visible per a clubs verificats.
 * - Si el jugador s'ha inscrit a una oferta del club, ha decidit compartir el perfil amb aquest club.
 */
export function clubCanSee(p: PlayerRow, club: { id: string; verified: number }, rel: ClubRelations, now = new Date()): Visibility {
  if (p.club_id === club.id) return { visible: true };
  if (rel.blockedBy.has(p.id)) return { visible: false, reason: "El jugador ha bloquejat el club." };
  const minor = isMinor(p.birth_date, now);
  if (minor && !p.guardian_consent) return { visible: false, reason: "Menor pendent del consentiment del tutor." };
  if (rel.applied.has(p.id) || rel.contacted.has(p.id)) return { visible: true };
  const priv = privacyOf(p);
  let level = priv.profile;
  if (minor && level === "tots") level = "verificats";
  if (level === "ocult") return { visible: false, reason: "Perfil ocult." };
  if (level === "contactats") return { visible: false, reason: "Només visible per a clubs amb contacte." };
  if (level === "verificats" && !club.verified) return { visible: false, reason: "Només visible per a clubs verificats." };
  return { visible: true };
}

export type ContactCheck = { ok: boolean; reason?: string; needsGuardian: boolean };

/** Pot aquest club enviar una sol·licitud de contacte al jugador? */
export function clubCanContact(p: PlayerRow, club: { id: string; verified: number }, rel: ClubRelations, now = new Date()): ContactCheck {
  const minor = isMinor(p.birth_date, now);
  if (!club.verified) return { ok: false, reason: "El teu club està pendent de verificació. Els clubs no verificats no poden contactar jugadors.", needsGuardian: minor };
  if (rel.blockedBy.has(p.id)) return { ok: false, reason: "Aquest jugador no accepta contactes del teu club.", needsGuardian: minor };
  if (rel.pending.has(p.id)) return { ok: false, reason: "Ja hi ha una sol·licitud pendent de resposta.", needsGuardian: minor };
  if (rel.contacted.has(p.id)) return { ok: false, reason: "Ja teniu una conversa oberta.", needsGuardian: minor };
  const priv = privacyOf(p);
  if (priv.contact === "ningu" && !rel.applied.has(p.id)) return { ok: false, reason: "El jugador no accepta contactes nous ara mateix.", needsGuardian: minor };
  if (minor && !p.guardian_consent) return { ok: false, reason: "Menor sense consentiment del tutor.", needsGuardian: true };
  return { ok: true, needsGuardian: minor };
}

export function clubById(id: string) {
  return get<{ id: string; name: string; short_name: string; initials: string; color_primary: string; color_secondary: string; verified: number; city: string; comarca: string; lat: number; lng: number }>("SELECT * FROM clubs WHERE id = ?", id);
}

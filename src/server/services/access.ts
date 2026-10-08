/**
 * Permisos (rols) i visibilitat (privacitat del jugador i protecció de menors).
 * Totes les comprovacions es fan al servidor; la interfície només reflecteix el resultat.
 */
import { all, get } from "@/server/db/client";
import { isMinor } from "@/lib/domain";
import { canSeeTeam, hasClubScope, hasPermission, teamScopeFor } from "@/lib/permissions";
import type { SessionUser } from "@/server/auth/session";
import type { PlayerRow } from "@/server/services/players";
import { playerRow, privacyOf } from "@/server/services/players";
import { ApiError } from "@/server/api";
import { audit } from "@/server/security/audit";

// ─── Rols (vegeu src/lib/permissions.ts) ──────────────────────────────────────
export const can = {
  manageOffers: (u: SessionUser) => hasPermission(u.role, "opportunities.manage"),
  editClub: (u: SessionUser) => hasPermission(u.role, "club.edit"),
  resetDemo: (u: SessionUser) => hasPermission(u.role, "demo.reset"),
  manageUsers: (u: SessionUser) => hasPermission(u.role, "users.manage"),
  viewAudit: (u: SessionUser) => hasPermission(u.role, "audit.view"),
  /** Direcció i coordinació veuen tot el club; l'entrenador només el seu equip. */
  seeTeam: (u: SessionUser, teamId: string | null | undefined) => canSeeTeam(u, teamId),
  allTeams: (u: SessionUser) => hasClubScope(u.role),
};

/** Llista d'equips que pot veure l'usuari de club (null = tots). */
export function teamScope(u: SessionUser): string[] | null {
  return teamScopeFor(u);
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
  applied: Set<string>; // el jugador s'ha inscrit a una oportunitat del club
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
 * - Si el jugador s'ha inscrit a una oportunitat del club, ha decidit compartir el perfil amb aquest club.
 */
export function clubCanSee(p: PlayerRow, club: { id: string; verified: number }, rel: ClubRelations, now = new Date()): Visibility {
  if (p.club_id === club.id) return { visible: true };
  if (rel.blockedBy.has(p.id)) return { visible: false, reason: "El jugador ha bloqueado al club." };
  const minor = isMinor(p.birth_date, now);
  if (minor && !p.guardian_consent) return { visible: false, reason: "Menor pendiente del consentimiento del tutor." };
  if (rel.applied.has(p.id) || rel.contacted.has(p.id)) return { visible: true };
  const priv = privacyOf(p);
  let level = priv.profile;
  if (minor && level === "tots") level = "verificats";
  if (level === "ocult") return { visible: false, reason: "Perfil oculto." };
  if (level === "contactats") return { visible: false, reason: "Solo visible para clubes con contacto." };
  if (level === "verificats" && !club.verified) return { visible: false, reason: "Solo visible para clubes verificados." };
  return { visible: true };
}

export type ContactCheck = { ok: boolean; reason?: string; needsGuardian: boolean };

/** Pot aquest club enviar una sol·licitud de contacte al jugador? */
export function clubCanContact(p: PlayerRow, club: { id: string; verified: number }, rel: ClubRelations, now = new Date()): ContactCheck {
  const minor = isMinor(p.birth_date, now);
  if (!club.verified) return { ok: false, reason: "Tu club está pendiente de verificación. Los clubes no verificados no pueden contactar jugadores.", needsGuardian: minor };
  if (rel.blockedBy.has(p.id)) return { ok: false, reason: "Este jugador no acepta contactos de tu club.", needsGuardian: minor };
  if (rel.pending.has(p.id)) return { ok: false, reason: "Ya hay una solicitud pendiente de respuesta.", needsGuardian: minor };
  if (rel.contacted.has(p.id)) return { ok: false, reason: "Ya tenéis una conversación abierta.", needsGuardian: minor };
  const priv = privacyOf(p);
  if (priv.contact === "ningu" && !rel.applied.has(p.id)) return { ok: false, reason: "El jugador no acepta contactos nuevos ahora mismo.", needsGuardian: minor };
  if (minor && !p.guardian_consent) return { ok: false, reason: "Menor sin consentimiento del tutor.", needsGuardian: true };
  return { ok: true, needsGuardian: minor };
}

export function clubById(id: string) {
  return get<{ id: string; name: string; short_name: string; initials: string; color_primary: string; color_secondary: string; verified: number; city: string; comarca: string; lat: number; lng: number }>("SELECT * FROM clubs WHERE id = ?", id);
}

/**
 * Guard central d'accés a un jugador per a qualsevol acció del club (pipeline, notes, avaluacions,
 * informes, desar, esdeveniments…). Sempre es comprova al servidor: user → club → visibilitat → recurs.
 * Un jugador que el club no pot veure respon com a «no trobat» (no se'n revela l'existència).
 */
export function assertPlayerVisible(u: SessionUser & { club_id: string }, playerId: string, action = "player.access"): PlayerRow {
  const p = playerRow(playerId);
  const club = clubById(u.club_id);
  if (!p || !club) throw new ApiError(404, "Jugador no encontrado.");
  const vis = clubCanSee(p, club, clubRelations(u.club_id));
  if (!vis.visible) {
    audit({ actor: u, action, entity: { type: "player", id: playerId }, result: "denied", detail: vis.reason ?? "no visible" });
    throw new ApiError(404, "Jugador no encontrado.");
  }
  return p;
}

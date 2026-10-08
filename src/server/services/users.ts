/**
 * Gestió d'usuaris interns del club (direcció esportiva). Tot es comprova al servidor:
 * permís users.manage, pertinença al mateix club, equip vàlid i que sempre quedi una direcció activa.
 */
import { z } from "zod";
import { all, get, insert, nowIso, run, uid } from "@/server/db/client";
import { ApiError, requirePermission } from "@/server/api";
import type { Staff } from "@/server/api";
import { revokeUserSessions } from "@/server/auth/session";
import { audit } from "@/server/security/audit";
import { CLUB_ROLES, CLUB_ROLE_LABEL } from "@/lib/permissions";
import type { ClubRole } from "@/lib/permissions";
import { zEmail, zId, zText } from "@/server/validation";

export const StaffPatch = z
  .object({ role: z.enum(CLUB_ROLES).optional(), team_id: zId.nullable().optional(), status: z.enum(["active", "disabled"]).optional() })
  .strict()
  .refine((d) => Object.keys(d).length > 0, "cap canvi");

export const StaffInvite = z.object({ name: zText(80, 3), email: zEmail, role: z.enum(CLUB_ROLES), team_id: zId.nullable().optional() }).strict();

type Target = { id: string; club_id: string | null; role: string; team_id: string | null; status: string; name: string };

function teamOfClub(clubId: string, teamId: string | null | undefined): string | null {
  if (!teamId) return null;
  const t = get<{ club_id: string }>("SELECT club_id FROM teams WHERE id = ?", teamId);
  if (!t || t.club_id !== clubId) throw new ApiError(400, "Equip no vàlid.");
  return teamId;
}

function activeDirectors(clubId: string): number {
  return get<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE club_id = ? AND role = 'director' AND status = 'active'", clubId)?.n ?? 0;
}

export function updateStaffUser(actor: Staff, userId: string, patch: z.infer<typeof StaffPatch>) {
  requirePermission(actor, "users.manage", "Només la direcció esportiva pot gestionar usuaris.");
  const t = get<Target>("SELECT id, club_id, role, team_id, status, name FROM users WHERE id = ?", userId);
  // un usuari d'un altre club respon com a inexistent (aïllament entre clubs)
  if (!t || t.club_id !== actor.club_id || !(CLUB_ROLES as readonly string[]).includes(t.role)) {
    audit({ actor, action: "users.update", entity: { type: "user", id: userId }, result: "denied", detail: "usuari d'un altre club o inexistent" });
    throw new ApiError(404, "Usuari no trobat.");
  }
  if (t.id === actor.id && (patch.role !== undefined && patch.role !== t.role || patch.status === "disabled")) {
    throw new ApiError(400, "No pots canviar el teu propi rol ni desactivar el teu compte.");
  }
  const role = (patch.role ?? t.role) as ClubRole;
  const status = patch.status ?? t.status;
  let teamId = patch.team_id !== undefined ? teamOfClub(actor.club_id, patch.team_id) : t.team_id;
  if (role === "coach" && !teamId) throw new ApiError(400, "Un entrenador ha de tenir un equip assignat.");
  if (role !== "coach") teamId = null;
  if (t.role === "director" && t.status === "active" && (role !== "director" || status !== "active") && activeDirectors(actor.club_id) <= 1) {
    throw new ApiError(400, "El club ha de tenir sempre almenys una direcció esportiva activa.");
  }
  const teamName = teamId ? get<{ name: string }>("SELECT name FROM teams WHERE id = ?", teamId)?.name : null;
  run("UPDATE users SET role = ?, team_id = ?, status = ?, title = ? WHERE id = ?", role, teamId, status, role === "coach" ? `Entrenador · ${teamName}` : CLUB_ROLE_LABEL[role], t.id);
  // els canvis de permisos són efectius immediatament: es tanquen les sessions obertes de l'usuari
  if (role !== t.role || status !== t.status || teamId !== t.team_id) revokeUserSessions(t.id);
  const changes = [role !== t.role && `rol ${t.role} → ${role}`, teamId !== t.team_id && `equip ${t.team_id ?? "—"} → ${teamId ?? "—"}`, status !== t.status && `estat ${t.status} → ${status}`].filter(Boolean).join(", ");
  audit({ actor, action: "users.update", entity: { type: "user", id: t.id }, detail: `${t.name}: ${changes || "sense canvis"}` });
  return { ok: true };
}

export function inviteStaffUser(actor: Staff, d: z.infer<typeof StaffInvite>) {
  requirePermission(actor, "users.manage", "Només la direcció esportiva pot convidar usuaris.");
  if (get("SELECT id FROM users WHERE lower(email) = lower(?)", d.email)) throw new ApiError(409, "Ja existeix un usuari amb aquest correu.");
  const teamId = d.role === "coach" ? teamOfClub(actor.club_id, d.team_id) : null;
  if (d.role === "coach" && !teamId) throw new ApiError(400, "Un entrenador ha de tenir un equip assignat.");
  const id = uid("u_");
  const teamName = teamId ? get<{ name: string }>("SELECT name FROM teams WHERE id = ?", teamId)?.name : null;
  // Sense contrasenya («!» no és un hash vàlid): l'usuari no pot entrar fins que accepti la invitació.
  // L'enviament del correu d'invitació està PENDENT DE DEFINIR (cap servei de correu a la demo).
  insert("users", { id, email: d.email, password_hash: "!", name: d.name, role: d.role, status: "active", title: d.role === "coach" ? `Entrenador · ${teamName}` : CLUB_ROLE_LABEL[d.role], club_id: actor.club_id, team_id: teamId, avatar_hue: Math.floor(Math.random() * 360), is_demo_login: 0, created_at: nowIso() });
  audit({ actor, action: "users.invite", entity: { type: "user", id }, detail: `${d.name} com a ${CLUB_ROLE_LABEL[d.role]}` });
  return { id };
}

export type AuditRow = { id: string; action: string; entity_type: string | null; entity_id: string | null; result: string; detail: string | null; created_at: string; actor_name: string | null };
export function clubAudit(actor: Staff, limit = 30): AuditRow[] {
  requirePermission(actor, "audit.view");
  return all<AuditRow>(
    "SELECT a.id, a.action, a.entity_type, a.entity_id, a.result, a.detail, a.created_at, u.name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id WHERE a.club_id = ? ORDER BY a.created_at DESC LIMIT ?",
    actor.club_id, limit,
  );
}

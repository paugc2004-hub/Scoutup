/**
 * RBAC de ScoutUp Club — font única de veritat per als permisos del personal del club.
 *
 * Tres rols interns del club (no hi ha cap producte ni compte «scout»: el scouting és una
 * capacitat del club):
 *   - director     · Direcció esportiva: accés complet i gestió d'usuaris i rols.
 *   - coordinator  · Coordinació: tots els equips del club, gestiona oportunitats; no administra el club.
 *   - coach        · Entrenador: només el seu equip.
 *
 * La interfície fa servir aquestes funcions per amagar accions, però el servidor les torna a
 * comprovar sempre (src/server/services/guards.ts). Sense àlies: també s'importa des de tests i seed.
 */

export const CLUB_ROLES = ["director", "coordinator", "coach"] as const;
export type ClubRole = (typeof CLUB_ROLES)[number];

export const CLUB_ROLE_LABEL: Record<ClubRole, string> = {
  director: "Direcció esportiva",
  coordinator: "Coordinació",
  coach: "Entrenador",
};

export const PERMISSIONS = [
  "players.view", // cercar i veure perfils visibles
  "pipeline.manage", // afegir, moure i retirar jugadors del pipeline
  "evaluations.write", // avaluacions, notes privades i informes d'observació
  "contact.send", // sol·licituds de contacte i missatges
  "calendar.manage", // crear i eliminar esdeveniments
  "opportunities.manage", // crear, pausar i tancar oportunitats
  "club.edit", // editar el perfil del club
  "users.manage", // gestionar usuaris, rols i equips assignats
  "audit.view", // consultar el registre d'auditoria
  "demo.reset", // restaurar les dades de demostració
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const BASE: Permission[] = ["players.view", "pipeline.manage", "evaluations.write", "contact.send", "calendar.manage"];

export const ROLE_PERMISSIONS: Record<ClubRole, ReadonlySet<Permission>> = {
  director: new Set<Permission>(PERMISSIONS),
  coordinator: new Set<Permission>([...BASE, "opportunities.manage"]),
  coach: new Set<Permission>(BASE),
};

/** Àmbit d'equips: «club» = tots els equips del club; «team» = només l'equip assignat. */
export const ROLE_SCOPE: Record<ClubRole, "club" | "team"> = {
  director: "club",
  coordinator: "club",
  coach: "team",
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  "players.view": "Cercar jugadors, veure perfils i ScoutUp Intelligence",
  "pipeline.manage": "Pipeline: afegir, moure i retirar jugadors",
  "evaluations.write": "Avaluacions, notes privades i informes d'observació",
  "contact.send": "Contactar jugadors i conversar",
  "calendar.manage": "Calendari: crear i eliminar esdeveniments",
  "opportunities.manage": "Crear, pausar i tancar oportunitats",
  "club.edit": "Editar el perfil del club",
  "users.manage": "Gestionar usuaris, rols i equips",
  "audit.view": "Consultar el registre d'auditoria",
  "demo.reset": "Restaurar les dades de la demo",
};

export function isClubRole(role: string | null | undefined): role is ClubRole {
  return !!role && (CLUB_ROLES as readonly string[]).includes(role);
}

export function hasPermission(role: string | null | undefined, perm: Permission): boolean {
  return isClubRole(role) && ROLE_PERMISSIONS[role].has(perm);
}

/** Veu tots els equips del club (director i coordinació). */
export function hasClubScope(role: string | null | undefined): boolean {
  return isClubRole(role) && ROLE_SCOPE[role] === "club";
}

/** Equips accessibles: null = tots els del club; [] = cap. */
export function teamScopeFor(u: { role: string; team_id: string | null }): string[] | null {
  if (hasClubScope(u.role)) return null;
  return u.team_id ? [u.team_id] : [];
}

export function canSeeTeam(u: { role: string; team_id: string | null }, teamId: string | null | undefined): boolean {
  if (hasClubScope(u.role)) return true;
  return !!teamId && teamId === u.team_id;
}

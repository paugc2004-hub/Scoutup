import { describe, expect, it } from "vitest";
import { CLUB_ROLES, PERMISSIONS, canSeeTeam, hasClubScope, hasPermission, isClubRole, teamScopeFor } from "@/lib/permissions";

describe("RBAC del club", () => {
  it("la direcció esportiva té tots els permisos", () => {
    for (const p of PERMISSIONS) expect(hasPermission("director", p)).toBe(true);
  });

  it("la coordinació gestiona oportunitats però no administra el club", () => {
    expect(hasPermission("coordinator", "opportunities.manage")).toBe(true);
    expect(hasPermission("coordinator", "pipeline.manage")).toBe(true);
    for (const p of ["club.edit", "users.manage", "audit.view", "demo.reset"] as const) expect(hasPermission("coordinator", p)).toBe(false);
  });

  it("l'entrenador no pot crear oportunitats ni administrar", () => {
    for (const p of ["opportunities.manage", "club.edit", "users.manage", "audit.view", "demo.reset"] as const) expect(hasPermission("coach", p)).toBe(false);
    expect(hasPermission("coach", "evaluations.write")).toBe(true);
  });

  it("jugador, tutor i rols desconeguts no tenen cap permís de club", () => {
    for (const role of ["player", "guardian", "scout", "admin", "", null, undefined]) {
      for (const p of PERMISSIONS) expect(hasPermission(role as string, p)).toBe(false);
      expect(isClubRole(role as string)).toBe(false);
    }
  });

  it("no existeix cap rol «scout»: el scouting és una capacitat del club", () => {
    expect(CLUB_ROLES).toEqual(["director", "coordinator", "coach"]);
  });

  it("àmbit d'equips: direcció i coordinació tot el club; entrenador només el seu equip", () => {
    expect(hasClubScope("director")).toBe(true);
    expect(hasClubScope("coordinator")).toBe(true);
    expect(hasClubScope("coach")).toBe(false);
    expect(teamScopeFor({ role: "director", team_id: null })).toBeNull();
    expect(teamScopeFor({ role: "coach", team_id: "t1" })).toEqual(["t1"]);
    expect(teamScopeFor({ role: "coach", team_id: null })).toEqual([]);
    expect(canSeeTeam({ role: "coach", team_id: "t1" }, "t1")).toBe(true);
    expect(canSeeTeam({ role: "coach", team_id: "t1" }, "t2")).toBe(false);
    expect(canSeeTeam({ role: "coach", team_id: "t1" }, null)).toBe(false);
    expect(canSeeTeam({ role: "coordinator", team_id: null }, "t2")).toBe(true);
  });
});

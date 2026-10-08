/** Permisos per rol (servidor): direcció, coordinació i entrenador. */
import { beforeAll, describe, expect, it } from "vitest";
import { db, get, run } from "@/server/db/client";
import { addToPipeline, moveStage, addNote, saveEvaluation, createEvent } from "@/server/services/actions";
import { createOffer, setOfferStatus } from "@/server/services/offer-actions";
import { inviteStaffUser, updateStaffUser, clubAudit } from "@/server/services/users";
import { assertPlayerVisible } from "@/server/services/access";
import { coach, coordinator, director, hiddenMinorFor, statusOf } from "../helpers";

const newOffer = { team_id: "t_vn_juva", kind: "incorporacio" as const, title: "Lateral dret per al Juvenil A", position: "LD" as const, accepts_secondary: true, level_min: 3, zone_city: "Sabadell", max_km: 30, foot: "indiferent" as const, traits: [], availability_req: "temporada" as const, description: "", restrictions: "", expires_days: 30 };

beforeAll(() => db());

describe("direcció esportiva", () => {
  it("crea oportunitats i gestiona usuaris", () => {
    const r = createOffer(director(), newOffer);
    expect(r.id).toMatch(/^o_/);
    expect(r.preview.total).toBeGreaterThan(0);
    const inv = inviteStaffUser(director(), { name: "Nova Entrenadora", email: "nova@vallesnord.example", role: "coach", team_id: "t_vn_cada" });
    expect(get<{ role: string; team_id: string }>("SELECT role, team_id FROM users WHERE id = ?", inv.id)).toMatchObject({ role: "coach", team_id: "t_vn_cada" });
  });

  it("no pot treure's el rol a si mateixa ni deixar el club sense direcció", () => {
    const d = director();
    expect(statusOf(() => updateStaffUser(d, d.id, { role: "coach", team_id: "t_vn_juva" }))).toBe(400);
    expect(statusOf(() => updateStaffUser(d, d.id, { status: "disabled" }))).toBe(400);
  });

  it("un canvi de rol tanca les sessions obertes de l'usuari", () => {
    run("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES ('t-test', 'u_coordinator', '2026-01-01', '2099-01-01')");
    updateStaffUser(director(), "u_coordinator", { role: "coach", team_id: "t_vn_juvb" });
    expect(get("SELECT token FROM sessions WHERE user_id = 'u_coordinator'")).toBeUndefined();
    updateStaffUser(director(), "u_coordinator", { role: "coordinator" });
    expect(get<{ role: string; team_id: string | null }>("SELECT role, team_id FROM users WHERE id = 'u_coordinator'")).toEqual({ role: "coordinator", team_id: null });
    expect(clubAudit(director(), 50).some((a) => a.action === "users.update")).toBe(true);
  });

  it("un entrenador ha de tenir equip, i l'equip ha de ser del club", () => {
    expect(statusOf(() => updateStaffUser(director(), "u_coach", { team_id: null }))).toBe(400);
    expect(statusOf(() => updateStaffUser(director(), "u_coach", { team_id: "t_mediterrani_juva" }))).toBe(400);
  });
});

describe("coordinació", () => {
  it("gestiona oportunitats de qualsevol equip", () => {
    const r = createOffer(coordinator(), { ...newOffer, team_id: "t_vn_cada", title: "Porter per al Cadete A", position: "POR" });
    setOfferStatus(coordinator(), r.id, "pausada");
    expect(get<{ status: string }>("SELECT status FROM offers WHERE id = ?", r.id)!.status).toBe("pausada");
  });

  it("no pot gestionar usuaris", () => {
    expect(statusOf(() => updateStaffUser(coordinator(), "u_coach", { status: "disabled" }))).toBe(403);
    expect(statusOf(() => inviteStaffUser(coordinator(), { name: "Algú", email: "x@y.example", role: "director" }))).toBe(403);
    expect(statusOf(() => clubAudit(coordinator()))).toBe(403);
  });
});

describe("entrenador", () => {
  it("no pot crear ni modificar oportunitats", () => {
    expect(statusOf(() => createOffer(coach(), newOffer))).toBe(403);
    const o = get<{ id: string }>("SELECT id FROM offers WHERE club_id = 'club_vn' LIMIT 1")!;
    expect(statusOf(() => setOfferStatus(coach(), o.id, "tancada"))).toBe(403);
  });

  it("no pot moure jugadors que segueix un altre equip", () => {
    const other = get<{ id: string }>("SELECT id FROM pipeline_entries WHERE club_id = 'club_vn' AND team_id IS NOT NULL AND team_id != 't_vn_juva' LIMIT 1");
    expect(other).toBeDefined();
    expect(statusOf(() => moveStage(coach(), other!.id, "interessant"))).toBe(403);
  });

  it("no pot afegir jugadors al pipeline d'un altre equip", () => {
    expect(statusOf(() => addToPipeline(coach(), "p_biel", { teamId: "t_vn_cada" }))).toBe(403);
  });

  it("no pot crear esdeveniments per a un altre equip", () => {
    expect(statusOf(() => createEvent(coach(), { kind: "reunio", title: "Reunió", starts_at: "2026-11-02T18:00:00Z", duration: 60, team_id: "t_vn_cada" }))).toBe(403);
  });
});

describe("protecció de menors i visibilitat", () => {
  it("cap rol del club pot actuar sobre un menor sense consentiment del tutor", () => {
    const minor = hiddenMinorFor("club_vn");
    for (const u of [director(), coordinator(), coach()]) {
      expect(statusOf(() => assertPlayerVisible(u, minor))).toBe(404);
      expect(statusOf(() => addToPipeline(u, minor))).toBe(404);
      expect(statusOf(() => addNote(u, minor, "x"))).toBe(404);
      expect(statusOf(() => saveEvaluation(u, minor, { scores: {}, decision: "seguir", comment: "" }))).toBe(404);
    }
    expect(get("SELECT id FROM pipeline_entries WHERE player_id = ? AND club_id = 'club_vn'", minor)).toBeUndefined();
  });

  it("un jugador inexistent respon 404", () => {
    expect(statusOf(() => addToPipeline(director(), "p_no_existeix"))).toBe(404);
  });
});

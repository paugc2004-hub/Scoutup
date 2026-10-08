/**
 * Aïllament entre clubs (obligatori): el Club B no pot llegir ni modificar res intern del CF Vallès Nord,
 * encara que conegui els identificadors (protecció IDOR).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { db, get } from "@/server/db/client";
import { addNote, conversationFor, deleteNote, moveStage, removeFromPipeline, saveEvaluation, sendMessage, createEvent, deleteEvent, cancelContactRequest } from "@/server/services/actions";
import { setOfferStatus } from "@/server/services/offer-actions";
import { updateStaffUser, clubAudit } from "@/server/services/users";
import { pipelineRows, recentActivity } from "@/server/services/club";
import { clubB, director, statusOf } from "../helpers";

let vnEntry: string, vnConv: string, vnOffer: string, vnNote: string, vnEvent: string;

beforeAll(() => {
  db();
  vnEntry = get<{ id: string }>("SELECT id FROM pipeline_entries WHERE club_id = 'club_vn' LIMIT 1")!.id;
  vnConv = get<{ id: string }>("SELECT id FROM conversations WHERE club_id = 'club_vn' LIMIT 1")!.id;
  vnOffer = get<{ id: string }>("SELECT id FROM offers WHERE club_id = 'club_vn' LIMIT 1")!.id;
  vnNote = get<{ id: string }>("SELECT id FROM notes WHERE club_id = 'club_vn' LIMIT 1")!.id;
  vnEvent = get<{ id: string }>("SELECT id FROM events WHERE club_id = 'club_vn' LIMIT 1")!.id;
});

describe("Club A ↔ Club B", () => {
  it("el Club B és un club diferent amb usuari propi", () => {
    expect(clubB().club_id).toBe("club_mediterrani");
    expect(director().club_id).toBe("club_vn");
  });

  it("no pot moure ni retirar entrades del pipeline del Club A", () => {
    expect(statusOf(() => moveStage(clubB(), vnEntry, "rebutjat"))).toBe(404);
    expect(statusOf(() => removeFromPipeline(clubB(), vnEntry))).toBe(404);
    expect(get<{ stage: string }>("SELECT stage FROM pipeline_entries WHERE id = ?", vnEntry)!.stage).not.toBe("rebutjat");
  });

  it("no pot llegir ni escriure a les converses del Club A", () => {
    expect(statusOf(() => conversationFor(clubB(), vnConv))).toBe(403);
    expect(statusOf(() => sendMessage(clubB(), vnConv, "hola"))).toBe(403);
  });

  it("no pot modificar oportunitats, usuaris, notes, esdeveniments ni sol·licituds del Club A", () => {
    expect(statusOf(() => setOfferStatus(clubB(), vnOffer, "tancada"))).toBe(404);
    expect(statusOf(() => updateStaffUser(clubB(), "u_coach", { status: "disabled" }))).toBe(404);
    expect(statusOf(() => deleteNote(clubB(), vnNote))).toBe(404);
    expect(statusOf(() => deleteEvent(clubB(), vnEvent))).toBe(403);
    const req = get<{ id: string }>("SELECT id FROM contact_requests WHERE club_id = 'club_vn' LIMIT 1");
    if (req) expect(statusOf(() => cancelContactRequest(clubB(), req.id))).toBe(404);
  });

  it("no pot injectar missatges a una conversa del Club A a través d'un esdeveniment", () => {
    const pid = get<{ player_id: string }>("SELECT player_id FROM conversations WHERE id = ?", vnConv)!.player_id;
    const before = get<{ n: number }>("SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?", vnConv)!.n;
    const s = statusOf(() => createEvent(clubB(), { kind: "trucada", title: "x", starts_at: "2026-11-01T10:00:00Z", duration: 30, related_player_id: pid, conversation_id: vnConv }));
    expect([403, 404]).toContain(s);
    expect(get<{ n: number }>("SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?", vnConv)!.n).toBe(before);
  });

  it("les seves avaluacions i notes queden separades de les del Club A", () => {
    const pid = "p_biel";
    saveEvaluation(clubB(), pid, { scores: { tecnica: { control: 7 } }, decision: "seguir", comment: "Nota del Club B" });
    addNote(clubB(), pid, "Nota privada del Club B");
    const vnSees = get<{ n: number }>("SELECT COUNT(*) AS n FROM evaluations WHERE club_id = 'club_vn' AND comment = 'Nota del Club B'")!.n;
    expect(vnSees).toBe(0);
    expect(pipelineRows(clubB()).every((r) => r.player_id !== undefined)).toBe(true);
    expect(pipelineRows(director()).some((r) => r.id === vnEntry)).toBe(true);
    expect(pipelineRows(clubB()).some((r) => r.id === vnEntry)).toBe(false);
    expect(recentActivity(director(), 50).some((a) => a.text.includes("Club B"))).toBe(false);
  });

  it("l'auditoria del Club A no inclou res del Club B i registra els intents denegats", () => {
    const bName = get<{ name: string }>("SELECT name FROM users WHERE email = 'club-b@scoutup.demo'")!.name;
    expect(clubAudit(director(), 200).every((r) => r.actor_name !== bName)).toBe(true);
    const bAudit = clubAudit(clubB(), 200);
    expect(bAudit.some((r) => r.result === "denied")).toBe(true);
  });
});

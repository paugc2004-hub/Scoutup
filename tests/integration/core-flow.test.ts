/**
 * Recorregut estrella a nivell de servei: oportunitat → compatibles → guardar → pipeline → avaluació →
 * contacte → activitat. Garanteix que les dades queden connectades (una sola font de veritat).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { all, db, get } from "@/server/db/client";
import { addToPipeline, moveStage, saveEvaluation, sendContactRequest, toggleFavorite } from "@/server/services/actions";
import { offerRow, rankCandidates, toMatchOffer } from "@/server/services/offers";
import { recentActivity } from "@/server/services/club";
import { clubById } from "@/server/services/access";
import { director, player } from "../helpers";

beforeAll(() => db());

describe("recorregut estrella", () => {
  it("l'oportunitat del Juvenil A troba candidats compatibles, amb el Biel al 87%", () => {
    const o = offerRow("o_vn_central")!;
    expect(o.club_id).toBe("club_vn");
    const list = rankCandidates(toMatchOffer(o), clubById("club_vn")!, { minScore: 50, offerId: o.id });
    expect(list.length).toBeGreaterThanOrEqual(10);
    const biel = list.find((c) => c.player.id === "p_biel")!;
    expect(biel.match.score).toBe(87);
    expect(biel.match.factors.every((f) => f.detail.length > 0)).toBe(true);
    // ordenats per compatibilitat
    for (let i = 1; i < list.length; i++) expect(list[i - 1].match.score).toBeGreaterThanOrEqual(list[i].match.score);
  });

  it("guardar → pipeline → avaluació → contacte, i tot apareix a l'activitat", () => {
    const d = director();
    run_(() => {
      const existing = get<{ id: string }>("SELECT id FROM favorites WHERE user_id = ? AND target_id = 'p_biel'", d.id);
      if (existing) toggleFavorite(d, "player", "p_biel");
    });
    expect(toggleFavorite(d, "player", "p_biel")).toBe(true);
    const e = addToPipeline(d, "p_biel", { offerId: "o_vn_central" });
    moveStage(d, e.id, "interessant");
    saveEvaluation(d, "p_biel", { scores: { tecnica: { control: 8, passada: 7 } }, decision: "prova", comment: "Molt bon joc aeri.", context: "Partit de lliga" });
    const r = sendContactRequest(d, "p_biel", { reason: "oferta", message: "Hola Biel, ens agradaria conèixer-te." });
    expect(["pendent", "pendent_tutor"]).toContain(r.status);

    const stage = get<{ stage: string }>("SELECT stage FROM pipeline_entries WHERE club_id = 'club_vn' AND player_id = 'p_biel'")!.stage;
    expect(stage).toBe("contactat");
    const kinds = recentActivity(d, 50, "p_biel").map((a) => a.kind);
    for (const k of ["desat", "afegit", "etapa", "avaluacio", "contacte"]) expect(kinds).toContain(k);
    expect(get<{ context: string }>("SELECT context FROM evaluations WHERE club_id = 'club_vn' AND player_id = 'p_biel' AND author_user_id = ?", d.id)!.context).toBe("Partit de lliga");
  });

  it("el jugador no rep mai les notes ni les avaluacions internes", () => {
    const p = player();
    const notifs = all<{ title: string; body: string | null }>("SELECT title, body FROM notifications WHERE user_id = ?", p.id);
    for (const n of notifs) expect(`${n.title} ${n.body ?? ""}`).not.toMatch(/Molt bon joc aeri/);
    const events = all<{ notes: string | null }>("SELECT notes FROM events WHERE player_id = ? AND owner_user_id = ?", p.player_id, p.id);
    for (const ev of events) expect(ev.notes ?? "").not.toMatch(/Observar/);
  });
});

function run_(fn: () => void) {
  fn();
}

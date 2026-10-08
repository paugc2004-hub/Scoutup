/**
 * Recorrido estrella a nivel de servicio: «El Cadete A necesita un lateral derecho».
 * Necesidad → oportunidad → 18 compatibles → Hugo al 87 % → guardar → pipeline → evaluación → contacto
 * (vía tutor, es menor) → actividad. Garantiza que los datos quedan conectados (una sola fuente de verdad).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { all, db, get } from "@/server/db/client";
import { addToPipeline, moveStage, saveEvaluation, sendContactRequest, toggleFavorite } from "@/server/services/actions";
import { offerRow, rankCandidates, toMatchOffer } from "@/server/services/offers";
import { recentActivity, teamNeeds } from "@/server/services/club";
import { clubById } from "@/server/services/access";
import { director, player } from "../helpers";

beforeAll(() => db());

describe("recorrido estrella", () => {
  it("la necesidad del Cadete A tiene su oportunidad", () => {
    const need = teamNeeds(director()).find((n) => n.team_name === "Cadete A");
    expect(need).toMatchObject({ position: "LD", priority: "alta" });
    const o = offerRow("o_vn_ld")!;
    expect(o).toMatchObject({ club_id: "club_vn", position: "LD", category: "Cadete", status: "oberta" });
  });

  it("ScoutUp encuentra 18 jugadores compatibles y Hugo es el mejor encaje, al 87 %", () => {
    const o = offerRow("o_vn_ld")!;
    const list = rankCandidates(toMatchOffer(o), clubById("club_vn")!, { minScore: 70, offerId: o.id });
    expect(list).toHaveLength(18);
    expect(list[0].player.id).toBe("p_hugo");
    expect(list[0].match.score).toBe(87);
    // cada factor tiene su explicación («¿por qué encaja?»)
    expect(list[0].match.factors).toHaveLength(7);
    expect(list[0].match.factors.every((f) => f.detail.length > 0)).toBe(true);
    for (let i = 1; i < list.length; i++) expect(list[i - 1].match.score).toBeGreaterThanOrEqual(list[i].match.score);
  });

  it("guardar → pipeline → evaluación → contacto (al tutor), y todo aparece en la actividad", () => {
    const d = director();
    expect(toggleFavorite(d, "player", "p_hugo")).toBe(true);
    const e = addToPipeline(d, "p_hugo", { offerId: "o_vn_ld" });
    moveStage(d, e.id, "interessant");
    saveEvaluation(d, "p_hugo", { scores: { tecnica: { control: 8, passada: 7 }, fisica: { velocitat: 9 } }, decision: "prova", comment: "Mucho recorrido y buen centro.", context: "Partido de liga" });
    const r = sendContactRequest(d, "p_hugo", { reason: "oferta", message: "Hola Hugo, nos gustaría conocerte." });
    expect(r.status).toBe("pendent_tutor"); // es menor: decide el tutor

    expect(get<{ stage: string }>("SELECT stage FROM pipeline_entries WHERE club_id = 'club_vn' AND player_id = 'p_hugo'")!.stage).toBe("contactat");
    const kinds = recentActivity(d, 50, "p_hugo").map((a) => a.kind);
    for (const k of ["desat", "afegit", "etapa", "avaluacio", "contacte"]) expect(kinds).toContain(k);
    expect(get<{ context: string }>("SELECT context FROM evaluations WHERE club_id = 'club_vn' AND player_id = 'p_hugo' AND author_user_id = ?", d.id)!.context).toBe("Partido de liga");
  });

  it("el segundo caso (central sub-19) mantiene a Biel al 87 %", () => {
    const o = offerRow("o_vn_central")!;
    const biel = rankCandidates(toMatchOffer(o), clubById("club_vn")!, { minScore: 50, offerId: o.id }).find((c) => c.player.id === "p_biel")!;
    expect(biel.match.score).toBe(87);
  });

  it("el jugador nunca recibe notas, evaluaciones ni notas internas de eventos", () => {
    const p = player();
    const notifs = all<{ title: string; body: string | null }>("SELECT title, body FROM notifications WHERE user_id = ?", p.id);
    for (const n of notifs) expect(`${n.title} ${n.body ?? ""}`).not.toMatch(/Mucho recorrido/);
    const events = all<{ notes: string | null }>("SELECT notes FROM events WHERE player_id = ? AND owner_user_id = ?", p.player_id, p.id);
    for (const ev of events) expect(ev.notes ?? "").not.toMatch(/Observar/);
  });
});

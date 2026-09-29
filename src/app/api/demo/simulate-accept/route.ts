import { z } from "zod";
import { api, apiStaff, ApiError, body } from "@/server/api";
import { get, nowIso, run, tx, uid, insert } from "@/server/db/client";
import { notifyClub } from "@/server/services/notify";
import { PIPELINE_STAGES } from "@/lib/domain";
import type { Stage } from "@/lib/domain";

const Schema = z.object({ requestId: z.string() });

/**
 * NOMÉS DEMO: simula que el jugador accepta la sol·licitud de contacte, perquè el recorregut del club
 * es pugui fer sense canviar d'usuari. Els menors queden exclosos (sempre cal el tutor).
 */
export const POST = api(async (req) => {
  const u = await apiStaff();
  const { requestId } = Schema.parse(await body(req));
  const r = get<{ id: string; club_id: string; player_id: string; team_id: string | null; message: string; from_user_id: string; reason: string; status: string }>("SELECT * FROM contact_requests WHERE id = ? AND club_id = ?", requestId, u.club_id);
  if (!r) throw new ApiError(404, "Sol·licitud no trobada.");
  if (r.status === "pendent_tutor") throw new ApiError(400, "Els contactes amb menors requereixen l'autorització real del tutor (entra com a tutor).");
  if (r.status !== "pendent") throw new ApiError(400, "Aquesta sol·licitud ja està resolta.");
  const p = get<{ first_name: string; last_name: string }>("SELECT first_name, last_name FROM players WHERE id = ?", r.player_id)!;
  const convId = tx(() => {
    const existing = get<{ id: string }>("SELECT id FROM conversations WHERE club_id = ? AND player_id = ?", r.club_id, r.player_id);
    const now = nowIso();
    const id = existing?.id ?? uid("cv_");
    if (!existing) {
      insert("conversations", { id, club_id: r.club_id, player_id: r.player_id, team_id: r.team_id, subject: r.reason === "prova" ? "Invitació a una prova" : "Interès per una oferta", status: "activa", created_at: now, last_message_at: now });
      insert("messages", { id: uid("m_"), conversation_id: id, sender_user_id: r.from_user_id, sender_side: "club", body: r.message, flagged: 0, created_at: now, read_by_club_at: now, read_by_player_at: now });
    }
    const later = new Date(Date.now() + 1000).toISOString();
    insert("messages", { id: uid("m_"), conversation_id: id, sender_user_id: null, sender_side: "player", body: `Hola! Moltes gràcies pel missatge. M'interessa molt conèixer el projecte. Quan us aniria bé parlar?`, flagged: 0, created_at: later, read_by_club_at: null, read_by_player_at: later });
    run("UPDATE conversations SET last_message_at = ? WHERE id = ?", later, id);
    run("UPDATE contact_requests SET status = 'acceptada', responded_at = ?, conversation_id = ? WHERE id = ?", now, id, r.id);
    const e = get<{ id: string; stage: Stage }>("SELECT id, stage FROM pipeline_entries WHERE club_id = ? AND player_id = ?", r.club_id, r.player_id);
    if (e && PIPELINE_STAGES.indexOf(e.stage) < PIPELINE_STAGES.indexOf("en_conversa")) {
      run("UPDATE pipeline_entries SET stage = 'en_conversa', updated_at = ? WHERE id = ?", now, e.id);
      insert("pipeline_activity", { id: uid("pa_"), club_id: r.club_id, player_id: r.player_id, entry_id: e.id, user_id: null, kind: "etapa", text: "Etapa: Contactat → En conversa (el jugador ha acceptat)", from_stage: e.stage, to_stage: "en_conversa", created_at: now });
    }
    return id;
  });
  notifyClub(r.club_id, r.team_id, "contact", "Un jugador ha acceptat la teva sol·licitud.", `${p.first_name} ${p.last_name}`, `/club/missatges/${convId}`);
  return { ok: true, conversationId: convId };
});

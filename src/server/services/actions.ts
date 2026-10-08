/**
 * Accions (escriptura) del domini. Cada funció comprova permisos i manté la coherència
 * entre pipeline, candidatures, contactes, converses i notificacions.
 */
import { all, get, insert, nowIso, run, tx, uid, update } from "@/server/db/client";
import { ApiError } from "@/server/api";
import type { SessionUser } from "@/server/auth/session";
import { assertPlayerVisible, can, clubById, clubCanContact, clubRelations } from "@/server/services/access";
import { audit } from "@/server/security/audit";
import { isClubRole } from "@/lib/permissions";
import { notify, notifyClub, notifyPlayer } from "@/server/services/notify";
import { playerRow, playerCtx, toMatchPlayer } from "@/server/services/players";
import type { PlayerRow } from "@/server/services/players";
import { offerRow, toMatchOffer } from "@/server/services/offers";
import { computeMatch } from "@/lib/matching";
import { APP_STATUS_LABEL, PIPELINE_STAGES, STAGE_LABEL, stageToAppStatus, isMinor } from "@/lib/domain";
import type { Stage, AppStatus } from "@/lib/domain";
import { fmtDateTime } from "@/lib/time";

type Staff = SessionUser & { club_id: string };

function mustPlayer(id: string): PlayerRow {
  const p = playerRow(id);
  if (!p) throw new ApiError(404, "Jugador no trobat.");
  return p;
}
function mustClub(id: string) {
  const c = clubById(id);
  if (!c) throw new ApiError(404, "Club no trobat.");
  return c;
}
function assertTeam(u: Staff, teamId: string | null | undefined) {
  if (can.allTeams(u)) {
    if (teamId) {
      const t = get<{ club_id: string }>("SELECT club_id FROM teams WHERE id = ?", teamId);
      if (!t || t.club_id !== u.club_id) throw new ApiError(400, "Equip no vàlid.");
    }
    return;
  }
  if (!teamId || teamId !== u.team_id) throw new ApiError(403, "Com a entrenador només pots gestionar el teu equip.");
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
export type PipelineEntry = { id: string; club_id: string; team_id: string | null; player_id: string; offer_id: string | null; stage: Stage; added_by: string | null; sort: number; created_at: string; updated_at: string };

function logActivity(clubId: string, playerId: string, entryId: string | null, userId: string | null, kind: string, text: string, from: string | null = null, to: string | null = null) {
  insert("pipeline_activity", { id: uid("pa_"), club_id: clubId, player_id: playerId, entry_id: entryId, user_id: userId, kind, text, from_stage: from, to_stage: to, created_at: nowIso() });
}

/** Sincronitza l'estat de les candidatures del jugador al club amb l'etapa del pipeline. */
function syncApplication(clubId: string, playerId: string, stage: Stage, clubName: string) {
  const mapped = stageToAppStatus(stage);
  if (!mapped) return;
  const apps = all<{ id: string; status: string; offer_title: string }>("SELECT a.id, a.status, o.title AS offer_title FROM applications a JOIN offers o ON o.id = a.offer_id WHERE o.club_id = ? AND a.player_id = ?", clubId, playerId);
  const p = playerRow(playerId);
  for (const a of apps) {
    if (a.status === mapped) continue;
    run("UPDATE applications SET status = ?, updated_at = ? WHERE id = ?", mapped, nowIso(), a.id);
    if (p) notifyPlayer(p, "application", `${clubName}: ${APP_STATUS_LABEL[mapped as AppStatus].toLowerCase()}`, `Sol·licitud «${a.offer_title}».`, "/jugador/seguiment");
  }
}

export function addToPipeline(u: Staff, playerId: string, opts: { teamId?: string | null; offerId?: string | null; stage?: Stage } = {}): PipelineEntry {
  const p = assertPlayerVisible(u, playerId, "pipeline.add");
  if (opts.offerId) {
    const o = offerRow(opts.offerId);
    if (!o || o.club_id !== u.club_id) throw new ApiError(404, "Oportunitat no trobada.");
  }
  const club = mustClub(u.club_id);
  const teamId = opts.teamId ?? (can.allTeams(u) ? null : u.team_id) ?? (opts.offerId ? offerRow(opts.offerId)?.team_id ?? null : null);
  assertTeam(u, teamId);
  const existing = get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE club_id = ? AND player_id = ?", u.club_id, playerId);
  if (existing) return existing;
  const id = uid("pl_");
  const now = nowIso();
  const stage = opts.stage ?? "nou";
  const maxSort = get<{ m: number | null }>("SELECT MAX(sort) AS m FROM pipeline_entries WHERE club_id = ?", u.club_id)?.m ?? 0;
  insert("pipeline_entries", { id, club_id: u.club_id, team_id: teamId, player_id: playerId, offer_id: opts.offerId ?? null, stage, added_by: u.id, sort: maxSort + 1, created_at: now, updated_at: now });
  const offerTitle = opts.offerId ? offerRow(opts.offerId)?.title : null;
  logActivity(u.club_id, playerId, id, u.id, "afegit", offerTitle ? `Afegit al pipeline des de l'oportunitat «${offerTitle}»` : "Afegit al pipeline", null, stage);
  // el jugador veu que un club s'interessa per ell (sense saber detalls interns)
  notifyPlayer(p, "interest", "Nou club interessat en el teu perfil.", `${club.name} ha afegit el teu perfil a la seva llista de seguiment.`, "/jugador/seguiment");
  if (stage !== "nou") syncApplication(u.club_id, playerId, stage, club.name);
  return get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE id = ?", id)!;
}

export function moveStage(u: Staff, entryId: string, stage: Stage) {
  if (!PIPELINE_STAGES.includes(stage)) throw new ApiError(400, "Etapa no vàlida.");
  const e = get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE id = ? AND club_id = ?", entryId, u.club_id);
  if (!e) throw new ApiError(404, "Entrada no trobada.");
  if (!can.seeTeam(u, e.team_id)) throw new ApiError(403, "Aquest jugador pertany a un altre equip del club.");
  if (e.stage === stage) return e;
  const club = mustClub(u.club_id);
  tx(() => {
    run("UPDATE pipeline_entries SET stage = ?, updated_at = ? WHERE id = ?", stage, nowIso(), entryId);
    logActivity(u.club_id, e.player_id, entryId, u.id, "etapa", `Etapa: ${STAGE_LABEL[e.stage]} → ${STAGE_LABEL[stage]}`, e.stage, stage);
    syncApplication(u.club_id, e.player_id, stage, club.name);
  });
  return { ...e, stage };
}

export function removeFromPipeline(u: Staff, entryId: string) {
  const e = get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE id = ? AND club_id = ?", entryId, u.club_id);
  if (!e) throw new ApiError(404, "Entrada no trobada.");
  if (!can.seeTeam(u, e.team_id)) throw new ApiError(403, "No pots modificar aquest seguiment.");
  run("DELETE FROM pipeline_entries WHERE id = ?", entryId);
  logActivity(u.club_id, e.player_id, null, u.id, "retirat", "Retirat del pipeline");
}

export function logInteraction(u: Staff, playerId: string, text: string) {
  assertPlayerVisible(u, playerId, "pipeline.interaction");
  const e = get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE club_id = ? AND player_id = ?", u.club_id, playerId);
  if (e && !can.seeTeam(u, e.team_id)) throw new ApiError(403, "No pots registrar interaccions d'aquest jugador.");
  logActivity(u.club_id, playerId, e?.id ?? null, u.id, "interaccio", text);
}

// ─── Visites al perfil ────────────────────────────────────────────────────────
export function recordProfileView(u: Staff, playerId: string) {
  const p = playerRow(playerId);
  if (!p || p.club_id === u.club_id) return;
  const recent = get("SELECT id FROM profile_views WHERE club_id = ? AND player_id = ? AND created_at > ?", u.club_id, playerId, new Date(Date.now() - 12 * 3600000).toISOString());
  if (!recent) insert("profile_views", { id: uid("pv_"), club_id: u.club_id, player_id: playerId, viewer_user_id: u.id, created_at: nowIso() });
  // una candidatura "enviada" passa a "vista" quan el club obre el perfil
  const apps = all<{ id: string; title: string }>("SELECT a.id, o.title FROM applications a JOIN offers o ON o.id = a.offer_id WHERE o.club_id = ? AND a.player_id = ? AND a.status = 'enviada'", u.club_id, playerId);
  if (apps.length) {
    const club = mustClub(u.club_id);
    for (const a of apps) {
      run("UPDATE applications SET status = 'vista', updated_at = ? WHERE id = ?", nowIso(), a.id);
      notifyPlayer(p, "application", `${club.name} ha vist el teu perfil`, `Sol·licitud «${a.title}».`, "/jugador/seguiment");
    }
  }
}

// ─── Candidatures ─────────────────────────────────────────────────────────────
export function applyToOffer(u: SessionUser & { player_id: string }, offerId: string, message: string | null) {
  const o = offerRow(offerId);
  if (!o || o.status !== "oberta") throw new ApiError(404, "Aquesta oportunitat ja no està oberta.");
  const p = mustPlayer(u.player_id);
  if (p.gender !== o.gender) throw new ApiError(400, "Aquesta oportunitat és per a un altre equip.");
  if (get("SELECT id FROM blocks WHERE player_id = ? AND club_id = ?", p.id, o.club_id)) throw new ApiError(400, "Has bloquejat aquest club.");
  const exists = get<{ id: string }>("SELECT id FROM applications WHERE offer_id = ? AND player_id = ?", offerId, p.id);
  if (exists) throw new ApiError(409, "Ja t'hi has inscrit.");
  const ctx = playerCtx();
  const m = computeMatch(toMatchPlayer(p, ctx.prev.get(p.id), ctx.career.get(p.id) ?? 0), toMatchOffer(o), ctx.now);
  const id = uid("ap_");
  const now = nowIso();
  insert("applications", { id, offer_id: offerId, player_id: p.id, origin: "jugador", status: "enviada", message: message?.trim() || null, match_score: m.score, created_at: now, updated_at: now });
  notifyClub(o.club_id, o.team_id, "application", `Nova sol·licitud a «${o.title}»`, `${p.first_name} ${p.last_name} · ${m.score}% compatible.`, `/club/oportunitats/${offerId}?tab=sollicituds`);
  return { id, score: m.score };
}

export function withdrawApplication(u: SessionUser & { player_id: string }, applicationId: string) {
  const a = get<{ id: string; status: string }>("SELECT id, status FROM applications WHERE id = ? AND player_id = ?", applicationId, u.player_id);
  if (!a) throw new ApiError(404, "Sol·licitud no trobada.");
  run("UPDATE applications SET status = 'tancat', updated_at = ? WHERE id = ?", nowIso(), a.id);
}

/** El club rebutja una candidatura (sense afegir al pipeline). */
export function rejectApplication(u: Staff, applicationId: string) {
  const a = get<{ id: string; player_id: string; club_id: string; team_id: string | null; title: string }>("SELECT a.id, a.player_id, o.club_id, o.team_id, o.title FROM applications a JOIN offers o ON o.id = a.offer_id WHERE a.id = ?", applicationId);
  if (!a || a.club_id !== u.club_id) throw new ApiError(404, "Sol·licitud no trobada.");
  if (!can.seeTeam(u, a.team_id)) throw new ApiError(403, "Aquesta oportunitat és d'un altre equip.");
  run("UPDATE applications SET status = 'rebutjat', updated_at = ? WHERE id = ?", nowIso(), a.id);
  const p = playerRow(a.player_id);
  if (p) notifyPlayer(p, "application", "Actualització d'una sol·licitud", `El club ha decidit no continuar amb «${a.title}». Ànims: hi ha més oportunitats per a tu.`, "/jugador/seguiment");
  const e = get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE club_id = ? AND player_id = ?", u.club_id, a.player_id);
  if (e) moveStage(u, e.id, "rebutjat");
}

// ─── Contactes ────────────────────────────────────────────────────────────────
export function sendContactRequest(u: Staff, playerId: string, input: { reason: string; message: string; teamId?: string | null }) {
  const p = assertPlayerVisible(u, playerId, "contact.request");
  const club = mustClub(u.club_id);
  const rel = clubRelations(u.club_id);
  const check = clubCanContact(p, club, rel);
  if (!check.ok) throw new ApiError(400, check.reason ?? "No es pot contactar aquest jugador.");
  const teamId = input.teamId ?? (can.allTeams(u) ? null : u.team_id);
  assertTeam(u, teamId);
  const id = uid("cr_");
  const status = check.needsGuardian ? "pendent_tutor" : "pendent";
  tx(() => {
    insert("contact_requests", { id, club_id: u.club_id, player_id: playerId, team_id: teamId, from_user_id: u.id, reason: input.reason, message: input.message, status, conversation_id: null, created_at: nowIso(), responded_at: null, guardian_decided_at: null });
    let e = get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE club_id = ? AND player_id = ?", u.club_id, playerId);
    if (!e) e = addToPipeline(u, playerId, { teamId, stage: "contactat" });
    else if (PIPELINE_STAGES.indexOf(e.stage) < PIPELINE_STAGES.indexOf("contactat")) moveStage(u, e.id, "contactat");
    logActivity(u.club_id, playerId, e.id, u.id, "contacte", check.needsGuardian ? "Sol·licitud de contacte enviada (pendent del tutor legal)" : "Sol·licitud de contacte enviada");
  });
  audit({ actor: u, action: "contact.request", entity: { type: "player", id: playerId }, detail: status });
  if (check.needsGuardian) {
    notify(p.guardian_user_id, "contact", `${club.name} vol contactar amb ${p.first_name}.`, "Cal la teva autorització abans que el club pugui escriure-li.", "/tutor");
  } else {
    notifyPlayer(p, "contact", "Nova sol·licitud de contacte", `${club.name} vol parlar amb tu.`, "/jugador/missatges");
  }
  return { id, status };
}

function openConversationFor(req: { id: string; club_id: string; player_id: string; team_id: string | null; message: string; from_user_id: string; reason: string }) {
  const existing = get<{ id: string }>("SELECT id FROM conversations WHERE club_id = ? AND player_id = ?", req.club_id, req.player_id);
  if (existing) return existing.id;
  const id = uid("cv_");
  const now = nowIso();
  const subject = { oferta: "Interès per una oportunitat", prova: "Invitació a una prova", seguiment: "Seguiment", informacio: "Sol·licitud d'informació" }[req.reason] ?? "Conversa";
  insert("conversations", { id, club_id: req.club_id, player_id: req.player_id, team_id: req.team_id, subject, status: "activa", created_at: now, last_message_at: now });
  insert("messages", { id: uid("m_"), conversation_id: id, sender_user_id: req.from_user_id, sender_side: "club", body: req.message, flagged: 0, created_at: now, read_by_club_at: now, read_by_player_at: null });
  return id;
}

export function respondContactAsPlayer(u: SessionUser & { player_id: string }, requestId: string, accept: boolean) {
  const r = get<{ id: string; club_id: string; player_id: string; team_id: string | null; message: string; from_user_id: string; reason: string; status: string }>("SELECT * FROM contact_requests WHERE id = ? AND player_id = ?", requestId, u.player_id);
  if (!r) throw new ApiError(404, "Sol·licitud no trobada.");
  if (r.status !== "pendent") throw new ApiError(400, "Aquesta sol·licitud ja s'ha respost.");
  const p = mustPlayer(u.player_id);
  let conversationId: string | null = null;
  tx(() => {
    if (accept) {
      conversationId = openConversationFor(r);
      run("UPDATE contact_requests SET status = 'acceptada', responded_at = ?, conversation_id = ? WHERE id = ?", nowIso(), conversationId, r.id);
      const e = get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE club_id = ? AND player_id = ?", r.club_id, r.player_id);
      if (e && PIPELINE_STAGES.indexOf(e.stage) < PIPELINE_STAGES.indexOf("en_conversa")) {
        run("UPDATE pipeline_entries SET stage = 'en_conversa', updated_at = ? WHERE id = ?", nowIso(), e.id);
        logActivity(r.club_id, r.player_id, e.id, u.id, "etapa", `Etapa: ${STAGE_LABEL[e.stage]} → En conversa (el jugador ha acceptat)`, e.stage, "en_conversa");
      }
      run("UPDATE applications SET status = 'contacte', updated_at = ? WHERE player_id = ? AND offer_id IN (SELECT id FROM offers WHERE club_id = ?) AND status IN ('enviada','vista')", nowIso(), r.player_id, r.club_id);
    } else {
      run("UPDATE contact_requests SET status = 'rebutjada', responded_at = ? WHERE id = ?", nowIso(), r.id);
    }
  });
  notifyClub(r.club_id, r.team_id, "contact", accept ? "Un jugador ha acceptat la teva sol·licitud." : "Un jugador ha rebutjat la teva sol·licitud.", `${p.first_name} ${p.last_name}`, accept && conversationId ? `/club/missatges/${conversationId}` : `/club/jugadors/${p.id}`);
  return { conversationId };
}

export function respondContactAsGuardian(u: SessionUser, requestId: string, accept: boolean) {
  if (u.role !== "guardian" || !u.player_id) throw new ApiError(403, "Només el tutor legal pot autoritzar aquest contacte.");
  const r = get<{ id: string; club_id: string; player_id: string; team_id: string | null; message: string; from_user_id: string; reason: string; status: string }>("SELECT * FROM contact_requests WHERE id = ? AND player_id = ?", requestId, u.player_id);
  if (!r) throw new ApiError(404, "Sol·licitud no trobada.");
  if (r.status !== "pendent_tutor") throw new ApiError(400, "Aquesta sol·licitud ja s'ha resolt.");
  const p = mustPlayer(u.player_id);
  let conversationId: string | null = null;
  tx(() => {
    if (accept) {
      conversationId = openConversationFor(r);
      insert("messages", { id: uid("m_"), conversation_id: conversationId, sender_user_id: u.id, sender_side: "system", body: `${u.name} (tutora legal) ha autoritzat aquest contacte. La tutora pot consultar la conversa en qualsevol moment.`, flagged: 0, created_at: nowIso(), read_by_club_at: null, read_by_player_at: null });
      run("UPDATE contact_requests SET status = 'acceptada', guardian_decided_at = ?, responded_at = ?, conversation_id = ? WHERE id = ?", nowIso(), nowIso(), conversationId, r.id);
      const e = get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE club_id = ? AND player_id = ?", r.club_id, r.player_id);
      if (e && PIPELINE_STAGES.indexOf(e.stage) < PIPELINE_STAGES.indexOf("en_conversa")) {
        run("UPDATE pipeline_entries SET stage = 'en_conversa', updated_at = ? WHERE id = ?", nowIso(), e.id);
        logActivity(r.club_id, r.player_id, e.id, u.id, "etapa", "Etapa: Contactat → En conversa (autoritzat pel tutor)", e.stage, "en_conversa");
      }
    } else {
      run("UPDATE contact_requests SET status = 'rebutjada', guardian_decided_at = ?, responded_at = ? WHERE id = ?", nowIso(), nowIso(), r.id);
    }
  });
  notifyClub(r.club_id, r.team_id, "contact", accept ? `El tutor de ${p.first_name} ha autoritzat el contacte.` : `El tutor de ${p.first_name} no ha autoritzat el contacte.`, null, accept && conversationId ? `/club/missatges/${conversationId}` : `/club/jugadors/${p.id}`);
  return { conversationId };
}

export function cancelContactRequest(u: Staff, requestId: string) {
  const r = get<{ id: string; status: string; team_id: string | null }>("SELECT id, status, team_id FROM contact_requests WHERE id = ? AND club_id = ?", requestId, u.club_id);
  if (!r) throw new ApiError(404, "Sol·licitud no trobada.");
  if (!can.seeTeam(u, r.team_id)) throw new ApiError(403, "No pots cancel·lar aquesta sol·licitud.");
  if (!["pendent", "pendent_tutor"].includes(r.status)) throw new ApiError(400, "Ja no es pot cancel·lar.");
  run("UPDATE contact_requests SET status = 'cancel_lada', responded_at = ? WHERE id = ?", nowIso(), r.id);
}

// ─── Missatges ────────────────────────────────────────────────────────────────
const RISKY = /(\b\d{3}[\s.-]?\d{3}[\s.-]?\d{3}\b|@[a-z0-9.-]+\.[a-z]{2,}|whats\s?app|instagram|telegram|el meu número|mi número|m[oò]bil)/i;

export type ConversationRow = { id: string; club_id: string; player_id: string; team_id: string | null; subject: string; status: string; created_at: string; last_message_at: string };

export function conversationFor(u: SessionUser, conversationId: string): { conv: ConversationRow; side: "club" | "player" | "guardian" } {
  const conv = get<ConversationRow>("SELECT * FROM conversations WHERE id = ?", conversationId);
  if (!conv) throw new ApiError(404, "Conversa no trobada.");
  if (isClubRole(u.role) && conv.club_id === u.club_id) {
    if (!can.seeTeam(u, conv.team_id)) throw new ApiError(403, "Aquesta conversa és d'un altre equip del club.");
    return { conv, side: "club" };
  }
  if (u.role === "player" && conv.player_id === u.player_id) return { conv, side: "player" };
  if (u.role === "guardian" && conv.player_id === u.player_id) return { conv, side: "guardian" };
  throw new ApiError(403, "No tens accés a aquesta conversa.");
}

export function sendMessage(u: SessionUser, conversationId: string, body: string) {
  const { conv, side } = conversationFor(u, conversationId);
  if (side === "guardian") throw new ApiError(403, "El tutor pot llegir la conversa però no escriure-hi.");
  if (conv.status === "tancada") throw new ApiError(403, "Aquesta conversa està tancada.");
  const text = body.trim();
  if (!text) throw new ApiError(400, "El missatge és buit.");
  if (text.length > 2000) throw new ApiError(400, "El missatge és massa llarg.");
  const p = mustPlayer(conv.player_id);
  if (side === "club" && get("SELECT id FROM blocks WHERE player_id = ? AND club_id = ?", conv.player_id, conv.club_id)) throw new ApiError(403, "El jugador ha bloquejat el club.");
  const flagged = RISKY.test(text) ? 1 : 0;
  const now = nowIso();
  const id = uid("m_");
  insert("messages", { id, conversation_id: conv.id, sender_user_id: u.id, sender_side: side, body: text, flagged, created_at: now, read_by_club_at: side === "club" ? now : null, read_by_player_at: side === "player" ? now : null });
  run("UPDATE conversations SET last_message_at = ? WHERE id = ?", now, conv.id);
  if (side === "club") {
    const club = mustClub(conv.club_id);
    notifyPlayer(p, "message", `Nou missatge de ${club.name}`, text.slice(0, 90), "/jugador/missatges?c=" + conv.id);
  } else {
    notifyClub(conv.club_id, conv.team_id, "message", `Nou missatge de ${p.first_name} ${p.last_name}`, text.slice(0, 90), `/club/missatges/${conv.id}`);
  }
  return { id, flagged: !!flagged, minor: isMinor(p.birth_date) };
}

export function markConversationRead(u: SessionUser, conversationId: string) {
  const { conv, side } = conversationFor(u, conversationId);
  const now = nowIso();
  if (side === "club") run("UPDATE messages SET read_by_club_at = ? WHERE conversation_id = ? AND read_by_club_at IS NULL", now, conv.id);
  if (side === "player") run("UPDATE messages SET read_by_player_at = ? WHERE conversation_id = ? AND read_by_player_at IS NULL", now, conv.id);
}

export function addSystemMessage(conversationId: string, userId: string, body: string) {
  const now = nowIso();
  insert("messages", { id: uid("m_"), conversation_id: conversationId, sender_user_id: userId, sender_side: "system", body, flagged: 0, created_at: now, read_by_club_at: now, read_by_player_at: null });
  run("UPDATE conversations SET last_message_at = ? WHERE id = ?", now, conversationId);
}

// ─── Esdeveniments ───────────────────────────────────────────────────────────
export function createEvent(u: SessionUser, input: { kind: string; title: string; starts_at: string; duration: number; team_id?: string | null; related_player_id?: string | null; location?: string | null; notes?: string | null; conversation_id?: string | null }) {
  const start = new Date(input.starts_at);
  if (isNaN(start.getTime())) throw new ApiError(400, "Data no vàlida.");
  const end = new Date(start.getTime() + Math.max(15, input.duration) * 60000);
  const id = uid("ev_");
  if (isClubRole(u.role) && u.club_id) {
    const staff = u as Staff;
    const teamId = input.team_id || (can.allTeams(u) ? null : u.team_id);
    assertTeam(staff, teamId);
    if (input.related_player_id) assertPlayerVisible(staff, input.related_player_id, "event.create");
    if (input.conversation_id) {
      // la conversa ha de ser d'aquest club, de l'àmbit de l'usuari i del mateix jugador
      const { conv, side } = conversationFor(u, input.conversation_id);
      if (side !== "club" || conv.player_id !== input.related_player_id) throw new ApiError(400, "La conversa no correspon a aquest jugador.");
    }
    insert("events", { id, club_id: staff.club_id, team_id: teamId, player_id: null, owner_user_id: u.id, kind: input.kind, title: input.title, starts_at: start.toISOString(), ends_at: end.toISOString(), location: input.location ?? null, opponent: null, notes: input.notes ?? null, related_player_id: input.related_player_id ?? null, created_at: nowIso() });
    // si és una prova o una trucada amb un jugador, també apareix al seu calendari i se li notifica
    if (input.related_player_id && (input.kind === "prova" || input.kind === "trucada" || input.kind === "reunio")) {
      const p = playerRow(input.related_player_id);
      const club = mustClub(staff.club_id);
      if (p) {
        insert("events", { id: uid("ev_"), club_id: null, team_id: null, player_id: p.id, owner_user_id: p.user_id, kind: input.kind, title: `${input.kind === "prova" ? "Prova" : input.kind === "trucada" ? "Videotrucada" : "Reunió"} amb ${club.name}`, starts_at: start.toISOString(), ends_at: end.toISOString(), location: input.location ?? null, opponent: null, notes: null /* les notes internes del club no es copien mai al calendari del jugador */, related_player_id: null, created_at: nowIso() });
        notifyPlayer(p, "event", `${club.name} ha programat: ${input.title}`, `${fmtDateTime(start)}${input.location ? ` · ${input.location}` : ""}`, "/jugador/calendari", isMinor(p.birth_date));
        if (input.conversation_id) addSystemMessage(input.conversation_id, u.id, `📅 ${input.kind === "trucada" ? "Videotrucada programada" : input.kind === "prova" ? "Prova programada" : "Reunió programada"}: ${new Intl.DateTimeFormat("ca-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(start)}${input.location ? ` · ${input.location}` : ""}`);
      }
    }
  } else if (u.role === "player") {
    insert("events", { id, club_id: null, team_id: null, player_id: u.player_id, owner_user_id: u.id, kind: input.kind, title: input.title, starts_at: start.toISOString(), ends_at: end.toISOString(), location: input.location ?? null, opponent: null, notes: input.notes ?? null, related_player_id: null, created_at: nowIso() });
  } else throw new ApiError(403, "No pots crear esdeveniments.");
  return { id };
}

export function deleteEvent(u: SessionUser, eventId: string) {
  const e = get<{ id: string; club_id: string | null; team_id: string | null; player_id: string | null; owner_user_id: string | null }>("SELECT * FROM events WHERE id = ?", eventId);
  if (!e) throw new ApiError(404, "Esdeveniment no trobat.");
  const ok = (u.role === "player" && e.player_id === u.player_id) || (isClubRole(u.role) && e.club_id === u.club_id && (can.allTeams(u) || e.owner_user_id === u.id || (!!e.team_id && e.team_id === u.team_id)));
  if (!ok) throw new ApiError(403, "No pots eliminar aquest esdeveniment.");
  run("DELETE FROM events WHERE id = ?", eventId);
}

// ─── Avaluacions, notes i informes ────────────────────────────────────────────
export function saveEvaluation(u: Staff, playerId: string, input: { scores: Record<string, Record<string, number>>; decision: string; comment: string; context?: string | null }) {
  assertPlayerVisible(u, playerId, "evaluation.save");
  const e = get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE club_id = ? AND player_id = ?", u.club_id, playerId);
  if (e && !can.seeTeam(u, e.team_id)) throw new ApiError(403, "Aquest jugador el segueix un altre equip.");
  const now = nowIso();
  const existing = get<{ id: string }>("SELECT id FROM evaluations WHERE club_id = ? AND player_id = ? AND author_user_id = ?", u.club_id, playerId, u.id);
  const context = input.context?.trim() || null;
  if (existing) update("evaluations", existing.id, { scores: input.scores, decision: input.decision, comment: input.comment, context, updated_at: now });
  else insert("evaluations", { id: uid("e_"), club_id: u.club_id, player_id: playerId, author_user_id: u.id, team_id: e?.team_id ?? u.team_id ?? null, scores: input.scores, decision: input.decision, comment: input.comment, context, created_at: now, updated_at: now });
  logActivity(u.club_id, playerId, e?.id ?? null, u.id, "avaluacio", "Avaluació guardada");
}

export function addNote(u: Staff, playerId: string, body: string) {
  assertPlayerVisible(u, playerId, "note.add");
  const text = body.trim();
  if (!text) throw new ApiError(400, "La nota és buida.");
  const e = get<PipelineEntry>("SELECT * FROM pipeline_entries WHERE club_id = ? AND player_id = ?", u.club_id, playerId);
  insert("notes", { id: uid("n_"), club_id: u.club_id, player_id: playerId, author_user_id: u.id, team_id: e?.team_id ?? u.team_id ?? null, body: text, created_at: nowIso() });
}
export function deleteNote(u: Staff, noteId: string) {
  const n = get<{ id: string; author_user_id: string; club_id: string }>("SELECT * FROM notes WHERE id = ?", noteId);
  if (!n || n.club_id !== u.club_id) throw new ApiError(404, "Nota no trobada.");
  if (n.author_user_id !== u.id && !can.manageUsers(u)) throw new ApiError(403, "Només pots eliminar les teves notes.");
  run("DELETE FROM notes WHERE id = ?", noteId);
}

export function createScoutReport(u: Staff, input: { player_id: string; match_title: string; match_date: string; competition?: string | null; position_observed?: string | null; rating: number; observations: string; recommendation: string; reminder_at?: string | null }) {
  assertPlayerVisible(u, input.player_id, "report.create");
  const id = uid("sr_");
  insert("scout_reports", { id, club_id: u.club_id, author_user_id: u.id, team_id: u.team_id ?? null, player_id: input.player_id, match_title: input.match_title, match_date: input.match_date, competition: input.competition ?? null, position_observed: input.position_observed ?? null, rating: input.rating, observations: input.observations, recommendation: input.recommendation, reminder_at: input.reminder_at ?? null, created_at: nowIso() });
  logActivity(u.club_id, input.player_id, null, u.id, "informe", `Informe de scouting: ${input.match_title}`);
  if (input.reminder_at) {
    const p = playerRow(input.player_id)!;
    insert("events", { id: uid("ev_"), club_id: u.club_id, team_id: u.team_id ?? null, player_id: null, owner_user_id: u.id, kind: "recordatori", title: `Recordatori: revisar ${p.first_name} ${p.last_name}`, starts_at: input.reminder_at, ends_at: new Date(new Date(input.reminder_at).getTime() + 15 * 60000).toISOString(), location: null, opponent: null, notes: input.observations.slice(0, 200), related_player_id: p.id, created_at: nowIso() });
  }
  return { id };
}

// ─── Favorits ─────────────────────────────────────────────────────────────────
export function toggleFavorite(u: SessionUser, type: "player" | "offer" | "club", targetId: string): boolean {
  // el destí ha d'existir i ser accessible per a qui el desa
  if (type === "player") {
    if (!isClubRole(u.role) || !u.club_id) throw new ApiError(403, "Només el club pot desar jugadors.");
    assertPlayerVisible(u as Staff, targetId, "player.save");
  } else if (type === "offer") {
    const o = offerRow(targetId);
    if (!o || (o.status !== "oberta" && o.club_id !== u.club_id)) throw new ApiError(404, "Oportunitat no trobada.");
  } else if (!clubById(targetId)) throw new ApiError(404, "Club no trobat.");
  const f = get<{ id: string }>("SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?", u.id, type, targetId);
  if (f) {
    run("DELETE FROM favorites WHERE id = ?", f.id);
    if (type === "player" && u.club_id) logActivity(u.club_id, targetId, null, u.id, "desat", "Tret de la llista de guardats");
    return false;
  }
  insert("favorites", { id: uid("f_"), user_id: u.id, target_type: type, target_id: targetId, created_at: nowIso() });
  if (type === "player" && u.club_id) {
    logActivity(u.club_id, targetId, null, u.id, "desat", "Guardat a la llista del club");
    const p = playerRow(targetId);
    const club = clubById(u.club_id);
    if (p && club) notifyPlayer(p, "interest", "Un club t'ha desat com a favorit.", `${club.name} segueix el teu perfil.`, "/jugador/seguiment");
  }
  return true;
}

// ─── Seguretat ────────────────────────────────────────────────────────────────
export function blockClub(u: SessionUser & { player_id: string }, clubId: string, blocked: boolean) {
  mustClub(clubId);
  if (blocked) {
    if (!get("SELECT id FROM blocks WHERE player_id = ? AND club_id = ?", u.player_id, clubId)) insert("blocks", { id: uid("b_"), player_id: u.player_id, club_id: clubId, created_at: nowIso() });
    run("UPDATE contact_requests SET status = 'rebutjada', responded_at = ? WHERE player_id = ? AND club_id = ? AND status IN ('pendent','pendent_tutor')", nowIso(), u.player_id, clubId);
  } else run("DELETE FROM blocks WHERE player_id = ? AND club_id = ?", u.player_id, clubId);
}

export function reportTarget(u: SessionUser, input: { target_type: string; target_id: string; reason: string; details?: string | null }) {
  insert("reports", { id: uid("rp_"), reporter_user_id: u.id, target_type: input.target_type, target_id: input.target_id, reason: input.reason, details: input.details ?? null, status: "rebuda", created_at: nowIso() });
  notify(u.id, "system", "Hem rebut la teva denúncia", "L'equip de moderació la revisarà (a la demo, simulat) i et respondrà per aquí.", null);
}

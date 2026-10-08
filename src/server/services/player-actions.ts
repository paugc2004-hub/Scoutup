import { z } from "zod";
import { get, insert, nowIso, run, uid, update } from "@/server/db/client";
import { ApiError } from "@/server/api";
import type { SessionUser } from "@/server/auth/session";
import { completenessItems, completenessScore } from "@/lib/completeness";
import type { CompletenessInput } from "@/lib/completeness";
import { ATTRS, POSITIONS, DEFAULT_PRIVACY, DEFAULT_PREFERENCES, categoryForBirthYear, currentSeasonStartYear, isMinor, seasonId } from "@/lib/domain";
import { placeByCity } from "@/lib/geo";
import { playerRow, privacyOf, preferencesOf, secondaryOf } from "@/server/services/players";
import { notify } from "@/server/services/notify";
import { zIsoDate, zText } from "@/server/validation";

type Me = SessionUser & { player_id: string };

export function completenessInput(playerId: string): CompletenessInput {
  const p = playerRow(playerId)!;
  const start = currentSeasonStartYear();
  const count = (sql: string) => get<{ n: number }>(sql, playerId)?.n ?? 0;
  const prefs = preferencesOf(p);
  return {
    first_name: p.first_name, last_name: p.last_name, birth_date: p.birth_date, city: p.city, primary_position: p.primary_position, foot: p.foot,
    secondary_positions: secondaryOf(p), height_cm: p.height_cm, description: p.description, style: p.style, languages: p.languages, availability: p.availability,
    careerCount: count("SELECT COUNT(*) AS n FROM player_career WHERE player_id = ?"),
    prevStats: !!get("SELECT id FROM player_stats WHERE player_id = ? AND season_id = ?", playerId, seasonId(start - 1)),
    currentStats: !!get("SELECT id FROM player_stats WHERE player_id = ? AND season_id = ?", playerId, seasonId(start)),
    videoCount: count("SELECT COUNT(*) AS n FROM videos WHERE player_id = ?"),
    achievementCount: count("SELECT COUNT(*) AS n FROM achievements WHERE player_id = ?"),
    preferencesSet: prefs.categories.length > 0 || prefs.interests.length > 0,
    privacyReviewed: !!p.privacy,
  };
}
export function completenessOf(playerId: string) {
  const inp = completenessInput(playerId);
  return { score: completenessScore(inp), items: completenessItems(inp) };
}
export function recompute(playerId: string) {
  const { score } = completenessOf(playerId);
  run("UPDATE players SET completeness = ?, updated_at = ? WHERE id = ?", score, nowIso(), playerId);
  return score;
}

export const ProfilePatch = z.object({
  first_name: zText(40, 2).optional(),
  last_name: zText(60, 2).optional(),
  birth_date: zIsoDate.optional(),
  city: zText(60).optional(),
  nationality: zText(60).optional(),
  languages: zText(120).optional(),
  primary_position: z.enum(POSITIONS).optional(),
  secondary_positions: z.array(z.enum(POSITIONS)).max(3).optional(),
  foot: z.enum(["dret", "esquerre", "ambdues"]).optional(),
  height_cm: z.number().int().min(140).max(215).nullable().optional(),
  style: zText(120).optional(),
  description: zText(800).optional(),
  club_name_free: zText(80).optional(),
  division_rank: z.number().int().min(1).max(5).optional(),
  availability: z.enum(["obert", "escoltant", "no_disponible"]).optional(),
  available_from: zIsoDate.nullable().optional(),
  contract_status: z.enum(["amb_fitxa", "final_temporada", "lliure"]).optional(),
  attrs: z.record(z.enum([...ATTRS, "reflexos", "sortides"]), z.number().min(1).max(10)).optional(),
  preferences: z.object({ categories: z.array(zText(30)).max(6), maxKm: z.number().int().min(5).max(200), interests: z.array(zText(40)).max(8), levelMin: z.number().int().min(1).max(5).nullable(), notes: zText(400) }).optional(),
  privacy: z.object({
    profile: z.enum(["tots", "verificats", "contactats", "ocult"]), videos: z.enum(["tots", "verificats", "contactats"]), contact: z.enum(["tots", "verificats", "ningu"]),
    showStats: z.boolean(), showHeight: z.boolean(), location: z.enum(["ciutat", "comarca", "provincia"]), notifyEmail: z.boolean(),
  }).optional(),
  onboarding_done: z.boolean().optional(),
}).strict();

export function patchProfile(u: Me, d: z.infer<typeof ProfilePatch>) {
  const p = playerRow(u.player_id);
  if (!p) throw new ApiError(404, "Perfil no trobat.");
  const patch: Record<string, unknown> = {};
  for (const k of ["first_name", "last_name", "nationality", "languages", "primary_position", "foot", "height_cm", "style", "description", "club_name_free", "division_rank", "availability", "available_from", "contract_status"] as const) {
    if (d[k] !== undefined) patch[k] = d[k];
  }
  if (d.birth_date) {
    patch.birth_date = d.birth_date;
    const cat = categoryForBirthYear(Number(d.birth_date.slice(0, 4)), currentSeasonStartYear());
    patch.category = cat === "Infantil" ? "Cadet" : cat;
  }
  if (d.city) {
    const pl = placeByCity(d.city);
    if (!pl) throw new ApiError(400, "Municipi no disponible a la demo.");
    Object.assign(patch, { city: pl.city, comarca: pl.comarca, province: pl.province, lat: pl.lat, lng: pl.lng });
  }
  if (d.secondary_positions) patch.secondary_positions = JSON.stringify(d.secondary_positions.filter((x) => x !== (d.primary_position ?? p.primary_position)));
  if (d.attrs) patch.attrs = JSON.stringify({ ...JSON.parse(p.attrs), ...d.attrs });
  if (d.preferences) patch.preferences = JSON.stringify({ ...DEFAULT_PREFERENCES, ...d.preferences });
  if (d.privacy) {
    const minor = isMinor(d.birth_date ?? p.birth_date);
    const pr = { ...DEFAULT_PRIVACY, ...d.privacy };
    if (minor && pr.profile === "tots") pr.profile = "verificats";
    if (minor && pr.contact === "tots") pr.contact = "verificats";
    patch.privacy = JSON.stringify(pr);
  }
  if (d.onboarding_done !== undefined) patch.onboarding_done = d.onboarding_done ? 1 : 0;
  if (p.verification === "verified" && (d.division_rank !== undefined || d.club_name_free !== undefined)) patch.verification = "updated";
  patch.updated_at = nowIso();
  update("players", p.id, patch);
  const score = recompute(p.id);
  return { completeness: score };
}

export function addVideo(u: Me, d: { title: string; kind: string; duration_s: number }) {
  insert("videos", { id: uid("v_"), player_id: u.player_id, title: d.title, kind: d.kind, duration_s: d.duration_s, recorded_at: nowIso(), views: 0 });
  return recompute(u.player_id);
}
export function deleteVideo(u: Me, id: string) {
  run("DELETE FROM videos WHERE id = ? AND player_id = ?", id, u.player_id);
  return recompute(u.player_id);
}
export function upsertStats(u: Me, d: { season_id: string; team_name: string | null; matches: number; starts: number; minutes: number; goals: number; assists: number; yellow: number; red: number; callups: number; clean_sheets: number }) {
  if (d.starts > d.matches) throw new ApiError(400, "Les titularitats no poden superar els partits jugats.");
  if (d.matches > d.callups && d.callups > 0) throw new ApiError(400, "Els partits jugats no poden superar les convocatòries.");
  const ex = get<{ id: string }>("SELECT id FROM player_stats WHERE player_id = ? AND season_id = ?", u.player_id, d.season_id);
  if (ex) update("player_stats", ex.id, { ...d, verification: "updated", updated_at: nowIso() });
  else insert("player_stats", { id: uid("ps_"), player_id: u.player_id, ...d, verification: "self", updated_at: nowIso() });
  return recompute(u.player_id);
}
export function addCareer(u: Me, d: { season_label: string; club_name: string; team_name: string; category: string; division: string; role: string }) {
  const n = get<{ n: number }>("SELECT COUNT(*) AS n FROM player_career WHERE player_id = ?", u.player_id)?.n ?? 0;
  insert("player_career", { id: uid("pc_"), player_id: u.player_id, ...d, club_id: null, verification: "self", sort: n });
  return recompute(u.player_id);
}
export function deleteCareer(u: Me, id: string) {
  run("DELETE FROM player_career WHERE id = ? AND player_id = ?", id, u.player_id);
  return recompute(u.player_id);
}
export function addAchievement(u: Me, d: { title: string; season_label: string | null }) {
  insert("achievements", { id: uid("a_"), player_id: u.player_id, title: d.title, season_label: d.season_label, kind: "esportiu" });
  return recompute(u.player_id);
}
export function deleteAchievement(u: Me, id: string) {
  run("DELETE FROM achievements WHERE id = ? AND player_id = ?", id, u.player_id);
  return recompute(u.player_id);
}

// ─── Tutor legal ──────────────────────────────────────────────────────────────
export function setGuardianConsent(u: SessionUser, consent: boolean) {
  if (u.role !== "guardian" || !u.player_id) throw new ApiError(403, "Només el tutor legal pot fer aquesta acció.");
  run("UPDATE players SET guardian_consent = ?, updated_at = ? WHERE id = ?", consent ? 1 : 0, nowIso(), u.player_id);
  const p = playerRow(u.player_id)!;
  notify(p.user_id, "system", consent ? "El teu tutor ha activat la visibilitat del perfil" : "El teu tutor ha desactivat la visibilitat del perfil", consent ? "Els clubs verificats ja poden veure el teu perfil." : "Els clubs no poden veure el teu perfil fins que es torni a activar.", "/jugador/privacitat");
}
export function revokeClub(u: SessionUser, clubId: string) {
  if (u.role !== "guardian" || !u.player_id) throw new ApiError(403, "Només el tutor legal pot fer aquesta acció.");
  if (!get("SELECT id FROM blocks WHERE player_id = ? AND club_id = ?", u.player_id, clubId)) insert("blocks", { id: uid("b_"), player_id: u.player_id, club_id: clubId, created_at: nowIso() });
  run("UPDATE conversations SET status = 'tancada' WHERE player_id = ? AND club_id = ?", u.player_id, clubId);
}
export function guardianPrivacy(u: SessionUser, privacy: Record<string, unknown>) {
  if (u.role !== "guardian" || !u.player_id) throw new ApiError(403, "Només el tutor legal pot fer aquesta acció.");
  const p = playerRow(u.player_id)!;
  const cur = privacyOf(p);
  const next = { ...cur, ...privacy };
  if (next.profile === "tots") next.profile = "verificats";
  if (next.contact === "tots") next.contact = "verificats";
  run("UPDATE players SET privacy = ?, updated_at = ? WHERE id = ?", JSON.stringify(next), nowIso(), u.player_id);
}

import { all, get, parseJson } from "@/server/db/client";
import { computeMatch } from "@/lib/matching";
import type { MatchOffer, MatchResult } from "@/lib/matching";
import type { Stage } from "@/lib/domain";
import { allPlayerRows, playerCtx, presentPlayer, toMatchPlayer } from "@/server/services/players";
import type { PlayerCtx, PlayerRow, PlayerView } from "@/server/services/players";
import { clubCanSee, clubRelations } from "@/server/services/access";

export type OfferRow = {
  id: string; club_id: string; team_id: string | null; kind: string; title: string; position: string; accepts_secondary: number;
  category: string; gender: string; birth_year_min: number; birth_year_max: number; level_min: number; zone_city: string;
  zone_lat: number; zone_lng: number; max_km: number; foot: string; height_min: number | null; traits: string | null;
  availability_req: string | null; description: string | null; restrictions: string | null; trial_date: string | null;
  status: string; created_by: string | null; created_at: string; expires_at: string | null;
  club_name: string; club_short: string; club_initials: string; club_color: string; club_verified: number; club_city: string; team_name: string | null;
};

const OFFER_SELECT = `SELECT o.*, c.name AS club_name, c.short_name AS club_short, c.initials AS club_initials, c.color_primary AS club_color,
  c.verified AS club_verified, c.city AS club_city, t.name AS team_name
  FROM offers o JOIN clubs c ON c.id = o.club_id LEFT JOIN teams t ON t.id = o.team_id`;

export function offerRow(id: string): OfferRow | undefined {
  return get<OfferRow>(`${OFFER_SELECT} WHERE o.id = ?`, id);
}
export function clubOffers(clubId: string): OfferRow[] {
  return all<OfferRow>(`${OFFER_SELECT} WHERE o.club_id = ? ORDER BY CASE o.status WHEN 'oberta' THEN 0 WHEN 'pausada' THEN 1 ELSE 2 END, o.created_at DESC`, clubId);
}
export function openOffers(): OfferRow[] {
  return all<OfferRow>(`${OFFER_SELECT} WHERE o.status = 'oberta' ORDER BY o.created_at DESC`);
}
export function traitsOf(o: Pick<OfferRow, "traits">): string[] {
  return parseJson<string[]>(o.traits, []);
}
export function toMatchOffer(o: OfferRow): MatchOffer {
  return {
    position: o.position, accepts_secondary: !!o.accepts_secondary, gender: o.gender, birth_year_min: o.birth_year_min,
    birth_year_max: o.birth_year_max, level_min: o.level_min, zone_city: o.zone_city, zone_lat: o.zone_lat, zone_lng: o.zone_lng,
    max_km: o.max_km, foot: o.foot, height_min: o.height_min, traits: traitsOf(o), availability_req: o.availability_req,
  };
}

export type Candidate = { player: PlayerView; match: MatchResult; stage: Stage | null; application: { id: string; status: string; created_at: string; message: string | null } | null; km: number };

/** Candidats per a una oferta (o per a una "oferta virtual" de la cerca intel·ligent), ordenats per compatibilitat. */
export function rankCandidates(offer: MatchOffer, club: { id: string; verified: number }, opts: { ctx?: PlayerCtx; minScore?: number; offerId?: string; limit?: number } = {}): Candidate[] {
  const ctx = opts.ctx ?? playerCtx();
  const rel = clubRelations(club.id);
  const stages = new Map(all<{ player_id: string; stage: Stage }>("SELECT player_id, stage FROM pipeline_entries WHERE club_id = ?", club.id).map((r) => [r.player_id, r.stage]));
  const apps = opts.offerId ? new Map(all<{ id: string; player_id: string; status: string; created_at: string; message: string | null }>("SELECT id, player_id, status, created_at, message FROM applications WHERE offer_id = ?", opts.offerId).map((a) => [a.player_id, a])) : new Map();
  const out: Candidate[] = [];
  for (const p of allPlayerRows()) {
    if (p.club_id === club.id) continue;
    if (p.gender !== offer.gender) continue;
    if (!clubCanSee(p, club, rel, ctx.now).visible) continue;
    const m = computeMatch(toMatchPlayer(p, ctx.prev.get(p.id), ctx.career.get(p.id) ?? 0), offer, ctx.now);
    if (opts.minScore && m.score < opts.minScore) continue;
    const a = apps.get(p.id);
    out.push({ player: presentPlayer(p, ctx), match: m, stage: stages.get(p.id) ?? null, application: a ? { id: a.id, status: a.status, created_at: a.created_at, message: a.message } : null, km: m.distanceKm });
  }
  out.sort((a, b) => b.match.score - a.match.score || a.km - b.km);
  return opts.limit ? out.slice(0, opts.limit) : out;
}

export function offerStats(offerIds: string[]): Map<string, { total: number; nous: number }> {
  if (!offerIds.length) return new Map();
  const rows = all<{ offer_id: string; total: number; nous: number }>(
    `SELECT offer_id, COUNT(*) AS total, SUM(CASE WHEN status = 'enviada' THEN 1 ELSE 0 END) AS nous FROM applications WHERE offer_id IN (${offerIds.map(() => "?").join(",")}) GROUP BY offer_id`,
    ...offerIds,
  );
  return new Map(rows.map((r) => [r.offer_id, { total: r.total, nous: r.nous }]));
}

/** Oportunitats per a un jugador: ofertes obertes del seu gènere, amb compatibilitat i estat. */
export function opportunitiesFor(p: PlayerRow, ctx: PlayerCtx = playerCtx()) {
  const mp = toMatchPlayer(p, ctx.prev.get(p.id), ctx.career.get(p.id) ?? 0);
  const blocked = new Set(all<{ club_id: string }>("SELECT club_id FROM blocks WHERE player_id = ?", p.id).map((r) => r.club_id));
  const apps = new Map(all<{ offer_id: string; status: string; id: string; created_at: string }>("SELECT offer_id, status, id, created_at FROM applications WHERE player_id = ?", p.id).map((a) => [a.offer_id, a]));
  const favs = new Set(all<{ target_id: string }>("SELECT f.target_id FROM favorites f JOIN users u ON u.id = f.user_id WHERE u.player_id = ? AND u.role = 'player' AND f.target_type = 'offer'", p.id).map((r) => r.target_id));
  return openOffers()
    .filter((o) => o.gender === p.gender && !blocked.has(o.club_id) && o.club_id !== p.club_id)
    .map((o) => ({ offer: o, match: computeMatch(mp, toMatchOffer(o), ctx.now), application: apps.get(o.id) ?? null, favorite: favs.has(o.id) }))
    .sort((a, b) => b.match.score - a.match.score);
}

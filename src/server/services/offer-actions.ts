import { z } from "zod";
import { get, insert, nowIso, run, uid } from "@/server/db/client";
import { ApiError } from "@/server/api";
import type { SessionUser } from "@/server/auth/session";
import { can, clubById } from "@/server/services/access";
import { rankCandidates, offerRow } from "@/server/services/offers";
import type { MatchOffer } from "@/lib/matching";
import { placeByCity } from "@/lib/geo";
import { POSITIONS, birthYearsForCategory, currentSeasonStartYear } from "@/lib/domain";
import type { Category } from "@/lib/domain";
import { notifyClub } from "@/server/services/notify";

export const OfferInput = z.object({
  team_id: z.string(),
  kind: z.enum(["incorporacio", "prova"]).default("incorporacio"),
  title: z.string().trim().min(4, "títol massa curt").max(90),
  position: z.enum(POSITIONS),
  accepts_secondary: z.boolean().default(true),
  birth_year_min: z.number().int().optional(),
  birth_year_max: z.number().int().optional(),
  level_min: z.number().int().min(1).max(5),
  zone_city: z.string(),
  max_km: z.number().int().min(5).max(150),
  foot: z.enum(["indiferent", "dret", "esquerre"]),
  height_min: z.number().int().min(140).max(210).nullish(),
  traits: z.array(z.string()).max(5).default([]),
  availability_req: z.enum(["temporada", "immediata"]).default("temporada"),
  description: z.string().max(1500).default(""),
  restrictions: z.string().max(800).default(""),
  trial_date: z.string().nullish(),
  expires_days: z.number().int().min(7).max(120).default(30),
});
export type OfferInputT = z.infer<typeof OfferInput>;

export function buildMatchOffer(clubId: string, d: OfferInputT): { m: MatchOffer; team: { id: string; category: string; gender: string; name: string } } {
  const team = get<{ id: string; club_id: string; category: string; gender: string; name: string }>("SELECT * FROM teams WHERE id = ?", d.team_id);
  if (!team || team.club_id !== clubId) throw new ApiError(400, "Equip no vàlid.");
  const place = placeByCity(d.zone_city) ?? (() => {
    const c = clubById(clubId)!;
    return { city: c.city, lat: c.lat, lng: c.lng };
  })();
  const by = birthYearsForCategory(team.category as Category, currentSeasonStartYear());
  return {
    team,
    m: {
      position: d.position, accepts_secondary: d.accepts_secondary, gender: team.gender,
      birth_year_min: d.birth_year_min ?? by.min, birth_year_max: d.birth_year_max ?? by.max, level_min: d.level_min,
      zone_city: place.city, zone_lat: place.lat, zone_lng: place.lng, max_km: d.max_km, foot: d.foot, height_min: d.height_min ?? null,
      traits: d.traits, availability_req: d.availability_req,
    },
  };
}

export function previewOffer(u: SessionUser & { club_id: string }, d: OfferInputT) {
  const club = clubById(u.club_id)!;
  const { m } = buildMatchOffer(u.club_id, d);
  const list = rankCandidates(m, club, { minScore: 50 });
  return {
    total: list.length,
    over80: list.filter((c) => c.match.score >= 80).length,
    over70: list.filter((c) => c.match.score >= 70).length,
    top: list.slice(0, 3).map((c) => ({ id: c.player.id, name: c.player.name, initials: c.player.initials, hue: c.player.hue, pos: c.player.position_label, age: c.player.age, club: c.player.club_name, score: c.match.score })),
    birth_year_min: m.birth_year_min,
    birth_year_max: m.birth_year_max,
  };
}

export function createOffer(u: SessionUser & { club_id: string }, d: OfferInputT) {
  if (!can.manageOffers(u)) throw new ApiError(403, "Només la direcció esportiva pot publicar ofertes.");
  const { m } = buildMatchOffer(u.club_id, d);
  if (d.kind === "prova" && !d.trial_date) throw new ApiError(400, "Indica la data de la jornada de proves.");
  const id = uid("o_");
  const now = new Date();
  insert("offers", {
    id, club_id: u.club_id, team_id: d.team_id, kind: d.kind, title: d.title, position: d.position, accepts_secondary: d.accepts_secondary ? 1 : 0,
    category: get<{ category: string }>("SELECT category FROM teams WHERE id = ?", d.team_id)!.category, gender: m.gender, birth_year_min: m.birth_year_min, birth_year_max: m.birth_year_max,
    level_min: d.level_min, zone_city: m.zone_city, zone_lat: m.zone_lat, zone_lng: m.zone_lng, max_km: d.max_km, foot: d.foot, height_min: d.height_min ?? null,
    traits: JSON.stringify(d.traits), availability_req: d.availability_req, description: d.description, restrictions: d.restrictions || null,
    trial_date: d.trial_date ? new Date(d.trial_date).toISOString() : null, status: "oberta", created_by: u.id, created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + d.expires_days * 86400000).toISOString(),
  });
  const pv = previewOffer(u, d);
  if (pv.over80 > 0) notifyClub(u.club_id, d.team_id, "match", `${pv.over80} ${pv.over80 === 1 ? "perfil coincideix" : "perfils coincideixen"} amb la teva nova oferta.`, `«${d.title}» · compatibilitat superior al 80%.`, `/club/ofertes/${id}`);
  return { id, preview: pv };
}

export function setOfferStatus(u: SessionUser & { club_id: string }, offerId: string, status: "oberta" | "pausada" | "tancada") {
  const o = offerRow(offerId);
  if (!o || o.club_id !== u.club_id) throw new ApiError(404, "Oferta no trobada.");
  if (!can.manageOffers(u)) throw new ApiError(403, "Només la direcció esportiva pot modificar ofertes.");
  run("UPDATE offers SET status = ? WHERE id = ?", status, offerId);
  if (status === "tancada") run("UPDATE applications SET status = 'tancat', updated_at = ? WHERE offer_id = ? AND status IN ('enviada','vista')", nowIso(), offerId);
}

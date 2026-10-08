import { z } from "zod";
import { get, insert, nowIso, run, uid } from "@/server/db/client";
import { ApiError } from "@/server/api";
import type { SessionUser } from "@/server/auth/session";
import { can, clubById } from "@/server/services/access";
import { rankCandidates, offerRow } from "@/server/services/offers";
import type { MatchOffer } from "@/lib/matching";
import { placeByCity } from "@/lib/geo";
import { POSITIONS, TRAITS, birthYearsForCategory, currentSeasonStartYear } from "@/lib/domain";
import type { Category } from "@/lib/domain";
import { notifyClub } from "@/server/services/notify";
import { audit } from "@/server/security/audit";
import { zId, zIsoDate, zText } from "@/server/validation";

export const OfferInput = z.object({
  team_id: zId,
  kind: z.enum(["incorporacio", "prova"]).default("incorporacio"),
  title: zText(90, 4),
  position: z.enum(POSITIONS),
  accepts_secondary: z.boolean().default(true),
  birth_year_min: z.number().int().min(1960).max(2030).optional(),
  birth_year_max: z.number().int().min(1960).max(2030).optional(),
  level_min: z.number().int().min(1).max(5),
  zone_city: zText(60),
  max_km: z.number().int().min(5).max(150),
  foot: z.enum(["indiferent", "dret", "esquerre"]),
  height_min: z.number().int().min(140).max(210).nullish(),
  traits: z.array(z.enum(TRAITS.map((t) => t.key) as [string, ...string[]])).max(5).default([]),
  availability_req: z.enum(["temporada", "immediata"]).default("temporada"),
  description: zText(1500).default(""),
  restrictions: zText(800).default(""),
  trial_date: zIsoDate.nullish(),
  expires_days: z.number().int().min(7).max(120).default(30),
}).refine((d) => !d.birth_year_min || !d.birth_year_max || d.birth_year_min <= d.birth_year_max, { message: "la franja d'edat no és vàlida", path: ["birth_year_min"] });
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
  if (!can.manageOffers(u)) throw new ApiError(403, "Només direcció i coordinació poden publicar oportunitats.");
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
  audit({ actor: u, action: "opportunity.create", entity: { type: "opportunity", id }, detail: d.title });
  const pv = previewOffer(u, d);
  if (pv.over80 > 0) notifyClub(u.club_id, d.team_id, "match", `${pv.over80} ${pv.over80 === 1 ? "perfil coincideix" : "perfils coincideixen"} amb la teva nova oportunitat.`, `«${d.title}» · compatibilitat superior al 80%.`, `/club/oportunitats/${id}`);
  return { id, preview: pv };
}

export function setOfferStatus(u: SessionUser & { club_id: string }, offerId: string, status: "oberta" | "pausada" | "tancada") {
  const o = offerRow(offerId);
  if (!o || o.club_id !== u.club_id) throw new ApiError(404, "Oportunitat no trobada.");
  if (!can.manageOffers(u)) throw new ApiError(403, "Només direcció i coordinació poden modificar oportunitats.");
  run("UPDATE offers SET status = ? WHERE id = ?", status, offerId);
  audit({ actor: u, action: "opportunity.status", entity: { type: "opportunity", id: offerId }, detail: `${o.title}: ${o.status} → ${status}` });
  if (status === "tancada") run("UPDATE applications SET status = 'tancat', updated_at = ? WHERE offer_id = ? AND status IN ('enviada','vista')", nowIso(), offerId);
}

/**
 * Onboarding de un club nuevo: llegar al primer valor cuanto antes.
 * Club → equipos → primera necesidad → primera oportunidad → primeros jugadores compatibles.
 */
import { z } from "zod";
import { all, get, insert, run, tx, uid } from "@/server/db/client";
import { ApiError, requirePermission } from "@/server/api";
import type { Staff } from "@/server/api";
import { audit } from "@/server/security/audit";
import { createOffer } from "@/server/services/offer-actions";
import { currentSeason } from "@/server/services/players";
import { POSITIONS, POSITION_LABEL } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import { zText } from "@/server/validation";

/** Equipos que se pueden crear en el onboarding (plantillas habituales de fútbol base). */
export const TEAM_PRESETS = [
  { key: "infa", name: "Infantil A", category: "Infantil", gender: "M" },
  { key: "cada", name: "Cadete A", category: "Cadete", gender: "M" },
  { key: "cadb", name: "Cadete B", category: "Cadete", gender: "M" },
  { key: "juva", name: "Juvenil A", category: "Juvenil", gender: "M" },
  { key: "juvb", name: "Juvenil B", category: "Juvenil", gender: "M" },
  { key: "juvf", name: "Juvenil Femenino", category: "Juvenil", gender: "F" },
  { key: "ama", name: "Amateur A", category: "Amateur", gender: "M" },
] as const;
type PresetKey = (typeof TEAM_PRESETS)[number]["key"];
const presetKeys = TEAM_PRESETS.map((t) => t.key) as [PresetKey, ...PresetKey[]];

export const OnboardingInput = z.object({
  teams: z.array(z.enum(presetKeys)).min(1, "elige al menos un equipo").max(TEAM_PRESETS.length),
  need: z.object({
    team: z.enum(presetKeys),
    position: z.enum(POSITIONS),
    level_min: z.number().int().min(1).max(5),
    foot: z.enum(["indiferent", "dret", "esquerre"]),
    text: zText(200, 5),
  }),
}).strict().refine((d) => d.teams.includes(d.need.team), { message: "la necesidad debe ser de uno de los equipos elegidos", path: ["need", "team"] });

export function onboardingStatus(clubId: string) {
  const teams = get<{ n: number }>("SELECT COUNT(*) AS n FROM teams WHERE club_id = ?", clubId)?.n ?? 0;
  const offers = get<{ n: number }>("SELECT COUNT(*) AS n FROM offers WHERE club_id = ?", clubId)?.n ?? 0;
  return { teams, offers, done: teams > 0 && offers > 0 };
}

export function completeOnboarding(u: Staff, d: z.infer<typeof OnboardingInput>) {
  requirePermission(u, "club.edit", "Solo la dirección deportiva puede configurar el club.");
  const season = currentSeason();
  const existing = new Set(all<{ name: string }>("SELECT name FROM teams WHERE club_id = ?", u.club_id).map((t) => t.name));
  const ids = new Map<string, string>();
  tx(() => {
    for (const key of d.teams) {
      const p = TEAM_PRESETS.find((t) => t.key === key)!;
      const found = get<{ id: string }>("SELECT id FROM teams WHERE club_id = ? AND name = ?", u.club_id, p.name);
      const id = found?.id ?? uid("t_");
      if (!existing.has(p.name)) insert("teams", { id, club_id: u.club_id, name: p.name, category: p.category, gender: p.gender, is_first_team: p.key === "ama" ? 1 : 0 });
      if (!get("SELECT id FROM team_seasons WHERE team_id = ? AND season_id = ?", id, season.id)) {
        insert("team_seasons", { id: uid("ts_"), team_id: id, season_id: season.id, competition_id: null, coach_name: null, coordinator_name: null, delegate_name: null, staff: "[]", objectives: null, needs: "[]" });
      }
      ids.set(key, id);
    }
    const teamId = ids.get(d.need.team)!;
    run("UPDATE team_seasons SET needs = ? WHERE team_id = ? AND season_id = ?", JSON.stringify([{ position: d.need.position, text: d.need.text, priority: "alta" }]), teamId, season.id);
  });
  const team = TEAM_PRESETS.find((t) => t.key === d.need.team)!;
  const club = get<{ city: string }>("SELECT city FROM clubs WHERE id = ?", u.club_id)!;
  const r = createOffer(u, {
    team_id: ids.get(d.need.team)!, kind: "incorporacio", title: `${POSITION_LABEL[d.need.position as Position]} para el ${team.name}`, position: d.need.position,
    accepts_secondary: true, level_min: d.need.level_min, zone_city: club.city, max_km: 30, foot: d.need.foot, traits: [], availability_req: "temporada",
    description: d.need.text, restrictions: "", expires_days: 30,
  });
  audit({ actor: u, action: "club.onboarding", entity: { type: "club", id: u.club_id }, detail: `${d.teams.length} equipos · primera oportunidad` });
  if (!r.id) throw new ApiError(500, "No se ha podido crear la oportunidad.");
  return { offerId: r.id, preview: r.preview };
}

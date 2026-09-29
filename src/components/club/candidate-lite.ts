import type { Stage } from "@/lib/domain";

export type CandidateLite = {
  id: string; name: string; initials: string; hue: number; position_label: string; age: number; club_name: string; team_name: string | null;
  level_label: string; location: string; foot: string; height: number | null; availability: string; verification: string; minor: boolean;
  score: number; factors: { key: string; label: string; score: number; weight: number; detail: string }[]; km: number;
  stage: Stage | null; applied: string | null; minutes: number | null;
};

export function toLite(c: { player: { id: string; name: string; initials: string; hue: number; position_label: string; age: number; club_name: string; team_name: string | null; level_label: string; location: string; foot: string; height: number | null; availability: string; verification: string; minor: boolean; prev: { minutes: number } | null }; match: { score: number; factors: { key: string; label: string; score: number; weight: number; detail: string }[] }; km: number; stage: Stage | null; application: { status: string } | null }): CandidateLite {
  const p = c.player;
  return {
    id: p.id, name: p.name, initials: p.initials, hue: p.hue, position_label: p.position_label, age: p.age, club_name: p.club_name, team_name: p.team_name,
    level_label: p.level_label, location: p.location, foot: p.foot, height: p.height, availability: p.availability, verification: p.verification, minor: p.minor,
    score: c.match.score, factors: c.match.factors.map((f) => ({ key: f.key, label: f.label, score: f.score, weight: f.weight, detail: f.detail })), km: c.km,
    stage: c.stage, applied: c.application?.status ?? null, minutes: p.prev?.minutes ?? null,
  };
}


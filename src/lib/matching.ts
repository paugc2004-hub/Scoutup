/**
 * Motor de compatibilitat (matching) de ScoutUp — determinista i explicable.
 *
 * Pesos (sumen 100):
 *   Posició 25 · Categoria i nivell 20 · Edat 15 · Ubicació 10 · Disponibilitat 10 · Característiques 10 · Experiència 10
 *
 * Cada factor retorna una puntuació, un estat (ok / parcial / no) i una explicació en català,
 * de manera que el club sempre pot veure PER QUÈ un jugador encaixa. Sense IA externa.
 * Sense àlies: també l'executa el seed.
 */
import type { Attrs, AttrKey } from "./domain.ts";
import { ADJACENT_POSITIONS, POSITION_LABEL, FOOT_LABEL, TRAITS, levelLabel } from "./domain.ts";
import type { Position } from "./domain.ts";
import { distanceKm } from "./geo.ts";

export type MatchPlayer = {
  primary_position: string;
  secondary_positions: string[];
  birth_year: number;
  gender: string;
  division_rank: number;
  lat: number;
  lng: number;
  city: string;
  availability: string;
  available_from?: string | null;
  foot: string;
  height_cm?: number | null;
  attrs: Attrs;
  prev_minutes: number;
  prev_matches: number;
  prev_starts: number;
  career_seasons: number;
  stats_verified: boolean;
};

export type MatchOffer = {
  position: string;
  accepts_secondary: boolean;
  gender: string;
  birth_year_min: number;
  birth_year_max: number;
  level_min: number;
  zone_city: string;
  zone_lat: number;
  zone_lng: number;
  max_km: number;
  foot: string;
  height_min?: number | null;
  traits: string[];
  availability_req?: string | null;
};

export type FactorKey = "posicio" | "nivell" | "edat" | "ubicacio" | "disponibilitat" | "caracteristiques" | "experiencia";
export type Factor = {
  key: FactorKey;
  label: string;
  weight: number;
  score: number;
  status: "ok" | "partial" | "miss";
  detail: string;
};
export type MatchResult = {
  score: number;
  eligible: boolean;
  factors: Factor[];
  strengths: string[];
  gaps: string[];
  distanceKm: number;
};

export const WEIGHTS: Record<FactorKey, { label: string; weight: number }> = {
  posicio: { label: "Posició", weight: 25 },
  nivell: { label: "Categoria i nivell", weight: 20 },
  edat: { label: "Edat", weight: 15 },
  ubicacio: { label: "Ubicació", weight: 10 },
  disponibilitat: { label: "Disponibilitat", weight: 10 },
  caracteristiques: { label: "Característiques", weight: 10 },
  experiencia: { label: "Experiència", weight: 10 },
};

function status(score: number, weight: number): Factor["status"] {
  const r = score / weight;
  return r >= 0.8 ? "ok" : r >= 0.4 ? "partial" : "miss";
}
function f(key: FactorKey, score: number, detail: string): Factor {
  const w = WEIGHTS[key].weight;
  const s = Math.max(0, Math.min(w, Math.round(score * 10) / 10));
  return { key, label: WEIGHTS[key].label, weight: w, score: s, status: status(s, w), detail };
}

export function computeMatch(p: MatchPlayer, o: MatchOffer, now: Date = new Date()): MatchResult {
  const factors: Factor[] = [];

  // 1 · Posició (25)
  const pos = o.position as Position;
  const adj = ADJACENT_POSITIONS[pos] ?? [];
  if (p.primary_position === o.position) {
    factors.push(f("posicio", 25, `Posició principal: ${POSITION_LABEL[pos]}.`));
  } else if (o.accepts_secondary && p.secondary_positions.includes(o.position)) {
    factors.push(f("posicio", 17, `${POSITION_LABEL[pos]} és una posició secundària del jugador.`));
  } else if (adj.includes(p.primary_position as Position)) {
    factors.push(f("posicio", 9, `Juga de ${POSITION_LABEL[p.primary_position as Position]}, posició propera.`));
  } else {
    factors.push(f("posicio", 0, `Juga de ${POSITION_LABEL[p.primary_position as Position] ?? p.primary_position}, no de ${POSITION_LABEL[pos]}.`));
  }

  // 2 · Categoria i nivell (20) — rang 1 = nivell més alt
  const diff = p.division_rank - o.level_min;
  if (diff <= 0) {
    factors.push(f("nivell", 20, `Competeix a ${levelLabel(p.division_rank)} (mínim demanat: ${levelLabel(o.level_min)}).`));
  } else if (diff === 1) {
    factors.push(f("nivell", 13, `Competeix a ${levelLabel(p.division_rank)}, un nivell per sota del demanat.`));
  } else if (diff === 2) {
    factors.push(f("nivell", 6, `Competeix a ${levelLabel(p.division_rank)}, dos nivells per sota.`));
  } else {
    factors.push(f("nivell", 0, `Competeix a ${levelLabel(p.division_rank)}, lluny del nivell demanat.`));
  }

  // 3 · Edat (15)
  const by = p.birth_year;
  if (by >= o.birth_year_min && by <= o.birth_year_max) {
    factors.push(f("edat", 15, `Nascut el ${by}, dins de la franja ${o.birth_year_min}–${o.birth_year_max}.`));
  } else {
    const off = by < o.birth_year_min ? o.birth_year_min - by : by - o.birth_year_max;
    factors.push(f("edat", off === 1 ? 6 : 0, `Nascut el ${by}, ${off} ${off === 1 ? "any" : "anys"} fora de la franja ${o.birth_year_min}–${o.birth_year_max}.`));
  }

  // 4 · Ubicació (10)
  const km = distanceKm(p.lat, p.lng, o.zone_lat, o.zone_lng);
  const kmTxt = km < 1 ? "al mateix municipi" : `a ${Math.round(km)} km de ${o.zone_city}`;
  if (km <= o.max_km * 0.5) factors.push(f("ubicacio", 10, `Viu ${kmTxt}.`));
  else if (km <= o.max_km) factors.push(f("ubicacio", 10 - 4 * ((km - o.max_km * 0.5) / (o.max_km * 0.5)), `Viu ${kmTxt} (radi ${o.max_km} km).`));
  else if (km <= o.max_km * 1.6) factors.push(f("ubicacio", 3, `Viu ${kmTxt}, fora del radi de ${o.max_km} km.`));
  else factors.push(f("ubicacio", 0, `Viu ${kmTxt}, molt fora del radi.`));

  // 5 · Disponibilitat (10)
  let disp = p.availability === "obert" ? 10 : p.availability === "escoltant" ? 7 : 0;
  let dispTxt = p.availability === "obert" ? "Obert a oportunitats." : p.availability === "escoltant" ? "Escoltant propostes." : "Ara mateix no està disponible.";
  if (disp > 0 && o.availability_req === "immediata" && p.available_from && new Date(p.available_from) > now) {
    disp -= 3;
    dispTxt += " Disponible més endavant, no immediatament.";
  }
  factors.push(f("disponibilitat", disp, dispTxt));

  // 6 · Característiques (10): peu 4 · alçada 2 · trets 4
  let car = 0;
  const bits: string[] = [];
  if (o.foot === "indiferent" || p.foot === o.foot || p.foot === "ambdues") {
    car += 4;
    if (o.foot !== "indiferent") bits.push(`peu ${FOOT_LABEL[p.foot].toLowerCase()}`);
  } else bits.push(`peu ${FOOT_LABEL[p.foot].toLowerCase()} (es demana ${FOOT_LABEL[o.foot].toLowerCase()})`);
  if (!o.height_min) car += 2;
  else if (p.height_cm && p.height_cm >= o.height_min) { car += 2; bits.push(`${p.height_cm} cm`); }
  else if (p.height_cm && p.height_cm >= o.height_min - 3) { car += 1; bits.push(`${p.height_cm} cm, just per sota de ${o.height_min}`); }
  else bits.push(p.height_cm ? `${p.height_cm} cm (mínim ${o.height_min})` : "alçada no informada");
  if (o.traits.length === 0) car += 4;
  else {
    const hits = o.traits.filter((t) => {
      const attr = TRAITS.find((x) => x.key === t)?.attr as AttrKey | undefined;
      return attr ? (p.attrs[attr] ?? 0) >= 7 : false;
    });
    car += (4 * hits.length) / o.traits.length;
    bits.push(`${hits.length} de ${o.traits.length} trets destacats`);
  }
  factors.push(f("caracteristiques", car, bits.length ? capital(bits.join(" · ")) + "." : "Sense requisits específics."));

  // 7 · Experiència (10): minuts temporada anterior 6 · titularitats 2 · trajectòria 1 · dades verificades 1
  let exp = Math.min(6, (6 * p.prev_minutes) / 1800);
  const ratio = p.prev_matches > 0 ? p.prev_starts / p.prev_matches : 0;
  exp += ratio >= 0.6 ? 2 : ratio >= 0.35 ? 1 : 0;
  exp += p.career_seasons >= 3 ? 1 : 0;
  exp += p.stats_verified ? 1 : 0;
  factors.push(f("experiencia", exp, `${p.prev_minutes.toLocaleString("ca-ES")} min i ${p.prev_starts} titularitats la temporada passada${p.stats_verified ? " (dades verificades)" : " (autodeclarades)"}.`));

  const raw = factors.reduce((a, x) => a + x.score, 0);
  const eligible = p.gender === o.gender;
  const score = eligible ? Math.round(raw) : 0;

  const strengths = factors.filter((x) => x.status === "ok").map((x) => x.label);
  const gaps = factors.filter((x) => x.status !== "ok").map((x) => `${x.label}: ${x.detail}`);
  return { score, eligible, factors, strengths, gaps, distanceKm: km };
}

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function matchTone(score: number): "high" | "mid" | "low" {
  return score >= 80 ? "high" : score >= 60 ? "mid" : "low";
}

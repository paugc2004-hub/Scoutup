/**
 * ScoutUp Intelligence — assistent determinista (sense IA externa).
 * Interpreta una petició en llenguatge natural, la converteix en criteris d'una "oferta virtual"
 * i reutilitza el motor de matching per ordenar i explicar els resultats.
 */
import { PLACES, COMARQUES } from "@/lib/geo";
import { POSITION_LABEL, FOOT_LABEL, traitLabel, levelLabel, currentSeasonStartYear, AVAILABILITY_LABEL } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import type { MatchOffer } from "@/lib/matching";
import { rankCandidates } from "@/server/services/offers";
import type { Candidate } from "@/server/services/offers";
import type { PlayerView } from "@/server/services/players";

export type Chip = { key: string; label: string; value: string };
export type Parsed = { offer: MatchOffer; chips: Chip[]; understood: boolean; zoneLabel: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/·/g, "l");

const POS_RULES: [RegExp, Position][] = [
  [/lateral (dret|derecho|dreta)/, "LD"],
  [/lateral (esquerre|esquerra|izquierdo|izquierda)/, "LE"],
  [/(extrem|extremo) (dret|derecho|dreta)/, "ED"],
  [/(extrem|extremo) (esquerre|esquerra|izquierdo|izquierda)/, "EE"],
  [/(porter|portera|porteria|portero|goalkeeper)/, "POR"],
  [/(defensa central|central|centrals|centrales)/, "DC"],
  [/(pivot|mig defensiu|mediocentro defensivo|migcampista defensiu)/, "MCD"],
  [/(mitjapunta|mediapunta|enganxe|mig ofensiu)/, "MCO"],
  [/(migcampista|centrecampista|centrocampista|interior|\bmig\b|\bmedio\b)/, "MC"],
  [/(davanter|davantera|delantero|delantera|punta|\b9\b|ariete)/, "DAV"],
  [/(extrem|extremo)/, "ED"],
  [/(lateral)/, "LD"],
];

const TRAIT_RULES: [RegExp, string][] = [
  [/(joc aeri|juego aereo|fort per alt|fuerte por arriba|de cap|cabeza)/, "joc_aeri"],
  [/(sortida de pilota|salida de balon|bon peu|buen pie|treure la pilota)/, "sortida_pilota"],
  [/(rapid|velocitat|velocidad|veloz)/, "velocitat"],
  [/(regat|1x1|1 contra 1|desequilibr|encarar|regate)/, "regat"],
  [/(visio|vision|creatiu|creativo|ultim passi|ultimo pase)/, "visio"],
  [/(golejador|goleador|definicio|definicion|\bgol\b|gols|goles)/, "gol"],
  [/(lider|capita|capitan|lideratge|liderazgo)/, "lideratge"],
  [/(fisic|fisico|potent|duel)/, "fisic"],
  [/(tecnic|tecnica|tecnico)/, "tecnica"],
  [/(recorregut|resistencia|box to box|incansable)/, "resistencia"],
  [/(contundent|solid|defensiu|defensivo|marcatge|marcaje)/, "defensa"],
  [/(reflexos|reflejos)/, "reflexos"],
  [/(lectura|intel·ligent|inteligente|intelligent|posicional)/, "posicionament"],
];

export function parseQuery(text: string, club: { city: string; lat: number; lng: number }): Parsed {
  const q = norm(text);
  const start = currentSeasonStartYear();
  const chips: Chip[] = [];
  let rest = q;

  // posició
  let position: Position = "DC";
  let posFound = false;
  for (const [re, pos] of POS_RULES) {
    const m = rest.match(re);
    if (m) {
      position = pos;
      posFound = true;
      rest = rest.replace(m[0], " ");
      break;
    }
  }
  if (posFound) chips.push({ key: "posicio", label: "Posició", value: POSITION_LABEL[position] });

  // gènere
  const gender = /(femeni|femenina|jugadora|noia|chica|\bnena\b)/.test(q) ? "F" : "M";
  if (gender === "F") chips.push({ key: "genere", label: "Equip", value: "Femení" });

  // peu
  let foot = "indiferent";
  if (/(esquerra|esquerre|zurdo|zurda|izquierd|cama esquerra|peu esquerre)/.test(rest)) foot = "esquerre";
  else if (/(dreta\b|dreta |dreta$|diestro|peu dret|cama dreta|\bdreta\b|dretà)/.test(rest)) foot = "dret";
  if (foot !== "indiferent") chips.push({ key: "peu", label: "Peu", value: FOOT_LABEL[foot] });

  // edat / categoria
  let by = { min: start - 18, max: start - 16 };
  let catLabel = "";
  const age = q.match(/(\d{2})\s*(anys|años|any)/);
  if (/(sub-?19|sub 19|juvenil)/.test(q)) { by = { min: start - 18, max: start - 16 }; catLabel = "Juvenil (sub-19)"; }
  else if (/(sub-?16|sub 16|cadet)/.test(q)) { by = { min: start - 15, max: start - 14 }; catLabel = "Cadet (sub-16)"; }
  else if (/(amateur|senior|primer equip)/.test(q)) { by = { min: start - 26, max: start - 19 }; catLabel = "Amateur"; }
  else if (/(sub-?18|sub 18)/.test(q)) { by = { min: start - 17, max: start - 16 }; catLabel = "Sub-18"; }
  if (age) {
    const a = Number(age[1]);
    by = { min: start - a - (start >= 0 ? 0 : 0), max: start - a + 1 };
    catLabel = `${a} anys`;
  }
  chips.push({ key: "edat", label: "Edat", value: catLabel ? `${catLabel} · nascuts ${by.min}–${by.max}` : `Juvenil per defecte · ${by.min}–${by.max}` });

  // nivell
  let level = 4;
  if (/(divisio d.honor|\bdh\b|maxim nivell|maximo nivel)/.test(q)) level = 1;
  else if (/(nacional|alt nivell|alto nivel|bon nivell|buen nivel)/.test(q)) level = 2;
  else if (/(preferent)/.test(q)) level = 3;
  else if (/(primera)/.test(q)) level = 4;
  chips.push({ key: "nivell", label: "Nivell mínim", value: levelLabel(level) });

  // zona
  let zone = { city: club.city, lat: club.lat, lng: club.lng };
  let zoneLabel = `a prop de ${club.city}`;
  const comarca = COMARQUES.find((c) => q.includes(norm(c)) || (norm(c).startsWith("valles") && /\bvalles\b/.test(q) && norm(c) === "valles occidental"));
  const city = PLACES.find((p) => q.includes(norm(p.city)));
  if (city) { zone = { city: city.city, lat: city.lat, lng: city.lng }; zoneLabel = `a prop de ${city.city}`; }
  else if (comarca) {
    const ps = PLACES.filter((p) => p.comarca === comarca);
    zone = { city: comarca, lat: ps.reduce((a, p) => a + p.lat, 0) / ps.length, lng: ps.reduce((a, p) => a + p.lng, 0) / ps.length };
    zoneLabel = `zona ${comarca}`;
  }
  const km = q.match(/(\d{1,3})\s*km/);
  const maxKm = km ? Number(km[1]) : comarca ? 25 : 30;
  chips.push({ key: "zona", label: "Zona", value: `${zoneLabel} · ${maxKm} km` });

  // alçada
  let height: number | null = null;
  const hm = q.match(/(1[.,]\d{2})\s*m|(\d{3})\s*cm/);
  if (hm) height = hm[1] ? Math.round(Number(hm[1].replace(",", ".")) * 100) : Number(hm[2]);
  else if (/\b(alt|alto|corpulent|gran envergadura)\b/.test(q)) height = position === "POR" || position === "DC" ? 182 : 178;
  if (height) chips.push({ key: "alcada", label: "Alçada mínima", value: `${height} cm` });

  // trets
  const traits = Array.from(new Set(TRAIT_RULES.filter(([re]) => re.test(q)).map(([, t]) => t))).slice(0, 4);
  for (const t of traits) chips.push({ key: "tret_" + t, label: "Característica", value: traitLabel(t) });

  const availability_req = /(immediat|inmediat|ara mateix|ja|lliure|sense equip|libre)/.test(q) ? "immediata" : "temporada";
  if (availability_req === "immediata") chips.push({ key: "disp", label: "Disponibilitat", value: "Immediata" });

  return {
    offer: {
      position, accepts_secondary: true, gender, birth_year_min: by.min, birth_year_max: by.max, level_min: level,
      zone_city: zone.city, zone_lat: zone.lat, zone_lng: zone.lng, max_km: maxKm, foot, height_min: height, traits, availability_req,
    },
    chips,
    understood: posFound || traits.length > 0,
    zoneLabel,
  };
}

/** Frase explicativa per a un candidat. */
export function explainCandidate(c: Candidate): string {
  const p = c.player;
  const ok = c.match.factors.filter((f) => f.status === "ok").map((f) => f.label.toLowerCase());
  const weak = c.match.factors.filter((f) => f.status !== "ok").sort((a, b) => a.score / a.weight - b.score / b.weight)[0];
  const trait = c.match.factors.find((f) => f.key === "caracteristiques");
  let s = `${p.first_name} (${p.age} anys, ${p.position_label.toLowerCase()}, ${p.club_name}) encaixa en ${ok.length} de 7 factors`;
  if (ok.length) s += `: ${ok.slice(0, 4).join(", ")}`;
  s += ".";
  if (trait && trait.status === "ok") s += ` ${trait.detail}`;
  if (weak) s += ` A tenir en compte: ${weak.detail.charAt(0).toLowerCase() + weak.detail.slice(1)}`;
  if (c.stage) s += " Ja és al teu pipeline.";
  return s;
}

export function runIntelligence(text: string, club: { id: string; verified: number; city: string; lat: number; lng: number }) {
  const parsed = parseQuery(text, club);
  const all = rankCandidates(parsed.offer, club, { minScore: 45 });
  const top = all.slice(0, 12);
  const over80 = all.filter((c) => c.match.score >= 80).length;
  const best = top[0];
  const summary = !parsed.understood
    ? "No he identificat cap posició ni característica concreta. He fet servir un perfil genèric; prova d'indicar la posició (per exemple, «central esquerrà sub-19 amb joc aeri»)."
    : top.length === 0
      ? "Cap perfil visible per al teu club compleix aquests criteris. Prova d'ampliar la zona o de rebaixar el nivell mínim."
      : `He trobat ${all.length} ${all.length === 1 ? "perfil compatible" : "perfils compatibles"} ${parsed.zoneLabel}; ${over80} ${over80 === 1 ? "supera" : "superen"} el 80%. El millor encaix és ${best.player.name} (${best.match.score}%).`;
  return {
    chips: parsed.chips,
    summary,
    offer: parsed.offer,
    results: top.map((c) => ({ ...c, explanation: explainCandidate(c) })),
    total: all.length,
  };
}

/** Resum en llenguatge natural del perfil d'un jugador (per a la fitxa del club). */
export function profileSummary(p: PlayerView): string {
  const top = [...p.radar].sort((a, b) => b.value - a.value);
  const s = `${p.position_label} de ${p.age} anys${p.foot !== "dret" ? `, ${p.foot === "esquerre" ? "esquerrà" : "ambidextre"}` : ""}, que competeix a ${p.level_label.toLowerCase() === "—" ? "un nivell no informat" : p.level_label} amb ${p.club_name}.`;
  const strong = `Destaca en ${top[0].label.toLowerCase()} i ${top[1].label.toLowerCase()}`;
  const stats = p.prev ? `; la temporada passada va jugar ${p.prev.matches} partits (${p.prev.starts} de titular) i ${p.prev.minutes.toLocaleString("ca-ES")} minuts` : "";
  const av = `. ${AVAILABILITY_LABEL[p.availability]}.`;
  return `${s} ${strong}${stats}${av}`;
}

/** Comparació resumida de 2–3 jugadors. */
export function compareSummary(players: PlayerView[], scores?: Record<string, number>): string[] {
  if (players.length < 2) return [];
  const lines: string[] = [];
  const axes = players[0].radar.map((a) => a.key);
  for (const key of axes) {
    const vals = players.map((p) => ({ p, v: p.radar.find((r) => r.key === key)!.value }));
    vals.sort((a, b) => b.v - a.v);
    if (vals[0].v - vals[1].v >= 1) lines.push(`${vals[0].p.first_name} és clarament superior en ${players[0].radar.find((r) => r.key === key)!.label.toLowerCase()} (${vals[0].v} vs ${vals[1].v}).`);
  }
  const exp = players.filter((p) => p.prev).sort((a, b) => (b.prev!.minutes) - (a.prev!.minutes));
  if (exp.length >= 2) lines.push(`${exp[0].first_name} arriba amb més rodatge: ${exp[0].prev!.minutes.toLocaleString("ca-ES")} minuts la temporada passada.`);
  const young = [...players].sort((a, b) => b.birth_year - a.birth_year || a.age - b.age);
  if (young[0].birth_year !== young[1].birth_year) lines.push(`${young[0].first_name} és el més jove (nascut el ${young[0].birth_year}): més marge de creixement.`);
  if (scores) {
    const best = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))[0];
    lines.push(`Per a l'oportunitat seleccionada, el millor encaix és ${best.first_name} (${scores[best.id]}%).`);
  }
  return lines.slice(0, 5);
}

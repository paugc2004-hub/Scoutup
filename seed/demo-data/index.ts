/**
 * Seed de dades de DEMOSTRACIÓ de ScoutUp.
 *
 * Tot és fictici: clubs, jugadors, competicions, classificacions, missatges i estadístiques.
 * No s'utilitza cap dada real ni cap dada de la FCF. Els municipis són reals només com a
 * referència geogràfica.
 *
 * El generador és determinista (PRNG amb llavor fixa) i les dates són relatives al moment
 * de la càrrega, perquè la demo sempre sembli "d'avui".
 */
import type { DatabaseSync } from "node:sqlite";
import { CLUBS, CLUB_TEXTS, HOME_CLUB_ID, CLUB_B_ID } from "./clubs.ts";
import type { ClubDef } from "./clubs.ts";
import { MALE_NAMES, FEMALE_NAMES, SURNAMES, BLOCKED_COMBOS, FILLER_TEAMS, COACH_NAMES } from "./names.ts";
import {
  levelLabel, currentSeasonStartYear, seasonLabel, seasonId, DEFAULT_PRIVACY,
  stageToAppStatus, STAGE_LABEL,
} from "../../src/lib/domain.ts";
import type { Position, Attrs, Privacy, Preferences, Stage } from "../../src/lib/domain.ts";
import { PLACES, placeByCity, distanceKm } from "../../src/lib/geo.ts";
import type { Place } from "../../src/lib/geo.ts";
import { computeMatch } from "../../src/lib/matching.ts";
import type { MatchPlayer, MatchOffer } from "../../src/lib/matching.ts";
import { completenessScore } from "../../src/lib/completeness.ts";
import { madridAt } from "../../src/lib/time.ts";
import { hashPassword } from "../../src/server/auth/password.ts";

// ─── PRNG determinista ─────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ctx = {
  db: DatabaseSync;
  now: Date;
  rnd: () => number;
  stmts: Map<string, ReturnType<DatabaseSync["prepare"]>>;
};

function clean(v: unknown): string | number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number" || typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return JSON.stringify(v);
}

function ins(c: Ctx, table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const k = table + ":" + keys.join(",");
  let st = c.stmts.get(k);
  if (!st) {
    st = c.db.prepare(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`);
    c.stmts.set(k, st);
  }
  st.run(...keys.map((x) => clean(row[x])));
}

// helpers aleatoris
const R = {
  int: (c: Ctx, a: number, b: number) => a + Math.floor(c.rnd() * (b - a + 1)),
  pick: <T>(c: Ctx, arr: readonly T[]): T => arr[Math.floor(c.rnd() * arr.length)],
  chance: (c: Ctx, p: number) => c.rnd() < p,
  weighted: <T>(c: Ctx, items: [T, number][]): T => {
    const total = items.reduce((a, [, w]) => a + w, 0);
    let r = c.rnd() * total;
    for (const [v, w] of items) {
      if ((r -= w) <= 0) return v;
    }
    return items[items.length - 1][0];
  },
  shuffle: <T>(c: Ctx, arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(c.rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};

const iso = (d: Date) => d.toISOString();
function ago(c: Ctx, days: number, hours = 0, minutes = 0): string {
  return iso(new Date(c.now.getTime() - ((days * 24 + hours) * 60 + minutes) * 60000));
}
function at(c: Ctx, dayOffset: number, hh: number, mm = 0): string {
  return iso(madridAt(c.now, dayOffset, hh, mm));
}
function clubSuffix(id: string) {
  return id.replace("club_", "");
}
function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ─── Tipus interns ─────────────────────────────────────────────────────────────
type TeamRec = { id: string; clubId: string; club: ClubDef; key: string; name: string; category: string; gender: string; rank: number; group: number; place: Place };
type PlayerRec = {
  id: string;
  userId: string | null;
  first: string;
  last: string;
  gender: "M" | "F";
  birth: string;
  birthYear: number;
  place: Place;
  pos: Position;
  sec: Position[];
  foot: string;
  height: number;
  clubId: string | null;
  teamId: string | null;
  clubFree: string | null;
  category: string;
  rank: number;
  availability: string;
  availableFrom: string | null;
  contract: string;
  attrs: Attrs;
  hue: number;
  verification: string;
  guardianUserId: string | null;
  guardianEmail: string | null;
  guardianConsent: boolean;
  privacy: Privacy;
  preferences: Preferences;
  style: string;
  description: string;
  languages: string;
  updatedDaysAgo: number;
  prev: { matches: number; starts: number; minutes: number; goals: number; assists: number; yellow: number; red: number; callups: number; cs: number; ver: string };
  hasCurrentStats: boolean;
  careerSeasons: number;
  videos: number;
  achievements: number;
};

// ─── Plantilles de text ───────────────────────────────────────────────────────
const STYLE_BY_POS: Record<Position, string[]> = {
  POR: ["Portero de reflejos y buen juego de pies", "Portero dominador del área", "Portero ágil, fuerte en el uno contra uno"],
  LD: ["Lateral de recorrido, llega a línea de fondo", "Lateral defensiu i ordenat", "Carrilero con mucha proyección"],
  LE: ["Lateral esquerre ofensiu i intens", "Lateral fiable en defensa, bona centrada", "Carrilero de mucho recorrido"],
  DC: ["Central contundente, dominador del juego aéreo", "Central con salida de balón", "Central rápido, bueno al espacio"],
  MCD: ["Pivote de equilibrio, recuperador", "Medio defensivo con buena lectura", "Pivot posicional, primer passador"],
  MC: ["Interior de recorrido box to box", "Centrocampista de asociación", "Mig organitzador, ritme i pausa"],
  MCO: ["Mitjapunta creatiu, últim passador", "Enganche con llegada al área", "Mitjapunta entre línies"],
  ED: ["Extremo desequilibrante en el uno contra uno", "Extrem a cama canviada, diagonal i xut", "Extremo rápido y profundo"],
  EE: ["Extrem esquerre vertical", "Extrem associatiu a banda esquerra", "Extremo de desborde"],
  DAV: ["Delantero de referencia, bueno de espaldas", "Delantero móvil, ataca el espacio", "Rematador de área"],
};
const DESC_BY_POS: Record<string, string[]> = {
  POR: ["Portero con buena comunicación con la defensa y mucho trabajo en la salida de balón. Busco un proyecto donde crecer y competir.", "Muy seguro por alto y rápido abajo. Trabajo cada semana el juego de pies y quiero dar un paso adelante de categoría."],
  DEF: ["Defensa intenso y ordenado, me gusta salir jugando desde atrás y ayudar al equipo a presionar arriba. Comprometido y puntual.", "Jugador competitivo, fuerte en el duelo y con buena lectura de las jugadas. Busco un club con un proyecto formativo serio."],
  MIG: ["Centrocampista con criterio, me gusta tener el balón y dar ritmo al equipo. Trabajador en defensa y con llegada.", "Jugador de equipo, inteligente tácticamente y con mucho recorrido. Quiero seguir creciendo en un entorno exigente."],
  ATK: ["Jugador de ataque vertical, me gusta encarar y generar ocasiones. Buena definición y mucha movilidad.", "Atacante con gol y desmarque, trabajo mucho la presión alta. Busco minutos y un proyecto donde sumar."],
};
const GROUP_OF: Record<Position, "POR" | "DEF" | "MIG" | "ATK"> = { POR: "POR", LD: "DEF", DC: "DEF", LE: "DEF", MCD: "MIG", MC: "MIG", MCO: "MIG", ED: "ATK", EE: "ATK", DAV: "ATK" };

const POS_MODS: Record<Position, Partial<Record<keyof Attrs, number>>> = {
  POR: { reflexos: 2, sortides: 1.5, joc_aeri: 0.5, xut: -3, regat: -3, passada: -0.8, velocitat: -1, defensa: -1 },
  LD: { velocitat: 1.5, resistencia: 1.5, defensa: 0.5, passada: 0.4, xut: -1.5, joc_aeri: -0.5 },
  LE: { velocitat: 1.5, resistencia: 1.5, defensa: 0.5, passada: 0.4, xut: -1.5, joc_aeri: -0.5 },
  DC: { joc_aeri: 1.8, defensa: 1.8, forca: 1.4, posicionament: 1, regat: -2, xut: -2, velocitat: -0.4 },
  MCD: { defensa: 1, posicionament: 1.5, passada: 1, resistencia: 1, xut: -1.5, regat: -1 },
  MC: { passada: 1.5, visio: 1.4, tecnica: 1, resistencia: 0.6, joc_aeri: -1 },
  MCO: { visio: 2, tecnica: 1.5, regat: 1, passada: 1, defensa: -2, forca: -1 },
  ED: { velocitat: 2, regat: 2, tecnica: 0.5, defensa: -2, joc_aeri: -1.5 },
  EE: { velocitat: 2, regat: 2, tecnica: 0.5, defensa: -2, joc_aeri: -1.5 },
  DAV: { xut: 2.4, joc_aeri: 0.6, forca: 0.5, regat: 0.5, defensa: -2.5, passada: -0.5 },
};
const BASE_BY_RANK: Record<number, number> = { 1: 7.0, 2: 6.5, 3: 6.0, 4: 5.4, 5: 4.8 };

function genAttrs(c: Ctx, pos: Position, rank: number, youth: number): Attrs {
  const base = BASE_BY_RANK[rank] - youth * 0.3;
  const keys = ["velocitat", "resistencia", "forca", "tecnica", "passada", "xut", "regat", "joc_aeri", "defensa", "visio", "posicionament", "lideratge"] as const;
  const a: Attrs = {};
  for (const k of keys) a[k] = clamp(Math.round(base + (POS_MODS[pos][k] ?? 0) + (c.rnd() * 2.4 - 1.2)), 2, 10);
  if (pos === "POR") {
    a.reflexos = clamp(Math.round(base + 2 + (c.rnd() * 2 - 1)), 3, 10);
    a.sortides = clamp(Math.round(base + 1.5 + (c.rnd() * 2 - 1)), 3, 10);
  }
  return a;
}
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

const POS_WEIGHTS: [Position, number][] = [["POR", 8], ["LD", 9], ["DC", 16], ["LE", 9], ["MCD", 10], ["MC", 12], ["MCO", 9], ["ED", 9], ["EE", 8], ["DAV", 10]];

// ─── SEED ─────────────────────────────────────────────────────────────────────
export function seedDemo(db: DatabaseSync, now: Date): void {
  const c: Ctx = { db, now, rnd: mulberry32(20260929), stmts: new Map() };
  const start = currentSeasonStartYear(now);
  const seasons = [start - 2, start - 1, start];
  const cur = seasonId(start);
  const prev = seasonId(start - 1);

  for (const y of seasons) ins(c, "seasons", { id: seasonId(y), label: seasonLabel(y), start_year: y, is_current: y === start ? 1 : 0 });

  // ── Usuaris de demo ─────────────────────────────────────────────────────────
  const demoHash = hashPassword("demo");
  const U = {
    director: "u_director",
    coach: "u_coach",
    coachCadet: "u_coach_cadet",
    coordinator: "u_coordinator",
    player: "u_player",
    tutor: "u_tutor",
  };

  // ── Clubs ───────────────────────────────────────────────────────────────────
  const teams: TeamRec[] = [];
  const staffOf: Record<string, string> = {};
  CLUBS.forEach((cl, idx) => {
    const place = placeByCity(cl.city)!;
    const t = CLUB_TEXTS[cl.tier];
    const s = slug(cl.short);
    ins(c, "clubs", {
      id: cl.id, name: cl.name, short_name: cl.short, initials: cl.initials, color_primary: cl.c1, color_secondary: cl.c2,
      founded: cl.founded, city: place.city, comarca: place.comarca, province: place.province, region: "Catalunya", country: "Espanya",
      lat: place.lat, lng: place.lng,
      website: `https://${s}.example`, instagram: `@${s.replace(/-/g, "")}.demo`, email: `info@${s}.example`,
      phone: `93 555 ${String(10 + idx).padStart(2, "0")} ${String(20 + idx * 3).padStart(2, "0")}`,
      office_hours: "De lunes a viernes, de 17:30 a 20:30 h",
      languages: "Catalán, castellano",
      description: cl.id === HOME_CLUB_ID
        ? "Club del Vallès Occidental con más de sesenta años de historia y una de las estructuras de fútbol base más completas de la comarca: siete equipos, del Infantil al primer equipo amateur, y un equipo juvenil femenino en plena progresión."
        : t.description,
      history: `Fundado en ${cl.founded} en ${place.city}. ${cl.tier === 1 ? "Ha formado jugadores que han llegado a categorías nacionales y es un club de referencia para las familias de la zona." : cl.tier === 2 ? "Club con una base muy arraigada en el municipio, que ha vivido varios ascensos en las categorías formativas." : "Entidad joven que ha crecido rápidamente gracias al trabajo de voluntarios y familias."}`,
      philosophy: t.philosophy, values_text: t.values, objectives: t.objectives, sporting_model: t.model,
      facilities: JSON.stringify([
        { name: `Camp Municipal ${cl.short}`, type: "Gespa artificial · Futbol 11", note: "Sede de los partidos oficiales" },
        { name: `Camp annex ${cl.short}`, type: "Gespa artificial · Futbol 7", note: "Entrenamientos de base" },
        ...(cl.tier === 1 ? [{ name: "Sala de vídeo y gimnasio", type: "Instalaciones complementarias", note: "Uso de todos los equipos A" }] : []),
      ]),
      tier: cl.tier, verified: cl.verified ? 1 : 0, created_at: ago(c, 400 - idx * 7),
    });

    // Usuari responsable de cada club (no pot iniciar sessió; serveix d'autor dels missatges)
    if (cl.id !== HOME_CLUB_ID) {
      const uid = `u_staff_${clubSuffix(cl.id)}`;
      staffOf[cl.id] = uid;
      // El director del FC Mediterrani és un usuari de demo: serveix per demostrar l'aïllament entre clubs.
      const isClubB = cl.id === CLUB_B_ID;
      ins(c, "users", {
        id: uid, email: isClubB ? "club-b@scoutup.demo" : `direccio@${s}.example`, password_hash: isClubB ? demoHash : "!", name: COACH_NAMES[idx % COACH_NAMES.length], role: "director",
        title: "Dirección deportiva", club_id: cl.id, avatar_hue: (idx * 37) % 360, is_demo_login: isClubB ? 1 : 0, created_at: ago(c, 300),
      });
    }

    for (const tm of cl.teams) {
      const grp = tm.rank === 1 ? 1 : ["Vallès Occidental", "Vallès Oriental", "Barcelonès", "Maresme"].includes(place.comarca) ? 1 : ["Baix Llobregat", "Garraf", "Alt Penedès", "Anoia", "Tarragonès", "Baix Camp"].includes(place.comarca) ? 2 : 3;
      teams.push({ id: `t_${clubSuffix(cl.id)}_${tm.key}`, clubId: cl.id, club: cl, key: tm.key, name: tm.name, category: tm.category, gender: tm.gender, rank: tm.rank, group: grp, place });
      ins(c, "teams", { id: `t_${clubSuffix(cl.id)}_${tm.key}`, club_id: cl.id, name: tm.name, category: tm.category, gender: tm.gender, is_first_team: tm.first ? 1 : 0 });
    }
  });
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const clubById = new Map(CLUBS.map((cl) => [cl.id, cl]));
  staffOf[HOME_CLUB_ID] = U.director;

  // Usuaris de demo (club principal, jugador i tutor)
  ins(c, "users", { id: U.director, email: "director@scoutup.demo", password_hash: demoHash, name: "Marta Casanovas", role: "director", title: "Directora deportiva", club_id: HOME_CLUB_ID, avatar_hue: 152, is_demo_login: 1, created_at: ago(c, 380) });
  ins(c, "users", { id: U.coach, email: "coach@scoutup.demo", password_hash: demoHash, name: "Jordi Esteve", role: "coach", title: "Entrenador · Juvenil A", club_id: HOME_CLUB_ID, team_id: "t_vn_juva", avatar_hue: 210, is_demo_login: 1, created_at: ago(c, 370) });
  ins(c, "users", { id: U.coordinator, email: "coordinacio@scoutup.demo", password_hash: demoHash, name: "Sergi Puig", role: "coordinator", title: "Coordinador de fútbol base", club_id: HOME_CLUB_ID, avatar_hue: 40, is_demo_login: 1, created_at: ago(c, 365) });
  ins(c, "users", { id: U.coachCadet, email: "cadet@vallesnord.example", password_hash: "!", name: "Laia Ferrer", role: "coach", title: "Entrenadora · Cadete A", club_id: HOME_CLUB_ID, team_id: "t_vn_cada", avatar_hue: 330, is_demo_login: 0, created_at: ago(c, 360) });
  ins(c, "users", { id: U.player, email: "player@scoutup.demo", password_hash: demoHash, name: "Pol Serra Batlle", role: "player", title: "Jugador", player_id: "p_pol", avatar_hue: 28, is_demo_login: 1, created_at: ago(c, 210) });
  ins(c, "users", { id: U.tutor, email: "tutor@scoutup.demo", password_hash: demoHash, name: "Anna Font", role: "guardian", title: "Tutora legal de Nil Font", player_id: "p_nil", avatar_hue: 280, is_demo_login: 1, created_at: ago(c, 150) });

  // ── Competicions (simulades) i temporades d'equip ─────────────────────────────
  const compIds = new Map<string, string>();
  const compOf = (seasonStart: number, t: TeamRec) => {
    const key = `${seasonStart}_${t.category}_${t.gender}_${t.rank}_${t.group}`;
    let id = compIds.get(key);
    if (!id) {
      id = `c_${key}`.toLowerCase();
      compIds.set(key, id);
      ins(c, "competitions", {
        id, season_id: seasonId(seasonStart),
        name: `${t.category}${t.gender === "F" ? " Femenino" : ""} ${levelLabel(t.rank)} · Grupo ${t.group}`,
        category: t.category, gender: t.gender, division: levelLabel(t.rank), level_rank: t.rank, group_name: `Grupo ${t.group}`, source: "mock",
      });
    }
    return id;
  };

  const needsVN: Record<string, { position: string; text: string; priority: "alta" | "mitjana" | "baixa" }[]> = {
    juva: [
      { position: "DC", text: "Central zurdo: dos centrales terminan la etapa juvenil y ninguno es zurdo.", priority: "alta" },
      { position: "DAV", text: "Delantero de referencia para competir con el titular.", priority: "mitjana" },
    ],
    juvb: [{ position: "ED", text: "Extremo derecho desequilibrante.", priority: "mitjana" }],
    cada: [{ position: "LD", text: "Lateral derecho: el titular sube al Juvenil y no hay recambio en la plantilla.", priority: "alta" }],
    ama: [{ position: "POR", text: "Portero para competir por la titularidad.", priority: "alta" }],
    juvf: [{ position: "MC", text: "Centrocampista organizadora.", priority: "mitjana" }],
  };
  const vnCoach: Record<string, string> = { juva: "Jordi Esteve", juvb: "Toni Bayés", cada: "Laia Ferrer", cadb: "Núria Clotet", infa: "Carles Amat", ama: "Ramon Güell", juvf: "Sílvia Roig" };

  const teamSeasonId = (teamId: string, s: number) => `ts_${teamId.slice(2)}_${s}`;
  for (const t of teams) {
    const isVN = t.clubId === HOME_CLUB_ID;
    const ss = isVN ? seasons : [start];
    for (const s of ss) {
      const compId = compOf(s, t);
      ins(c, "team_seasons", {
        id: teamSeasonId(t.id, s), team_id: t.id, season_id: seasonId(s), competition_id: compId,
        coach_name: isVN ? vnCoach[t.key] : R.pick(c, COACH_NAMES),
        coordinator_name: isVN ? "Xavier Rius" : R.pick(c, COACH_NAMES),
        delegate_name: R.pick(c, COACH_NAMES),
        staff: JSON.stringify(isVN ? [
          { role: "Segundo entrenador", name: R.pick(c, COACH_NAMES) },
          { role: "Preparador físico", name: R.pick(c, COACH_NAMES) },
          ...(t.key === "juva" ? [{ role: "Entrenador de porteros", name: "Pere Colomer" }] : []),
        ] : []),
        objectives: isVN ? (t.key === "juva" ? "Quedar entre los cuatro primeros y consolidar la categoría." : t.key === "juvf" ? "Luchar por el ascenso y hacer crecer la base femenina." : "Formar jugadores para los equipos A y competir con una idea de juego clara.") : "Competir y formar jugadores.",
        needs: JSON.stringify(isVN && s === start ? needsVN[t.key] ?? [] : []),
      });
    }
  }

  // Classificacions simulades
  const buildStandings = (compId: string, s: number, entries: { name: string; clubId: string | null; teamId: string | null; strength: number }[], played: number, force?: { teamId: string; pos: number }) => {
    const rows = entries.map((e) => {
      let w = 0, d = 0, l = 0, gf = 0, ga = 0;
      for (let i = 0; i < played; i++) {
        const r = c.rnd() + e.strength * 0.35 - 0.2;
        if (r > 0.62) { w++; const g = R.int(c, 1, 4); gf += g; ga += R.int(c, 0, g - 1); }
        else if (r > 0.36) { d++; const g = R.int(c, 0, 2); gf += g; ga += g; }
        else { l++; const g = R.int(c, 1, 3); ga += g; gf += R.int(c, 0, g - 1); }
      }
      return { ...e, w, d, l, gf, ga, pts: w * 3 + d };
    });
    rows.sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf);
    if (force) {
      const i = rows.findIndex((r) => r.teamId === force.teamId);
      if (i >= 0) {
        const [row] = rows.splice(i, 1);
        rows.splice(force.pos - 1, 0, row);
        // ajusta punts perquè siguin coherents amb la posició
        for (let k = 0; k < rows.length; k++) {
          if (k > 0 && rows[k].pts > rows[k - 1].pts) {
            const r = rows[k];
            while (r.pts > rows[k - 1].pts && r.w > 0) { r.w--; r.l++; r.pts -= 3; }
            while (r.pts > rows[k - 1].pts && r.d > 0) { r.d--; r.l++; r.pts -= 1; }
          }
        }
      }
    }
    rows.forEach((r, i) => ins(c, "competition_standings", {
      id: `cs_${compId}_${i + 1}`, competition_id: compId, team_name: r.name, club_id: r.clubId, team_id: r.teamId,
      pos: i + 1, played, won: r.w, drawn: r.d, lost: r.l, gf: r.gf, ga: r.ga, points: r.pts,
    }));
  };
  {
    // agrupa equips per competició
    const byComp = new Map<string, { s: number; teams: TeamRec[] }>();
    for (const t of teams) {
      const ss = t.clubId === HOME_CLUB_ID ? seasons : [start];
      for (const s of ss) {
        const id = compOf(s, t);
        const e = byComp.get(id) ?? { s, teams: [] };
        e.teams.push(t);
        byComp.set(id, e);
      }
    }
    let fillerIdx = 0;
    for (const [compId, { s, teams: tt }] of byComp) {
      const size = tt[0].category === "Cadete" || tt[0].category === "Infantil" ? 14 : 16;
      const entries: { name: string; clubId: string | null; teamId: string | null; strength: number }[] = tt.map((t) => ({ name: `${t.club.name}${t.name.includes("Femenino") ? "" : ""} ${t.name.replace("Juvenil Femenino", "Femenino")}`.replace(/ (Juvenil|Cadete|Infantil|Amateur) A$/, " A").replace(/ (Juvenil|Cadete) B$/, " B"), clubId: t.clubId, teamId: t.id, strength: 4 - t.club.tier + c.rnd() }));
      while (entries.length < size) {
        entries.push({ name: FILLER_TEAMS[fillerIdx++ % FILLER_TEAMS.length] + (R.chance(c, 0.25) ? " B" : ""), clubId: null, teamId: null, strength: c.rnd() * 2.2 });
      }
      const played = s === start ? 3 : (size - 1) * 2;
      const force = s === start && compId === compOf(start, teamById.get("t_vn_juva")!) ? { teamId: "t_vn_juva", pos: 4 } : s === start - 1 && compId === compOf(start - 1, teamById.get("t_vn_juva")!) ? { teamId: "t_vn_juva", pos: 5 } : undefined;
      buildStandings(compId, s, entries, played, force);
    }
  }

  // ── Jugadors ────────────────────────────────────────────────────────────────
  const usedNames = new Set<string>();
  const players: PlayerRec[] = [];
  const nearbyPlace = (base: Place): Place => {
    if (R.chance(c, 0.55)) return base;
    const near = PLACES.filter((p) => p.city !== base.city && distanceKm(p.lat, p.lng, base.lat, base.lng) < 32);
    return near.length ? R.pick(c, near) : base;
  };
  const genName = (gender: "M" | "F") => {
    for (let i = 0; i < 50; i++) {
      const f = R.pick(c, gender === "M" ? MALE_NAMES : FEMALE_NAMES);
      const s1 = R.pick(c, SURNAMES);
      let s2 = R.pick(c, SURNAMES);
      if (s2 === s1) s2 = R.pick(c, SURNAMES);
      const full = `${f} ${s1} ${s2}`;
      if (BLOCKED_COMBOS.has(`${f} ${s1}`) || usedNames.has(full)) continue;
      usedNames.add(full);
      return { first: f, last: `${s1} ${s2}` };
    }
    throw new Error("No s'ha pogut generar un nom únic");
  };
  const yearsFor = (category: string): [number, number] =>
    category === "Cadete" ? [start - 15, start - 14] : category === "Juvenil" ? [start - 18, start - 16] : [start - 24, start - 19];

  const genStats = (rank: number, category: string, pos: Position, attrs: Attrs, role: number, ver: string) => {
    const maxM = category === "Cadete" ? 26 : 30;
    const matches = clamp(Math.round(maxM * (0.45 + 0.5 * role) + (c.rnd() * 4 - 2)), 4, maxM);
    const starts = clamp(Math.round(matches * (0.2 + 0.8 * role)), 0, matches);
    const dur = category === "Cadete" ? 80 : 90;
    const minutes = starts * (dur - R.int(c, 3, 12)) + (matches - starts) * R.int(c, 15, 30);
    const g = { POR: 0, LD: 0.04, LE: 0.04, DC: 0.07, MCD: 0.05, MC: 0.1, MCO: 0.22, ED: 0.28, EE: 0.28, DAV: 0.5 }[pos];
    const a = { POR: 0.01, LD: 0.1, LE: 0.1, DC: 0.03, MCD: 0.06, MC: 0.14, MCO: 0.25, ED: 0.22, EE: 0.22, DAV: 0.15 }[pos];
    const goals = Math.round(matches * g * ((attrs.xut ?? 5) / 6.5) * (0.7 + c.rnd() * 0.6));
    const assists = Math.round(matches * a * ((attrs.passada ?? 5) / 6.5) * (0.7 + c.rnd() * 0.6));
    const yellow = Math.round(matches * ((pos === "DC" || pos === "MCD") ? 0.18 : 0.09) * (0.5 + c.rnd()));
    const red = R.chance(c, (pos === "DC" || pos === "MCD") ? 0.18 : 0.06) ? 1 : 0;
    const callups = Math.min(maxM, matches + R.int(c, 0, 4));
    const cs = pos === "POR" || pos === "DC" ? Math.round(starts * (0.2 + (5 - rank) * 0.04)) : 0;
    void rank;
    return { matches, starts, minutes, goals, assists, yellow, red, callups, cs, ver };
  };

  let pCount = 0;
  const makePlayer = (o: Partial<PlayerRec> & { gender: "M" | "F"; category: string; rank: number; basePlace: Place }): PlayerRec => {
    pCount++;
    const id = o.id ?? `p_${String(pCount).padStart(3, "0")}`;
    const nm = o.first && o.last ? { first: o.first, last: o.last } : genName(o.gender);
    if (o.first) usedNames.add(`${o.first} ${o.last}`);
    const [y0, y1] = yearsFor(o.category);
    const birthYear = o.birthYear ?? R.int(c, y0, y1);
    const birth = o.birth ?? `${birthYear}-${String(R.int(c, 1, 12)).padStart(2, "0")}-${String(R.int(c, 1, 28)).padStart(2, "0")}`;
    const pos = o.pos ?? R.weighted(c, POS_WEIGHTS);
    const adj: Record<Position, Position[]> = { POR: [], LD: ["LE", "ED", "DC"], LE: ["LD", "EE", "DC"], DC: ["MCD", "LD", "LE"], MCD: ["MC", "DC"], MC: ["MCD", "MCO"], MCO: ["MC", "ED", "EE"], ED: ["EE", "MCO", "DAV"], EE: ["ED", "MCO", "DAV"], DAV: ["MCO", "ED", "EE"] };
    const sec = o.sec ?? (pos === "POR" ? [] : R.shuffle(c, adj[pos]).slice(0, R.int(c, 0, 2)));
    const foot = o.foot ?? (pos === "LE" || pos === "EE" ? R.weighted(c, [["esquerre", 60], ["dret", 30], ["ambdues", 10]]) : R.weighted(c, [["dret", 70], ["esquerre", 22], ["ambdues", 8]]));
    const age = start - birthYear;
    const youth = clamp(19 - age, 0, 5);
    const hBase = o.gender === "M" ? (pos === "DC" || pos === "POR" ? 183 : pos === "DAV" ? 179 : 173) : (pos === "DC" || pos === "POR" ? 170 : 164);
    const height = o.height ?? Math.round(hBase - youth * 1.3 + (c.rnd() * 10 - 5));
    const attrs = o.attrs ?? genAttrs(c, pos, o.rank, youth);
    const verification = o.verification ?? R.weighted(c, [["verified", 45], ["updated", 22], ["pending", 15], ["self", 18]]);
    const minor = age < 18 || (age === 18 && Number(birth.slice(5, 7)) > now.getMonth() + 1);
    const privacy: Privacy = o.privacy ?? { ...DEFAULT_PRIVACY, profile: minor ? "verificats" : R.weighted(c, [["tots", 35], ["verificats", 55], ["contactats", 7], ["ocult", 3]]) as Privacy["profile"], contact: R.weighted(c, [["verificats", 75], ["tots", 22], ["ningu", 3]]) as Privacy["contact"], showHeight: R.chance(c, 0.92), showStats: R.chance(c, 0.94), location: R.weighted(c, [["ciutat", 70], ["comarca", 25], ["provincia", 5]]) as Privacy["location"] };
    const role = clamp(c.rnd() * 0.9 + 0.1 + (o.rank <= 2 ? -0.05 : 0.05), 0.05, 1);
    const prevStats = o.prev ?? genStats(o.rank, o.category, pos, attrs, role, verification === "verified" ? "verified" : verification === "updated" ? "updated" : "self");
    const rec: PlayerRec = {
      id, userId: o.userId ?? null, first: nm.first, last: nm.last, gender: o.gender, birth, birthYear,
      place: o.place ?? nearbyPlace(o.basePlace), pos, sec, foot, height, clubId: o.clubId ?? null, teamId: o.teamId ?? null,
      clubFree: o.clubFree ?? null, category: o.category, rank: o.rank,
      availability: o.availability ?? R.weighted(c, [["obert", 45], ["escoltant", 40], ["no_disponible", 15]]),
      availableFrom: o.availableFrom ?? null, contract: o.contract ?? (o.clubId ? R.weighted(c, [["amb_fitxa", 75], ["final_temporada", 25]]) : "lliure"),
      attrs, hue: o.hue ?? R.int(c, 0, 359), verification,
      guardianUserId: o.guardianUserId ?? null,
      guardianEmail: minor ? (o.guardianEmail ?? `familia.${slug(nm.last.split(" ")[0])}${pCount}@correu.example`) : null,
      guardianConsent: o.guardianConsent ?? (minor ? R.chance(c, 0.88) : false),
      privacy,
      preferences: o.preferences ?? { categories: [o.category], maxKm: R.pick(c, [15, 25, 30, 40, 60]), interests: R.shuffle(c, ["incorporacio", "prova", "seguent_temporada", "estudis"]).slice(0, R.int(c, 1, 3)), levelMin: null, notes: "" },
      style: o.style ?? R.pick(c, STYLE_BY_POS[pos]),
      description: o.description ?? R.pick(c, DESC_BY_POS[GROUP_OF[pos]]),
      languages: o.languages ?? R.weighted(c, [["Catalán, castellano", 70], ["Catalán, castellano, inglés", 22], ["Castellano, catalán, árabe", 8]]),
      updatedDaysAgo: o.updatedDaysAgo ?? R.int(c, 1, 110),
      prev: prevStats,
      hasCurrentStats: o.hasCurrentStats ?? R.chance(c, 0.7),
      careerSeasons: o.careerSeasons ?? R.int(c, 2, 5),
      videos: o.videos ?? R.weighted(c, [[0, 35], [1, 35], [2, 20], [3, 10]]),
      achievements: o.achievements ?? R.weighted(c, [[0, 45], [1, 40], [2, 15]]),
    };
    players.push(rec);
    return rec;
  };

  const place = (city: string) => placeByCity(city)!;

  // Jugadors protagonistes de la demo
  makePlayer({
    id: "p_pol", userId: U.player, first: "Pol", last: "Serra Batlle", gender: "M", birth: `${start - 18}-03-14`, birthYear: start - 18,
    basePlace: place("Terrassa"), place: place("Terrassa"), pos: "DC", sec: ["MCD"], foot: "esquerre", height: 186,
    clubId: "club_serralada", teamId: "t_serralada_juva", category: "Juvenil", rank: 3, availability: "obert", contract: "final_temporada",
    attrs: { velocitat: 6, resistencia: 7, forca: 8, tecnica: 6, passada: 6, xut: 4, regat: 4, joc_aeri: 8, defensa: 8, visio: 6, posicionament: 7, lideratge: 7 },
    hue: 28, verification: "verified",
    privacy: { ...DEFAULT_PRIVACY, profile: "verificats", contact: "verificats" },
    preferences: { categories: ["Juvenil"], maxKm: 30, interests: ["incorporacio", "prova", "estudis"], levelMin: 2, notes: "Prefiero entrenar por la tarde (estudio bachillerato)." },
    style: "Central zurdo, dominador del juego aéreo",
    description: "Central zurdo, fuerte por alto y en el duelo. Capitán del Juvenil A. Me gusta comunicar y ordenar la defensa, y estoy trabajando la salida de balón. Busco dar el salto a Nacional.",
    languages: "Catalán, castellano, inglés", updatedDaysAgo: 62,
    prev: { matches: 25, starts: 13, minutes: 1520, goals: 3, assists: 1, yellow: 5, red: 0, callups: 27, cs: 5, ver: "updated" },
    hasCurrentStats: false, careerSeasons: 3, videos: 0, achievements: 0,
  });
  makePlayer({
    id: "p_biel", first: "Biel", last: "Riera Coll", gender: "M", birth: `${start - 18}-02-02`, birthYear: start - 18,
    basePlace: place("Sant Cugat del Vallès"), place: place("Sant Cugat del Vallès"), pos: "DC", sec: ["LE"], foot: "esquerre", height: 183,
    clubId: "club_turo", teamId: "t_turo_juva", category: "Juvenil", rank: 2, availability: "escoltant", contract: "amb_fitxa",
    attrs: { velocitat: 7, resistencia: 7, forca: 7, tecnica: 7, passada: 7, xut: 4, regat: 5, joc_aeri: 8, defensa: 6, visio: 7, posicionament: 6, lideratge: 6 },
    hue: 205, verification: "verified", guardianConsent: true,
    privacy: { ...DEFAULT_PRIVACY, profile: "verificats", contact: "verificats" },
    style: "Central con salida de balón",
    description: "Central zurdo con buena salida de balón y juego aéreo. Esta temporada he jugado pocos minutos y busco un equipo donde tener continuidad.",
    updatedDaysAgo: 3,
    prev: { matches: 12, starts: 3, minutes: 400, goals: 1, assists: 0, yellow: 2, red: 0, callups: 22, cs: 1, ver: "self" },
    hasCurrentStats: true, careerSeasons: 2, videos: 2, achievements: 1,
  });
  makePlayer({
    id: "p_arnau", first: "Arnau", last: "Soler Vives", gender: "M", birth: `${start - 18}-01-19`, birthYear: start - 18,
    basePlace: place("Granollers"), place: place("Granollers"), pos: "DC", sec: [], foot: "dret", height: 188,
    clubId: "club_serraverda", teamId: "t_serraverda_juva", category: "Juvenil", rank: 2, availability: "escoltant",
    attrs: { velocitat: 6, resistencia: 7, forca: 8, tecnica: 6, passada: 7, xut: 5, regat: 4, joc_aeri: 9, defensa: 8, visio: 6, posicionament: 8, lideratge: 8 },
    hue: 140, verification: "verified", updatedDaysAgo: 9,
    prev: { matches: 28, starts: 24, minutes: 2130, goals: 4, assists: 1, yellow: 6, red: 0, callups: 29, cs: 9, ver: "verified" },
    hasCurrentStats: true, careerSeasons: 4, videos: 3, achievements: 2,
  });
  makePlayer({
    id: "p_nil", first: "Nil", last: "Font Casals", gender: "M", birth: `${start - 16}-05-22`, birthYear: start - 16,
    basePlace: place("Cerdanyola del Vallès"), place: place("Cerdanyola del Vallès"), pos: "ED", sec: ["EE", "MCO"], foot: "dret", height: 172,
    clubId: "club_horitzo", teamId: "t_horitzo_juva", category: "Juvenil", rank: 3, availability: "obert",
    attrs: { velocitat: 8, resistencia: 7, forca: 5, tecnica: 7, passada: 6, xut: 6, regat: 8, joc_aeri: 4, defensa: 4, visio: 6, posicionament: 5, lideratge: 5 },
    hue: 265, verification: "verified", guardianUserId: U.tutor, guardianEmail: "tutor@scoutup.demo", guardianConsent: true,
    privacy: { ...DEFAULT_PRIVACY, profile: "verificats", contact: "verificats", location: "comarca" },
    style: "Extremo desequilibrante en el uno contra uno",
    description: "Extremo derecho rápido, me gusta encarar y centrar. Primer año de juvenil.", updatedDaysAgo: 14,
    hasCurrentStats: true, careerSeasons: 3, videos: 1, achievements: 1,
  });

  // Recorregut estrella: el Cadete A necessita un lateral dret. L'Hugo encaixa al 87%:
  // posició 25 · nivell 13 (Preferent, un per sota de Nacional) · edat 15 · ubicació 10 · disponibilitat 10 · característiques 10 · experiència 4.
  makePlayer({
    id: "p_hugo", first: "Hugo", last: "Navarro Vila", gender: "M", birth: `${start - 15}-04-11`, birthYear: start - 15,
    basePlace: place("Sabadell"), place: place("Sabadell"), pos: "LD", sec: ["ED"], foot: "dret", height: 171,
    clubId: "club_serralada", teamId: "t_serralada_cada", category: "Cadete", rank: 3, availability: "obert", contract: "final_temporada",
    attrs: { velocitat: 8, resistencia: 8, forca: 6, tecnica: 7, passada: 7, xut: 5, regat: 7, joc_aeri: 5, defensa: 7, visio: 6, posicionament: 6, lideratge: 6 },
    hue: 12, verification: "verified", guardianConsent: true,
    privacy: { ...DEFAULT_PRIVACY, profile: "verificats", contact: "verificats", location: "comarca" },
    preferences: { categories: ["Cadete"], maxKm: 25, interests: ["incorporacio", "estudis"], levelMin: 2, notes: "" },
    style: "Lateral profundo con mucho recorrido",
    description: "Lateral derecho rápido y con mucho recorrido. Me gusta subir la banda y centrar. Esta temporada he jugado poco y busco un equipo de Nacional donde tener minutos.",
    languages: "Catalán, castellano", updatedDaysAgo: 2,
    prev: { matches: 20, starts: 6, minutes: 900, goals: 1, assists: 4, yellow: 2, red: 0, callups: 24, cs: 0, ver: "self" },
    hasCurrentStats: true, careerSeasons: 3, videos: 2, achievements: 1,
  });
  const extraLD: [string, string, Position, string][] = [
    ["t_turo_cada", "Sant Cugat del Vallès", "LD", "dret"], ["t_horitzo_cada", "Cerdanyola del Vallès", "LD", "dret"], ["t_serraverda_cada", "Granollers", "LD", "dret"],
    ["t_planou_cada", "Rubí", "LD", "dret"], ["t_ribera_cada", "Cornellà de Llobregat", "LD", "dret"], ["t_mediterrani_cada", "Badalona", "LD", "ambdues"],
    ["t_torrent_cada", "Mataró", "LD", "dret"], ["t_serralada_cada", "Terrassa", "LD", "dret"], ["t_llevant_cada", "L'Hospitalet de Llobregat", "LD", "dret"],
    ["t_turo_cada", "Sabadell", "ED", "dret"], ["t_horitzo_cada", "Barberà del Vallès", "LE", "dret"], ["t_serraverda_cada", "Mollet del Vallès", "DC", "dret"],
    ["t_pins_cada", "Castelldefels", "LD", "dret"], ["t_delta_cada", "Sant Boi de Llobregat", "LD", "dret"], ["t_planou_cada", "Terrassa", "ED", "dret"],
    ["t_mediterrani_cada", "Badalona", "LD", "dret"], ["t_ribera_cada", "Sant Cugat del Vallès", "LD", "esquerre"], ["t_torrent_cada", "Mataró", "LD", "dret"],
  ];
  for (const [tid, city, pos, foot] of extraLD) {
    const t = teamById.get(tid);
    if (!t) continue;
    // competeixen a Primera Divisió (dos nivells per sota del demanat): compatibles, però per sota de l'Hugo
    makePlayer({ gender: "M", category: "Cadete", rank: 4, basePlace: place(city), place: place(city), clubId: t.clubId, teamId: t.id, pos, sec: pos === "LD" ? [] : ["LD"], foot, guardianConsent: true, availability: R.pick(c, ["obert", "escoltant"]) });
  }

  // Jugadors del club principal (surten a la plantilla)
  makePlayer({ gender: "M", category: "Juvenil", rank: 2, basePlace: place("Sabadell"), clubId: HOME_CLUB_ID, teamId: "t_vn_juva", pos: "MC", availability: "no_disponible" });
  makePlayer({ gender: "M", category: "Juvenil", rank: 2, basePlace: place("Sabadell"), clubId: HOME_CLUB_ID, teamId: "t_vn_juva", pos: "DAV", availability: "no_disponible" });
  makePlayer({ gender: "M", category: "Cadete", rank: 2, basePlace: place("Sabadell"), clubId: HOME_CLUB_ID, teamId: "t_vn_cada", pos: "DC", availability: "no_disponible" });
  makePlayer({ gender: "F", category: "Juvenil", rank: 2, basePlace: place("Sabadell"), clubId: HOME_CLUB_ID, teamId: "t_vn_juvf", pos: "DAV", availability: "no_disponible" });

  // Centrals juvenils addicionals a prop del Vallès (fan ric el cas "central sub-19")
  const extraDC: [string, string, string][] = [
    ["t_horitzo_juva", "Cerdanyola del Vallès", "esquerre"], ["t_planou_juva", "Rubí", "dret"], ["t_serralada_juva", "Terrassa", "dret"],
    ["t_torrent_juva", "Mataró", "esquerre"], ["t_pins_juva", "Castelldefels", "esquerre"], ["t_ribera_juva", "Cornellà de Llobregat", "dret"],
    ["t_fontclara_juva", "Mollet del Vallès", "esquerre"], ["t_mediterrani_juva", "Badalona", "dret"],
  ];
  for (const [tid, city, foot] of extraDC) {
    const t = teamById.get(tid)!;
    makePlayer({ gender: "M", category: "Juvenil", rank: t.rank, basePlace: place(city), place: place(city), clubId: t.clubId, teamId: t.id, pos: "DC", foot });
  }

  // Resta de jugadors per equip
  for (const t of teams) {
    if (t.clubId === HOME_CLUB_ID || t.category === "Infantil") continue;
    const n = t.gender === "F" ? 3 : t.category === "Juvenil" ? (t.rank <= 3 ? 4 : 3) : 2;
    const already = players.filter((p) => p.teamId === t.id).length;
    for (let i = already; i < n; i++) makePlayer({ gender: t.gender as "M" | "F", category: t.category, rank: t.rank, basePlace: t.place, clubId: t.clubId, teamId: t.id });
  }
  // Jugadors sense equip
  for (const [cat, city, g] of [["Juvenil", "Sabadell", "M"], ["Amateur", "Terrassa", "M"], ["Juvenil", "Badalona", "M"], ["Amateur", "Manresa", "M"], ["Juvenil", "Granollers", "F"]] as const) {
    makePlayer({ gender: g, category: cat, rank: 4, basePlace: place(city), clubFree: "Sin equipo", availability: "obert", contract: "lliure" });
  }

  // Inserció de jugadors + estadístiques + trajectòria + vídeos + assoliments
  const matchInput = new Map<string, MatchPlayer>();
  for (const p of players) {
    const t = p.teamId ? teamById.get(p.teamId) : null;
    const club = p.clubId ? clubById.get(p.clubId) : null;
    const updatedAt = ago(c, p.updatedDaysAgo, R.int(c, 0, 10));

    // trajectòria
    const career: { season: number; club: string; clubId: string | null; team: string; category: string; division: string; role: string; ver: string }[] = [];
    for (let k = 0; k < p.careerSeasons; k++) {
      const s = start - k;
      const cat = s - p.birthYear <= 15 ? "Cadete" : s - p.birthYear <= 18 ? "Juvenil" : "Amateur";
      const infantil = s - p.birthYear <= 13;
      const sameClub = k === 0 || (k === 1 && R.chance(c, 0.6)) || R.chance(c, 0.3);
      const cl = k === 0 ? club : sameClub ? club : R.pick(c, CLUBS.filter((x) => x.id !== HOME_CLUB_ID));
      const clName = k === 0 && !club ? (p.clubFree ?? "Sin equipo") : cl ? cl.name : R.pick(c, FILLER_TEAMS);
      if (k === 0 && !club) {
        career.push({ season: s, club: "Sin equipo", clubId: null, team: "—", category: cat, division: "—", role: "Buscando equipo", ver: "self" });
        continue;
      }
      career.push({
        season: s, club: clName, clubId: cl ? cl.id : null, team: infantil ? "Infantil A" : `${cat} ${R.pick(c, ["A", "A", "B"])}`,
        category: infantil ? "Infantil" : cat, division: levelLabel(clamp(p.rank + (k > 0 ? R.int(c, -1, 1) : 0), 1, 5)),
        role: k === 0 ? (p.prev.starts / Math.max(1, p.prev.matches) > 0.6 ? "Titular" : "Rotació") : R.pick(c, ["Titular", "Titular", "Rotació", "Capità"]),
        ver: k === 0 ? (p.verification === "verified" ? "verified" : "self") : R.pick(c, ["verified", "self", "self"]),
      });
    }
    // Pol: trajectòria fixa
    if (p.id === "p_pol") {
      career.length = 0;
      career.push({ season: start, club: "UE Serralada", clubId: "club_serralada", team: "Juvenil A", category: "Juvenil", division: "Preferent", role: "Capità", ver: "verified" });
      career.push({ season: start - 1, club: "UE Serralada", clubId: "club_serralada", team: "Juvenil A", category: "Juvenil", division: "Preferent", role: "Titular", ver: "verified" });
      career.push({ season: start - 2, club: "CE Olivera", clubId: "club_olivera", team: "Juvenil A", category: "Juvenil", division: "Primera Divisió", role: "Titular", ver: "self" });
    }
    career.forEach((e, i) => ins(c, "player_career", {
      id: `pc_${p.id}_${i}`, player_id: p.id, season_label: seasonLabel(e.season), club_name: e.club, club_id: e.clubId, team_name: e.team,
      category: e.category, division: e.division, role: e.role, verification: e.ver, sort: i,
    }));

    // estadístiques: temporada passada, anterior i actual
    const st = p.prev;
    ins(c, "player_stats", { id: `ps_${p.id}_${prev}`, player_id: p.id, season_id: prev, team_name: career[1] ? `${career[1].club} · ${career[1].team}` : null, matches: st.matches, starts: st.starts, minutes: st.minutes, goals: st.goals, assists: st.assists, yellow: st.yellow, red: st.red, callups: st.callups, clean_sheets: st.cs, verification: st.ver, updated_at: updatedAt });
    if (p.careerSeasons >= 3) {
      const s2 = genStats(p.rank, p.category === "Juvenil" && p.birthYear >= start - 17 ? "Cadete" : p.category, p.pos, p.attrs, c.rnd(), R.pick(c, ["verified", "self"]));
      ins(c, "player_stats", { id: `ps_${p.id}_${seasonId(start - 2)}`, player_id: p.id, season_id: seasonId(start - 2), team_name: career[2] ? `${career[2].club} · ${career[2].team}` : null, matches: s2.matches, starts: s2.starts, minutes: s2.minutes, goals: s2.goals, assists: s2.assists, yellow: s2.yellow, red: s2.red, callups: s2.callups, clean_sheets: s2.cs, verification: s2.ver, updated_at: updatedAt });
    }
    if (p.hasCurrentStats && p.clubId) {
      const m = R.int(c, 1, 3);
      const s3 = Math.min(m, Math.round(m * (p.prev.starts / Math.max(1, p.prev.matches)) + (c.rnd() - 0.5)));
      const g = p.pos === "DAV" || p.pos === "ED" || p.pos === "EE" ? R.int(c, 0, 2) : R.chance(c, 0.1) ? 1 : 0;
      ins(c, "player_stats", { id: `ps_${p.id}_${cur}`, player_id: p.id, season_id: cur, team_name: `${club!.name} · ${t!.name}`, matches: m, starts: Math.max(0, s3), minutes: Math.max(0, s3) * 84 + (m - Math.max(0, s3)) * 20, goals: g, assists: R.chance(c, 0.25) ? 1 : 0, yellow: R.chance(c, 0.2) ? 1 : 0, red: 0, callups: 3, clean_sheets: 0, verification: p.verification === "verified" ? "verified" : "updated", updated_at: updatedAt });
    }

    // vídeos (només metadades: a la demo no es pugen fitxers)
    const vTitles = ["Highlights temporada " + seasonLabel(start - 1), "Partido completo · jornada 12", "Accions defensives i duels", "Acciones ofensivas y goles", "Entrenamiento específico de posición"];
    for (let v = 0; v < p.videos; v++) {
      ins(c, "videos", { id: `v_${p.id}_${v}`, player_id: p.id, title: vTitles[v % vTitles.length], kind: v === 1 ? "partit" : "highlights", duration_s: v === 1 ? 5400 : R.int(c, 70, 240), recorded_at: ago(c, R.int(c, 20, 300)), views: R.int(c, 4, 180) });
    }
    const achList = ["Campeón de liga " + seasonLabel(start - 1), "Capitán del equipo", "Máximo goleador del equipo " + seasonLabel(start - 1), "Mejor jugador del torneo de Navidad", "Ascenso de categoría " + seasonLabel(start - 2)];
    for (let a = 0; a < p.achievements; a++) {
      ins(c, "achievements", { id: `a_${p.id}_${a}`, player_id: p.id, season_label: seasonLabel(start - 1 - a), title: achList[(a + p.hue) % achList.length], kind: "esportiu" });
    }
    if (R.chance(c, 0.35)) ins(c, "player_experiences", { id: `pe_${p.id}`, player_id: p.id, kind: "torneig", title: R.pick(c, ["Torneo de verano de fútbol base", "Campus de tecnificación", "Torneo internacional de Semana Santa"]), year: start - R.int(c, 1, 3) });

    const completeness = completenessScore({
      first_name: p.first, last_name: p.last, birth_date: p.birth, city: p.place.city, primary_position: p.pos, foot: p.foot,
      secondary_positions: p.sec, height_cm: p.height, description: p.description, style: p.style, languages: p.languages,
      availability: p.availability, careerCount: career.length, prevStats: true, currentStats: p.hasCurrentStats && !!p.clubId,
      videoCount: p.videos, achievementCount: p.achievements, preferencesSet: true, privacyReviewed: true,
    });

    ins(c, "players", {
      id: p.id, user_id: p.userId, first_name: p.first, last_name: p.last, gender: p.gender, birth_date: p.birth, nationality: "Espanyola",
      languages: p.languages, city: p.place.city, comarca: p.place.comarca, province: p.place.province, region: "Catalunya", country: "Espanya",
      lat: p.place.lat, lng: p.place.lng, primary_position: p.pos, secondary_positions: JSON.stringify(p.sec), foot: p.foot, height_cm: p.height,
      club_id: p.clubId, team_id: p.teamId, club_name_free: p.clubFree, category: p.category, division_rank: p.rank, style: p.style,
      description: p.description, availability: p.availability, available_from: p.availableFrom, contract_status: p.contract,
      attrs: JSON.stringify(p.attrs), avatar_hue: p.hue, verification: p.verification, guardian_user_id: p.guardianUserId,
      guardian_email: p.guardianEmail, guardian_consent: p.guardianConsent ? 1 : 0, preferences: JSON.stringify(p.preferences),
      privacy: JSON.stringify(p.privacy), completeness, onboarding_done: 1, updated_at: updatedAt, created_at: ago(c, p.updatedDaysAgo + R.int(c, 30, 300)),
    });

    matchInput.set(p.id, {
      primary_position: p.pos, secondary_positions: p.sec, birth_year: p.birthYear, gender: p.gender, division_rank: p.rank,
      lat: p.place.lat, lng: p.place.lng, city: p.place.city, availability: p.availability, available_from: p.availableFrom,
      foot: p.foot, height_cm: p.height, attrs: p.attrs, prev_minutes: p.prev.minutes, prev_matches: p.prev.matches,
      prev_starts: p.prev.starts, career_seasons: career.length, stats_verified: p.prev.ver === "verified",
    });
  }
  const pById = new Map(players.map((p) => [p.id, p]));
  const pname = (id: string) => { const p = pById.get(id)!; return `${p.first} ${p.last}`; };
  const isMinorP = (p: PlayerRec) => {
    const b = new Date(p.birth);
    let a = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
    return a < 18;
  };

  // ── Oportunitats ─────────────────────────────────────────────────────────────────
  type OfferDef = { id: string; club: string; team: string; kind?: "incorporacio" | "prova"; title: string; position: Position; level: number; km: number; foot?: string; height?: number; traits: string[]; daysAgo: number; trialIn?: number; description: string; restrictions?: string; availability?: string; status?: string };
  const OFFERS: OfferDef[] = [
    { id: "o_vn_central", club: HOME_CLUB_ID, team: "juva", title: "Buscamos central sub-19", position: "DC", level: 2, km: 30, foot: "esquerre", height: 180, traits: ["joc_aeri", "sortida_pilota", "defensa"], daysAgo: 12, availability: "temporada",
      description: "Buscamos un defensa central, preferiblemente zurdo, para el Juvenil A (Nacional). Queremos un central dominador del juego aéreo, con capacidad para salir jugando y liderazgo en la línea defensiva.",
      restrictions: "Entrenamientos lunes, miércoles y viernes de 19:30 a 21:00 h en Sabadell. Imprescindible poder asistir." },
    { id: "o_vn_ld", club: HOME_CLUB_ID, team: "cada", title: "Lateral derecho para el Cadete A", position: "LD", level: 2, km: 30, foot: "dret", traits: ["velocitat", "resistencia"], daysAgo: 5,
      description: "El Cadete A (Nacional) necesita un lateral derecho con recorrido, velocidad y capacidad de llegar a línea de fondo. El titular actual sube al Juvenil la próxima temporada.", restrictions: "Entrenamientos martes y jueves a las 18:00 h en Sabadell." },
    { id: "o_vn_ed", club: HOME_CLUB_ID, team: "juvb", title: "Extremo derecho desequilibrante", position: "ED", level: 4, km: 25, traits: ["regat", "velocitat"], daysAgo: 6,
      description: "Buscamos un extremo derecho con uno contra uno para el Juvenil B, con posibilidad de subir al Juvenil A." },
    { id: "o_vn_por", club: HOME_CLUB_ID, team: "ama", title: "Portero para el Amateur A", position: "POR", level: 4, km: 35, height: 182, traits: ["reflexos"], daysAgo: 25,
      description: "Portero para competir por la titularidad en el primer equipo amateur. Valoramos experiencia en categoría sénior." },
    { id: "o_vn_mcf", club: HOME_CLUB_ID, team: "juvf", title: "Centrocampista organizadora", position: "MC", level: 3, km: 30, traits: ["visio", "sortida_pilota"], daysAgo: 9,
      description: "El Juvenil Femenino busca una centrocampista con criterio para organizar el juego." },
    { id: "o_vn_prova", club: HOME_CLUB_ID, team: "juva", kind: "prova", title: "Jornada de pruebas · delanteros sub-19", position: "DAV", level: 4, km: 40, traits: ["gol"], daysAgo: 4, trialIn: 9,
      description: "Sesión de pruebas abierta para delanteros juveniles. Plazas limitadas: el club confirma cada inscripción." },

    { id: "o_pins_dc", club: "club_pins", team: "juva", title: "Central para el Juvenil A", position: "DC", level: 3, km: 45, traits: ["joc_aeri", "defensa"], daysAgo: 18, description: "Buscamos central para reforzar el Juvenil A de cara a la segunda vuelta." },
    { id: "o_med_prova", club: "club_mediterrani", team: "juva", kind: "prova", title: "Pruebas Juvenil A · defensas", position: "DC", level: 3, km: 40, traits: ["defensa"], daysAgo: 10, trialIn: 1, description: "Jornada de pruebas para defensas juveniles. Entrenamiento con el Juvenil A." },
    { id: "o_turo_mcd", club: "club_turo", team: "juva", title: "Pivote defensivo Juvenil A", position: "MCD", level: 3, km: 30, traits: ["posicionament", "sortida_pilota"], daysAgo: 8, description: "Buscamos un pivote de equilibrio para el Juvenil A." },
    { id: "o_masia_dc", club: "club_masia", team: "juva", title: "Central zurdo Juvenil", position: "DC", level: 4, km: 35, foot: "esquerre", traits: ["joc_aeri"], daysAgo: 14, description: "Central zurdo para el Juvenil A. Posibilidad de entrenar con el amateur." },
    { id: "o_ribera_dav", club: "club_ribera", team: "juva", title: "Delantero centro Juvenil A", position: "DAV", level: 3, km: 30, traits: ["gol", "fisic"], daysAgo: 5, description: "Delantero de referencia para un equipo que quiere luchar por el ascenso." },
    { id: "o_ribera_por", club: "club_ribera", team: "cada", title: "Portero Cadete A", position: "POR", level: 3, km: 25, traits: ["reflexos"], daysAgo: 22, description: "Portero para el Cadete A." },
    { id: "o_llev_mco", club: "club_llevant", team: "juva", title: "Mediapunta creativo", position: "MCO", level: 2, km: 30, traits: ["visio", "tecnica"], daysAgo: 11, description: "Mediapunta con último pase para el Juvenil A de División de Honor." },
    { id: "o_llev_f_dav", club: "club_llevant", team: "juvf", title: "Delantera Juvenil Femenino", position: "DAV", level: 3, km: 35, traits: ["gol", "velocitat"], daysAgo: 7, description: "Delantera con gol para el Juvenil Femenino." },
    { id: "o_serraverda_ld", club: "club_serraverda", team: "juva", title: "Lateral derecho Juvenil A", position: "LD", level: 3, km: 30, traits: ["resistencia", "velocitat"], daysAgo: 16, description: "Lateral derecho con proyección ofensiva." },
    { id: "o_torrent_ee", club: "club_torrent", team: "juva", title: "Extremo izquierdo", position: "EE", level: 3, km: 30, traits: ["regat"], daysAgo: 13, description: "Extremo izquierdo desequilibrante para el Juvenil A." },
    { id: "o_torrent_prova", club: "club_torrent", team: "cada", kind: "prova", title: "Pruebas abiertas Cadete A", position: "MC", level: 4, km: 30, traits: [], daysAgo: 3, trialIn: 6, description: "Jornada de pruebas para centrocampistas cadetes." },
    { id: "o_portal_dc", club: "club_portal", team: "juva", title: "Central División de Honor", position: "DC", level: 2, km: 40, height: 182, traits: ["joc_aeri", "defensa", "lideratge"], daysAgo: 19, description: "Central con experiencia para División de Honor juvenil." },
    { id: "o_delta_mc", club: "club_delta", team: "ama", title: "Centrocampista para el Amateur", position: "MC", level: 4, km: 25, traits: ["visio"], daysAgo: 12, description: "Centrocampista para el primer equipo amateur." },
    { id: "o_serralada_ed", club: "club_serralada", team: "juva", title: "Extremo para el Juvenil A", position: "ED", level: 4, km: 25, traits: ["velocitat", "regat"], daysAgo: 10, description: "Extremo rápido para completar la plantilla." },
    { id: "o_horitzo_f_mc", club: "club_horitzo", team: "juvf", title: "Centrocampista Juvenil Femenino", position: "MC", level: 4, km: 25, traits: ["resistencia"], daysAgo: 15, description: "Centrocampista para el Juvenil Femenino." },
    { id: "o_rambla_dav", club: "club_rambla", team: "ama", title: "Delantero Amateur A", position: "DAV", level: 4, km: 40, traits: ["gol"], daysAgo: 21, description: "Delantero para el primer equipo amateur." },
    { id: "o_fontclara_por", club: "club_fontclara", team: "juva", title: "Portero Juvenil A", position: "POR", level: 5, km: 25, traits: [], daysAgo: 24, description: "Portero para el Juvenil A." },
    { id: "o_ribes_prova", club: "club_ribes", team: "juva", kind: "prova", title: "Pruebas de pretemporada Juvenil", position: "EE", level: 5, km: 40, traits: [], daysAgo: 2, trialIn: 12, description: "Pruebas para extremos juveniles." },
    { id: "o_olivera_ld", club: "club_olivera", team: "ama", title: "Lateral para el Amateur", position: "LD", level: 5, km: 30, traits: [], daysAgo: 30, description: "Lateral derecho para el primer equipo.", status: "tancada" },
    { id: "o_planou_mcd", club: "club_planou", team: "cada", title: "Pivote Cadete A", position: "MCD", level: 5, km: 20, traits: ["posicionament"], daysAgo: 9, description: "Pivote para el Cadete A." },
    { id: "o_mirador_dc", club: "club_mirador", team: "juva", title: "Central Juvenil A", position: "DC", level: 5, km: 30, traits: [], daysAgo: 6, description: "Central para el Juvenil A." },
    { id: "o_vilamar_prova", club: "club_vilamar", team: "juva", kind: "prova", title: "Pruebas Juvenil", position: "MC", level: 5, km: 25, traits: [], daysAgo: 4, trialIn: 8, description: "Pruebas abiertas para centrocampistas juveniles." },
  ];

  const offerMatch = new Map<string, MatchOffer>();
  for (const o of OFFERS) {
    const t = teamById.get(`t_${clubSuffix(o.club)}_${o.team}`)!;
    const cl = clubById.get(o.club)!;
    const pl = placeByCity(cl.city)!;
    const [y0, y1] = t.category === "Cadete" ? [start - 15, start - 14] : t.category === "Juvenil" ? [start - 18, start - 16] : [start - 26, start - 19];
    const row = {
      id: o.id, club_id: o.club, team_id: t.id, kind: o.kind ?? "incorporacio", title: o.title, position: o.position, accepts_secondary: 1,
      category: t.category, gender: t.gender, birth_year_min: y0, birth_year_max: y1, level_min: o.level, zone_city: pl.city, zone_lat: pl.lat, zone_lng: pl.lng,
      max_km: o.km, foot: o.foot ?? "indiferent", height_min: o.height ?? null, traits: JSON.stringify(o.traits), availability_req: o.availability ?? "temporada",
      description: o.description, restrictions: o.restrictions ?? null, trial_date: o.trialIn !== undefined ? at(c, o.trialIn, 18, 30) : null,
      status: o.status ?? "oberta", created_by: staffOf[o.club], created_at: ago(c, o.daysAgo, R.int(c, 0, 8)), expires_at: at(c, 40 - o.daysAgo, 23, 59),
    };
    ins(c, "offers", row);
    offerMatch.set(o.id, {
      position: o.position, accepts_secondary: true, gender: t.gender, birth_year_min: y0, birth_year_max: y1, level_min: o.level,
      zone_city: pl.city, zone_lat: pl.lat, zone_lng: pl.lng, max_km: o.km, foot: o.foot ?? "indiferent", height_min: o.height ?? null, traits: o.traits, availability_req: o.availability ?? "temporada",
    });
  }
  const score = (pid: string, oid: string) => computeMatch(matchInput.get(pid)!, offerMatch.get(oid)!, now).score;

  // ── Candidatures ───────────────────────────────────────────────────────────
  const apps: { offer: string; player: string; status: string; daysAgo: number; msg?: string }[] = [];
  const addApp = (offer: string, player: string, status: string, daysAgo: number, msg?: string) => {
    if (apps.some((a) => a.offer === offer && a.player === player)) return;
    apps.push({ offer, player, status, daysAgo, msg });
  };
  // Pol
  addApp("o_pins_dc", "p_pol", "vista", 11, "¡Hola! Soy central zurdo del Juvenil A de la UE Serralada. Me gustaría mucho poder conoceros.");
  addApp("o_med_prova", "p_pol", "prova", 8, "Me interesa la jornada de pruebas. Puedo ir sin problema.");

  const visibleForApps = players.filter((p) => p.availability !== "no_disponible" && p.clubId !== HOME_CLUB_ID && p.id !== "p_pol" && p.id !== "p_biel" && p.id !== "p_hugo" && (!isMinorP(p) || p.guardianConsent));
  for (const o of OFFERS) {
    if (o.status === "tancada") continue;
    const ranked = visibleForApps
      .filter((p) => p.gender === offerMatch.get(o.id)!.gender && p.clubId !== o.club)
      .map((p) => ({ p, s: score(p.id, o.id) }))
      .filter((x) => x.s >= 52)
      .sort((a, b) => b.s - a.s);
    const n = o.id === "o_vn_central" ? 7 : o.club === HOME_CLUB_ID ? R.int(c, 3, 5) : R.int(c, 1, 3);
    const chosen = o.id === "o_vn_central" ? ranked.filter((x) => x.p.id !== "p_arnau").slice(0, 12) : ranked.slice(0, n + 3);
    let k = 0;
    for (const { p } of R.shuffle(c, chosen).slice(0, n)) {
      const st = o.club === HOME_CLUB_ID ? (k++ < (o.id === "o_vn_central" ? 3 : 1) ? "enviada" : "vista") : R.weighted(c, [["enviada", 35], ["vista", 30], ["contacte", 15], ["prova", 5], ["en_proces", 5], ["rebutjat", 10]]);
      addApp(o.id, p.id, st, R.int(c, 0, Math.max(1, o.daysAgo - 1)));
    }
  }

  // ── Pipeline del club principal ─────────────────────────────────────────────
  type PipeDef = { player: string; stage: Stage; team: string; offer?: string; daysAgo: number };
  const pipe: PipeDef[] = [];
  const addPipe = (d: PipeDef) => { if (!pipe.some((x) => x.player === d.player)) pipe.push(d); };
  addPipe({ player: "p_arnau", stage: "prova", team: "t_vn_juva", offer: "o_vn_central", daysAgo: 10 });
  addPipe({ player: "p_nil", stage: "contactat", team: "t_vn_juvb", offer: "o_vn_ed", daysAgo: 4 });

  const vnOfferIds = OFFERS.filter((o) => o.club === HOME_CLUB_ID).map((o) => o.id);
  const stagePlan: Stage[] = ["en_conversa", "en_conversa", "en_conversa", "contactat", "contactat", "interessant", "interessant", "interessant", "interessant", "revisar", "revisar", "revisar", "revisar", "nou", "nou", "nou", "nou", "prova", "en_espera", "en_espera", "rebutjat", "incorporat"];
  const cand = new Map<string, { p: PlayerRec; s: number; offer: string }>();
  for (const oid of vnOfferIds) {
    const om = offerMatch.get(oid)!;
    players
      .filter((p) => p.gender === om.gender && p.clubId !== HOME_CLUB_ID && p.id !== "p_pol" && p.id !== "p_biel" && p.id !== "p_hugo" && p.id !== "p_arnau" && p.id !== "p_nil" && (!isMinorP(p) || p.guardianConsent) && p.privacy.profile !== "ocult")
      .map((p) => ({ p, s: score(p.id, oid), offer: oid }))
      .filter((x) => x.s >= 55)
      .sort((a, b) => b.s - a.s)
      .slice(0, oid === "o_vn_central" ? 9 : 5)
      .forEach((x) => { if (!cand.has(x.p.id) || cand.get(x.p.id)!.s < x.s) cand.set(x.p.id, x); });
  }
  const candList = [...cand.values()].sort((a, b) => b.s - a.s);
  const appsOnVN = new Set(apps.filter((a) => vnOfferIds.includes(a.offer)).map((a) => a.player));
  let si = 0;
  for (const x of candList) {
    if (si >= stagePlan.length) break;
    // les candidatures noves (enviada) es queden fora del pipeline perquè el club les revisi
    if (appsOnVN.has(x.p.id) && R.chance(c, 0.5)) continue;
    const o = OFFERS.find((q) => q.id === x.offer)!;
    addPipe({ player: x.p.id, stage: stagePlan[si++], team: `t_vn_${o.team}`, offer: x.offer, daysAgo: R.int(c, 2, 28) });
  }

  const stageOrder: Stage[] = ["nou", "revisar", "interessant", "contactat", "en_conversa", "prova", "en_espera", "rebutjat", "incorporat"];
  pipe.forEach((e, i) => {
    const id = `pl_${e.player}`;
    const created = ago(c, e.daysAgo, R.int(c, 1, 8));
    ins(c, "pipeline_entries", { id, club_id: HOME_CLUB_ID, team_id: e.team, player_id: e.player, offer_id: e.offer ?? null, stage: e.stage, added_by: e.team === "t_vn_juva" && R.chance(c, 0.5) ? U.coach : U.director, sort: i, created_at: created, updated_at: ago(c, Math.max(0, e.daysAgo - R.int(c, 1, 3))) });
    ins(c, "pipeline_activity", { id: `pa_${e.player}_0`, club_id: HOME_CLUB_ID, player_id: e.player, entry_id: id, user_id: U.director, kind: "afegit", text: e.offer ? `Añadido al pipeline desde la oportunidad «${OFFERS.find((q) => q.id === e.offer)!.title}»` : "Añadido al pipeline", from_stage: null, to_stage: "nou", created_at: created });
    const target = stageOrder.indexOf(e.stage);
    const path = e.stage === "rebutjat" ? ["revisar", "rebutjat"] : e.stage === "en_espera" ? ["revisar", "interessant", "en_espera"] : e.stage === "incorporat" ? ["revisar", "interessant", "contactat", "en_conversa", "prova", "incorporat"] : stageOrder.slice(1, target + 1);
    let prevStage = "nou";
    path.forEach((s, k) => {
      ins(c, "pipeline_activity", { id: `pa_${e.player}_${k + 1}`, club_id: HOME_CLUB_ID, player_id: e.player, entry_id: id, user_id: k % 2 ? U.coach : U.director, kind: "etapa", text: `Etapa: ${STAGE_LABEL[prevStage as Stage]} → ${STAGE_LABEL[s as Stage]}`, from_stage: prevStage, to_stage: s, created_at: ago(c, Math.max(0, e.daysAgo - k - 1), R.int(c, 0, 6)) });
      prevStage = s;
    });
    // sincronitza la candidatura (si n'hi ha) amb l'etapa
    const ap = apps.find((a) => a.player === e.player && a.offer === e.offer);
    const mapped = stageToAppStatus(e.stage);
    if (ap && mapped) ap.status = mapped;
  });

  // Inserta candidatures
  apps.forEach((a, i) => {
    const t = ago(c, a.daysAgo, R.int(c, 1, 9));
    ins(c, "applications", { id: `ap_${i}`, offer_id: a.offer, player_id: a.player, origin: "jugador", status: a.status, message: a.msg ?? (R.chance(c, 0.5) ? "Hola, me interesa mucho la oportunidad. Quedo a vuestra disposición para cualquier información." : null), match_score: score(a.player, a.offer), created_at: t, updated_at: t });
  });

  // Pipelines d'altres clubs que inclouen en Pol (clubs interessats)
  const extPipe: [string, string, Stage, number][] = [["club_mediterrani", "t_mediterrani_juva", "prova", 8], ["club_pins", "t_pins_juva", "revisar", 10], ["club_turo", "t_turo_juva", "interessant", 5]];
  extPipe.forEach(([club, team, stage, d]) => ins(c, "pipeline_entries", { id: `pl_${clubSuffix(club)}_pol`, club_id: club, team_id: team, player_id: "p_pol", offer_id: club === "club_pins" ? "o_pins_dc" : club === "club_mediterrani" ? "o_med_prova" : null, stage, added_by: staffOf[club], sort: 0, created_at: ago(c, d), updated_at: ago(c, d - 1) }));

  // ── Contactes, converses i missatges ────────────────────────────────────────
  let convN = 0;
  let msgN = 0;
  const conv = (club: string, player: string, team: string | null, subject: string, msgs: { side: "club" | "player"; body: string; minsAgo: number; readClub?: boolean; readPlayer?: boolean }[]) => {
    const id = `cv_${++convN}`;
    const first = Math.max(...msgs.map((m) => m.minsAgo));
    const last = Math.min(...msgs.map((m) => m.minsAgo));
    ins(c, "conversations", { id, club_id: club, player_id: player, team_id: team, subject, status: "activa", created_at: ago(c, 0, 0, first), last_message_at: ago(c, 0, 0, last) });
    const pUser = pById.get(player)?.userId ?? null;
    for (const m of msgs) {
      const tIso = ago(c, 0, 0, m.minsAgo);
      ins(c, "messages", {
        id: `m_${++msgN}`, conversation_id: id, sender_user_id: m.side === "club" ? (club === HOME_CLUB_ID ? (team === "t_vn_juva" && msgN % 3 === 0 ? U.coach : U.director) : staffOf[club]) : pUser,
        sender_side: m.side, body: m.body, flagged: 0, created_at: tIso,
        read_by_club_at: m.side === "club" || m.readClub !== false ? tIso : null,
        read_by_player_at: m.side === "player" || m.readPlayer !== false ? tIso : null,
      });
    }
    return id;
  };
  const D = 24 * 60;
  let crN = 0;
  const cr = (club: string, player: string, team: string | null, reason: string, message: string, status: string, daysAgo: number, convId: string | null = null) => {
    ins(c, "contact_requests", { id: `cr_${++crN}`, club_id: club, player_id: player, team_id: team, from_user_id: staffOf[club], reason, message, status, conversation_id: convId, created_at: ago(c, daysAgo, 2), responded_at: status === "acceptada" || status === "rebutjada" ? ago(c, Math.max(0, daysAgo - 1)) : null, guardian_decided_at: null });
  };

  // Converses del club principal amb jugadors "en conversa" / "prova"
  const convPlayers = pipe.filter((e) => ["en_conversa", "prova", "incorporat", "en_espera"].includes(e.stage));
  const scripts = [
    (n: string, team: string) => [
      { side: "club" as const, body: `Hola ${n}, soy Marta Casanovas, directora deportiva del CF Vallès Nord. Hemos visto tu perfil y nos gustaría conocerte. ¿Tendrías unos minutos para hablar esta semana?`, minsAgo: 6 * D },
      { side: "player" as const, body: "¡Hola Marta! Muchas gracias por el mensaje, es una alegría. Sí, esta semana puedo cualquier tarde a partir de las 17 h.", minsAgo: 6 * D - 180 },
      { side: "club" as const, body: `Perfecto. Te propongo una videollamada el jueves a las 18:00 h para explicarte el proyecto del ${team}. ¿Te va bien?`, minsAgo: 5 * D },
      { side: "player" as const, body: "Me va perfecto. ¿Puede participar también mi padre?", minsAgo: 5 * D - 90 },
      { side: "club" as const, body: "Claro, de hecho lo preferimos. Te envío la invitación por aquí mismo.", minsAgo: 5 * D - 60 },
      { side: "player" as const, body: "Genial, muchas gracias. ¡Hasta el jueves!", minsAgo: 3 * 60, readClub: false },
    ],
    (n: string, team: string) => [
      { side: "club" as const, body: `Buenos días ${n}. Desde el CF Vallès Nord estamos siguiendo tu temporada. ¿Te gustaría venir a hacer un entrenamiento con el ${team}?`, minsAgo: 9 * D },
      { side: "player" as const, body: "¡Buenos días! Sí, me encantaría. ¿Qué días entrenáis?", minsAgo: 8 * D },
      { side: "club" as const, body: "Lunes, miércoles y viernes a las 19:30 h en Sabadell. Te proponemos venir el próximo miércoles.", minsAgo: 8 * D - 200 },
      { side: "player" as const, body: "Allí estaré. ¿Tengo que llevar algo especial?", minsAgo: 7 * D },
      { side: "club" as const, body: `Solo tu ropa de entrenamiento y botas de césped artificial. Te recibirá el cuerpo técnico del ${team}.`, minsAgo: 7 * D - 30 },
    ],
    (n: string, _team: string) => [
      { side: "club" as const, body: `Hola ${n}, gracias por aceptar la solicitud. Nos gustaría saber cuáles son tus planes para la próxima temporada.`, minsAgo: 3 * D },
      { side: "player" as const, body: "¡Hola! Ahora mismo estoy bien en mi club, pero estoy abierto a escuchar propuestas para el año que viene.", minsAgo: 2 * D },
      { side: "club" as const, body: "Entendido. Te seguiremos durante la temporada y te volveremos a escribir más adelante. ¡Mucha suerte!", minsAgo: 2 * D - 45 },
      { side: "player" as const, body: "¡Muchas gracias a vosotros!", minsAgo: 20 * 60, readClub: false },
    ],
  ];
  convPlayers.forEach((e, i) => {
    const p = pById.get(e.player)!;
    const script = scripts[i % scripts.length](p.first, teamById.get(e.team)?.name ?? "equip");
    const cid = conv(HOME_CLUB_ID, e.player, e.team, e.offer ? OFFERS.find((o) => o.id === e.offer)!.title : "Seguiment", script);
    cr(HOME_CLUB_ID, e.player, e.team, e.offer ? "oferta" : "seguiment", script[0].body, "acceptada", Math.round(script[0].minsAgo / D) + 1, cid);
  });
  // Contactes pendents (etapa contactat)
  pipe.filter((e) => e.stage === "contactat" && e.player !== "p_nil").forEach((e) => {
    cr(HOME_CLUB_ID, e.player, e.team, "oferta", `Hola ${pById.get(e.player)!.first}, te escribimos desde el CF Vallès Nord por la oportunidad «${OFFERS.find((o) => o.id === e.offer)?.title ?? "del club"}». ¿Te gustaría hablarlo?`, "pendent", 2);
  });
  // Nil (menor): cal autorització del tutor
  cr(HOME_CLUB_ID, "p_nil", "t_vn_juvb", "oferta", "Hola Nil, desde el CF Vallès Nord nos gustaría invitarte a conocer nuestro Juvenil B, con posibilidad de subir al Juvenil A.", "pendent_tutor", 1);
  // Una sol·licitud rebutjada
  const rej = pipe.find((e) => e.stage === "rebutjat");
  if (rej) cr(HOME_CLUB_ID, rej.player, rej.team, "seguiment", "Hola, nos gustaría conocerte de cara a la próxima temporada.", "rebutjada", 12);

  // En Pol: conversa amb FC Mediterrani (prova demà) i sol·licitud pendent de CE Masia Nova
  const polConv = conv("club_mediterrani", "p_pol", "t_mediterrani_juva", "Pruebas Juvenil A · defensas", [
    { side: "club", body: "Hola Pol, soy el director deportivo del FC Mediterrani. Hemos recibido tu inscripción a la jornada de pruebas. Te esperamos mañana a las 18:30 h en el Campo Municipal Mediterrani (Badalona).", minsAgo: 2 * D },
    { side: "player", body: "¡Muchas gracias! Allí estaré. ¿A qué hora hay que estar para cambiarse?", minsAgo: 2 * D - 120 },
    { side: "club", body: "Con media hora de antelación es suficiente. Trae botas para césped artificial. ¡Nos vemos mañana!", minsAgo: 5 * 60, readPlayer: false },
  ]);
  cr("club_mediterrani", "p_pol", "t_mediterrani_juva", "prova", "Hola Pol, hemos visto tu inscripción. Queremos confirmarte la prueba.", "acceptada", 3, polConv);
  cr("club_masia", "p_pol", "t_masia_juva", "oferta", "¡Hola Pol! Somos el CE Masia Nova (Manresa). Buscamos un central zurdo para el Juvenil A y tu perfil encaja mucho con lo que necesitamos. ¿Te gustaría que habláramos?", "pendent", 0);

  // ── Esdeveniments (calendari) ───────────────────────────────────────────────
  let evN = 0;
  const ev = (o: { club?: string | null; team?: string | null; player?: string | null; owner?: string | null; kind: string; title: string; day: number; h: number; m?: number; dur?: number; location?: string; opponent?: string; notes?: string; related?: string | null }) => {
    const s = madridAt(now, o.day, o.h, o.m ?? 0);
    ins(c, "events", { id: `ev_${++evN}`, club_id: o.club ?? null, team_id: o.team ?? null, player_id: o.player ?? null, owner_user_id: o.owner ?? null, kind: o.kind, title: o.title, starts_at: iso(s), ends_at: iso(new Date(s.getTime() + (o.dur ?? 90) * 60000)), location: o.location ?? null, opponent: o.opponent ?? null, notes: o.notes ?? null, related_player_id: o.related ?? null, created_at: ago(c, 10) });
  };
  // dia de la setmana d'avui (0 = dilluns) a Madrid
  const todayW = (() => { const w = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short" }).format(now); return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(w); })();
  const nextW = (w: number, weekOffset = 0) => ((w - todayW + 7) % 7) + weekOffset * 7;
  const opponents = FILLER_TEAMS.slice(0, 12);
  for (let wk = -3; wk <= 5; wk++) {
    // partits
    ev({ club: HOME_CLUB_ID, team: "t_vn_juva", kind: "partit", title: `${wk % 2 ? "CF Vallès Nord – " + opponents[(wk + 6) % 12] : opponents[(wk + 6) % 12] + " – CF Vallès Nord"} (Juvenil A)`, day: nextW(5, 0) + wk * 7, h: 17, dur: 105, location: wk % 2 ? "Campo Municipal Vallès Nord" : "Campo visitante", opponent: opponents[(wk + 6) % 12] });
    ev({ club: HOME_CLUB_ID, team: "t_vn_cada", kind: "partit", title: `Cadete A · ${opponents[(wk + 9) % 12]}`, day: nextW(5, 0) + wk * 7, h: 11, dur: 95, location: wk % 2 ? "Campo Municipal Vallès Nord" : "Campo visitante", opponent: opponents[(wk + 9) % 12] });
    ev({ club: HOME_CLUB_ID, team: "t_vn_ama", kind: "partit", title: `Amateur A · ${opponents[(wk + 3) % 12]}`, day: nextW(6, 0) + wk * 7, h: 12, dur: 105, location: wk % 2 ? "Campo visitante" : "Campo Municipal Vallès Nord", opponent: opponents[(wk + 3) % 12] });
    // entrenaments Juvenil A
    for (const d of [0, 2, 4]) ev({ club: HOME_CLUB_ID, team: "t_vn_juva", kind: "entrenament", title: "Entrenamiento Juvenil A", day: nextW(d, 0) + wk * 7, h: 19, m: 30, dur: 90, location: "Campo Municipal Vallès Nord" });
    ev({ club: HOME_CLUB_ID, team: "t_vn_cada", kind: "entrenament", title: "Entrenamiento Cadete A", day: nextW(1, 0) + wk * 7, h: 18, dur: 90, location: "Campo anexo Vallès Nord" });
    // reunió de coordinació
    ev({ club: HOME_CLUB_ID, team: null, owner: U.director, kind: "reunio", title: "Reunión de coordinación técnica", day: nextW(1, 0) + wk * 7, h: 21, dur: 60, location: "Oficinas del club" });
  }
  // proves i scouting
  const arnauEntry = pipe.find((e) => e.player === "p_arnau")!;
  ev({ club: HOME_CLUB_ID, team: "t_vn_juva", owner: U.coach, kind: "prova", title: `Prueba: ${pname("p_arnau")}`, day: 1, h: 19, m: 30, dur: 90, location: "Campo Municipal Vallès Nord", related: "p_arnau", notes: "Entrena con el Juvenil A. Observar salida de balón y comunicación." });
  void arnauEntry;
  const otherProva = pipe.find((e) => e.stage === "prova" && e.player !== "p_arnau");
  if (otherProva) ev({ club: HOME_CLUB_ID, team: otherProva.team, owner: U.director, kind: "prova", title: `Prueba: ${pname(otherProva.player)}`, day: 3, h: 18, dur: 90, location: "Campo anexo Vallès Nord", related: otherProva.player });
  ev({ club: HOME_CLUB_ID, team: "t_vn_juva", owner: U.director, kind: "scouting", title: "Observación: UE Serralada – CF Turó Alt (Juvenil)", day: nextW(6, 0), h: 11, m: 30, dur: 105, location: "Terrassa", notes: "Seguir a los centrales de los dos equipos (oportunidad central sub-19)." });
  ev({ club: HOME_CLUB_ID, team: "t_vn_juvb", owner: U.director, kind: "scouting", title: "Observación: CF Horitzó – FC Delta Sud (Juvenil)", day: nextW(5, 1), h: 16, dur: 105, location: "Cerdanyola del Vallès" });
  const talk = pipe.find((e) => e.stage === "en_conversa");
  if (talk) ev({ club: HOME_CLUB_ID, team: talk.team, owner: U.director, kind: "trucada", title: `Videollamada con ${pname(talk.player)}`, day: nextW(3, 0) === 0 ? 7 : nextW(3, 0), h: 18, dur: 30, location: "Videollamada (enlace por ScoutUp)", related: talk.player });
  ev({ club: HOME_CLUB_ID, team: null, owner: U.director, kind: "reunio", title: "Reunión con familias · Juvenil A", day: 8, h: 20, dur: 60, location: "Salón de actos del club" });

  // Esdeveniments d'en Pol
  ev({ player: "p_pol", owner: U.player, kind: "prova", title: "Prueba con el FC Mediterrani (Juvenil A)", day: 1, h: 18, m: 30, dur: 90, location: "Camp Municipal Mediterrani · Badalona", notes: "Llegar 30 min antes. Botas de césped artificial." });
  for (let wk = -2; wk <= 4; wk++) {
    ev({ player: "p_pol", owner: U.player, kind: "partit", title: `UE Serralada – ${opponents[(wk + 4) % 12]}`, day: nextW(6, 0) + wk * 7, h: 11, m: 30, dur: 105, location: wk % 2 ? "Campo visitante" : "Camp Municipal Serralada" });
    for (const d of [1, 3]) ev({ player: "p_pol", owner: U.player, kind: "entrenament", title: "Entrenamiento Juvenil A · UE Serralada", day: nextW(d, 0) + wk * 7, h: 19, dur: 90, location: "Camp Municipal Serralada" });
  }
  ev({ player: "p_pol", owner: U.player, kind: "recordatori", title: "Actualizar estadísticas de la temporada", day: 2, h: 20, dur: 15 });

  // ── Avaluacions, notes i informes de scouting ────────────────────────────────
  const evalFor = (pid: string, author: string, bias: number, decision: string, comment: string, daysAgo: number) => {
    const p = pById.get(pid)!;
    const a = p.attrs;
    const v = (x: number) => clamp(Math.round(x + bias + (c.rnd() * 1.4 - 0.7)), 3, 10);
    const scores = {
      tecnica: { control: v(a.tecnica ?? 6), passada: v(a.passada ?? 6), conduccio: v(((a.tecnica ?? 6) + (a.regat ?? 6)) / 2) },
      tactica: { posicionament: v(a.posicionament ?? 6), lectura: v(a.visio ?? 6), pressio: v(((a.resistencia ?? 6) + (a.posicionament ?? 6)) / 2) },
      fisica: { velocitat: v(a.velocitat ?? 6), resistencia: v(a.resistencia ?? 6), duel: v(a.forca ?? 6) },
      mental: { concentracio: v(6.5), competitivitat: v(7), resiliencia: v(6.5) },
      social: { companyonia: v(7), comunicacio: v(a.lideratge ?? 6), compromis: v(7) },
    };
    ins(c, "evaluations", { id: `e_${pid}_${author}`, club_id: HOME_CLUB_ID, player_id: pid, author_user_id: author, team_id: pipe.find((x) => x.player === pid)?.team ?? null, scores: JSON.stringify(scores), decision, comment, context: ["Partido de liga", "Sesión de entrenamiento", "Vídeo del partido", "Torneo"][(pid.length + daysAgo) % 4], created_at: ago(c, daysAgo), updated_at: ago(c, daysAgo) });
  };
  evalFor("p_arnau", U.director, 0.3, "prova", "Central muy completo. Dominante por alto y con liderazgo. Hay que verlo en la salida de balón bajo presión.", 9);
  evalFor("p_arnau", U.coach, 0.1, "fitxar", "Encaja perfectamente con lo que necesitamos. Mucha personalidad.", 3);
  pipe.filter((e) => ["interessant", "en_conversa", "prova", "en_espera", "incorporat"].includes(e.stage) && e.player !== "p_arnau").slice(0, 9).forEach((e, i) => {
    evalFor(e.player, i % 3 === 0 ? U.coach : U.director, c.rnd() - 0.4, e.stage === "en_espera" ? "seguir" : e.stage === "prova" ? "prova" : e.stage === "incorporat" ? "fitxar" : R.pick(c, ["seguir", "prova"]), R.pick(c, [
      "Buen perfil técnico. Le falta algo de físico para la categoría, pero tiene margen de mejora.",
      "Jugador inteligente, siempre bien perfilado. Habría que verlo contra rivales de más nivel.",
      "Muy intenso y competitivo. Gestiona bien el error y contagia al equipo.",
      "Interesante para la próxima temporada. De momento, seguirlo.",
    ]), R.int(c, 2, 20));
  });

  const noteTexts = [
    "Hablado con su entrenador actual: muy buena actitud en los entrenamientos.",
    "La familia prioriza que pueda compaginarlo con los estudios. Horarios de entrenamiento clave.",
    "Visto en directo el sábado: buen partido, dos cortes decisivos y buena comunicación.",
    "También está interesado otro club de la zona. No alargar mucho la decisión.",
    "Pedir vídeo del partido completo antes de invitarlo a una prueba.",
    "Contrato hasta final de temporada: buena oportunidad para el verano.",
    "Puede jugar también de lateral en caso de necesidad.",
    "Recomendado por el coordinador del Amateur.",
  ];
  let noteN = 0;
  pipe.slice(0, 14).forEach((e, i) => {
    ins(c, "notes", { id: `n_${++noteN}`, club_id: HOME_CLUB_ID, player_id: e.player, author_user_id: i % 3 === 1 ? U.coach : U.director, team_id: e.team, body: noteTexts[i % noteTexts.length], created_at: ago(c, R.int(c, 1, 20), R.int(c, 0, 10)) });
  });
  ins(c, "notes", { id: `n_${++noteN}`, club_id: HOME_CLUB_ID, player_id: "p_arnau", author_user_id: U.coach, team_id: "t_vn_juva", body: "Le hemos pedido que venga a la prueba con el material de su club. Hablar con su entrenador después.", created_at: ago(c, 1, 3) });

  const scoutPool = players.filter((p) => p.clubId !== HOME_CLUB_ID && p.gender === "M" && p.category === "Juvenil" && p.privacy.profile !== "ocult" && (!isMinorP(p) || p.guardianConsent)).slice(0, 40);
  const reportPlayers = ["p_biel", "p_arnau", ...R.shuffle(c, scoutPool.map((p) => p.id)).filter((id) => id !== "p_biel" && id !== "p_arnau" && id !== "p_pol").slice(0, 8)];
  reportPlayers.forEach((pid, i) => {
    const p = pById.get(pid)!;
    const t = p.teamId ? teamById.get(p.teamId) : null;
    ins(c, "scout_reports", {
      id: `sr_${i + 1}`, club_id: HOME_CLUB_ID, author_user_id: i % 2 ? U.coach : U.director, team_id: "t_vn_juva", player_id: pid,
      match_title: t ? `${t.club.name} – ${R.pick(c, FILLER_TEAMS)}` : "Partido amistoso",
      match_date: ago(c, R.int(c, 2, 35)), competition: t ? `${t.category} ${levelLabel(t.rank)}` : null, position_observed: p.pos,
      rating: pid === "p_biel" ? 8 : pid === "p_arnau" ? 8 : R.int(c, 5, 8),
      observations: pid === "p_biel"
        ? "Central zurdo con muy buena salida de balón y tiempo en el pase. Gana muchos duelos aéreos. Juega pocos minutos en su equipo: oportunidad."
        : R.pick(c, ["Buen partido. Destaca en la lectura defensiva y en la anticipación.", "Jugador con mucha energía, pero precipitado con balón.", "Muy buena actitud. Técnicamente correcto, le falta velocidad.", "Presencia física importante. Debe mejorar la toma de decisiones."]),
      recommendation: pid === "p_biel" ? "contactar" : pid === "p_arnau" ? "prova" : R.pick(c, ["seguir", "seguir", "contactar", "descartar"]),
      reminder_at: pid === "p_biel" ? at(c, 4, 10) : R.chance(c, 0.3) ? at(c, R.int(c, 3, 20), 10) : null,
      created_at: ago(c, R.int(c, 1, 30)),
    });
  });

  // ── Plantilles (roster) del club principal, 3 temporades ────────────────────
  const rosterPos: Record<string, Position[]> = {
    Juvenil: ["POR", "POR", "LD", "LD", "DC", "DC", "DC", "LE", "MCD", "MCD", "MC", "MC", "MCO", "MCO", "ED", "ED", "EE", "EE", "DAV", "DAV"],
    Cadete: ["POR", "POR", "LD", "DC", "DC", "DC", "LE", "MCD", "MC", "MC", "MCO", "ED", "ED", "EE", "DAV", "DAV", "MC"],
    Infantil: ["POR", "LD", "DC", "DC", "LE", "MCD", "MC", "MC", "MCO", "ED", "EE", "DAV", "DAV", "DC"],
    Amateur: ["POR", "POR", "LD", "LD", "DC", "DC", "DC", "LE", "LE", "MCD", "MC", "MC", "MCO", "ED", "EE", "DAV", "DAV", "ED"],
  };
  for (const t of teams.filter((x) => x.clubId === HOME_CLUB_ID)) {
    // grup de jugadors (externs) amb anys de naixement, perquè hi hagi continuïtat entre temporades
    const [ya, yb] = t.category === "Cadete" ? [start - 16, start - 13] : t.category === "Juvenil" ? [start - 20, start - 15] : t.category === "Infantil" ? [start - 14, start - 11] : [start - 30, start - 18];
    const pool: { name: string; pos: Position; by: number; foot: string; rating: number }[] = [];
    for (let i = 0; i < 44; i++) {
      const nm = genName(t.gender as "M" | "F");
      const pos = rosterPos[t.category][i % rosterPos[t.category].length];
      pool.push({ name: `${nm.first} ${nm.last.split(" ")[0]}`, pos, by: R.int(c, ya, yb), foot: pos === "LE" || pos === "EE" ? "esquerre" : R.chance(c, 0.15) ? "esquerre" : "dret", rating: 5.5 + c.rnd() * 2.8 });
    }
    for (const s of seasons) {
      const range = t.category === "Cadete" ? [s - 15, s - 14] : t.category === "Juvenil" ? [s - 18, s - 16] : t.category === "Infantil" ? [s - 13, s - 12] : [s - 30, s - 19];
      let squad = pool.filter((x) => x.by >= range[0] && x.by <= range[1]);
      // assegura una plantilla completa per posicions
      const need = rosterPos[t.category];
      const chosen: typeof squad = [];
      for (const ps of need) {
        const i = squad.findIndex((x) => x.pos === ps && !chosen.includes(x));
        if (i >= 0) chosen.push(squad[i]);
        else {
          const nm = genName(t.gender as "M" | "F");
          const extra = { name: `${nm.first} ${nm.last.split(" ")[0]}`, pos: ps, by: R.int(c, range[0], range[1]), foot: ps === "LE" || ps === "EE" ? "esquerre" : "dret", rating: 5.5 + c.rnd() * 2.5 };
          pool.push(extra);
          chosen.push(extra);
        }
      }
      squad = chosen;
      // Juvenil A actual: els centrals són dretans i dos acaben etapa (cas de la demo)
      if (t.key === "juva" && s === start) {
        const dcs = squad.filter((x) => x.pos === "DC");
        dcs.forEach((x, k) => { x.foot = "dret"; x.by = k < 2 ? start - 18 : start - 17; });
      }
      const tsId = teamSeasonId(t.id, s);
      squad.forEach((x, i) => {
        const last = s === start && x.by === range[0] && t.category !== "Amateur";
        ins(c, "roster_entries", {
          id: `re_${tsId}_${i}`, team_season_id: tsId, player_id: null, external_name: x.name, shirt: x.pos === "POR" ? (i === 0 ? 1 : 13) : i + 2,
          position: x.pos, foot: x.foot, status: last ? "baixa" : x.rating > 7 ? "titular" : x.by === range[1] ? "jove" : "rotacio",
          rating: Math.round(x.rating * 10) / 10, trend: R.pick(c, [-1, 0, 0, 1, 1]), birth_year: x.by,
        });
      });
      // jugadors del club que també són a la plataforma
      players.filter((p) => p.teamId === t.id && s === start).forEach((p, k) => ins(c, "roster_entries", {
        id: `re_${tsId}_p${k}`, team_season_id: tsId, player_id: p.id, external_name: null, shirt: 20 + k, position: p.pos, foot: p.foot,
        status: "rotacio", rating: 6.8, trend: 1, birth_year: p.birthYear,
      }));
    }
  }

  // ── Favorits, visites al perfil, bloquejos ───────────────────────────────────
  let favN = 0;
  const fav = (user: string, type: string, target: string, d: number) => ins(c, "favorites", { id: `f_${++favN}`, user_id: user, target_type: type, target_id: target, created_at: ago(c, d) });
  fav(U.director, "player", "p_arnau", 12);
  pipe.slice(2, 7).forEach((e, i) => fav(U.director, "player", e.player, 5 + i));
  fav(U.coach, "player", "p_arnau", 4);
  fav(U.player, "offer", "o_turo_mcd", 3);
  fav(U.player, "offer", "o_portal_dc", 6);
  fav(U.player, "club", "club_turo", 9);
  fav(staffOf["club_mediterrani"], "player", "p_pol", 7);
  fav(staffOf["club_turo"], "player", "p_pol", 4);

  let pvN = 0;
  const view = (club: string, pid: string, d: number, h = 0) => ins(c, "profile_views", { id: `pv_${++pvN}`, club_id: club, player_id: pid, viewer_user_id: staffOf[club] ?? null, created_at: ago(c, d, h) });
  [["club_mediterrani", 9], ["club_mediterrani", 3], ["club_pins", 10], ["club_pins", 2], ["club_turo", 5], ["club_turo", 1], ["club_masia", 1], ["club_portal", 14], ["club_torrent", 21], ["club_ribera", 26], ["club_llevant", 6], ["club_delta", 18], ["club_serraverda", 12]].forEach(([cl, d]) => view(cl as string, "p_pol", d as number, R.int(c, 1, 9)));
  for (const p of players) {
    if (p.id === "p_pol") continue;
    const n = R.int(c, 0, 6);
    for (let k = 0; k < n; k++) view(R.pick(c, CLUBS.filter((x) => x.id !== p.clubId)).id, p.id, R.int(c, 0, 45), R.int(c, 0, 12));
  }
  ins(c, "blocks", { id: "b_1", player_id: "p_pol", club_id: "club_vilamar", created_at: ago(c, 40) });

  // ── Notificacions ────────────────────────────────────────────────────────────
  let ntN = 0;
  const nt = (user: string, kind: string, title: string, body: string | null, link: string | null, minsAgo: number, read = false) =>
    ins(c, "notifications", { id: `nt_${++ntN}`, user_id: user, kind, title, body, link, created_at: ago(c, 0, 0, minsAgo), read_at: read ? ago(c, 0, 0, Math.max(0, minsAgo - 30)) : null });
  const talkConv = convPlayers.length ? "cv_1" : null;
  nt(U.director, "match", "3 nuevos perfiles coinciden con tu necesidad.", "Oportunidad «Buscamos central sub-19» · compatibilidad superior al 80%.", "/club/oportunitats/o_vn_central", 95);
  nt(U.director, "contact", "Un jugador ha aceptado tu solicitud.", convPlayers[0] ? `${pname(convPlayers[0].player)} ha aceptado hablar con el club.` : null, talkConv ? `/club/missatges/${talkConv}` : "/club/missatges", 5 * 60);
  nt(U.director, "application", "Nuevas solicitudes en «Buscamos central sub-19»", "Tienes candidaturas pendientes de revisar.", "/club/oportunitats/o_vn_central?tab=sollicituds", 7 * 60);
  nt(U.director, "event", "Mañana tienes una prueba programada.", `${pname("p_arnau")} · 19:30 h · Campo Municipal Vallès Nord`, "/club/calendari", 9 * 60);
  nt(U.director, "message", "Nuevo mensaje", "Tienes mensajes sin leer en la bandeja.", "/club/missatges", 3 * 60);
  nt(U.director, "system", "Oportunidad «Portero para el Amateur A» caduca pronto", "Quedan 15 días. Puedes ampliarla o cerrarla.", "/club/oportunitats/o_vn_por", 2 * D, true);
  nt(U.director, "match", "Nuevo perfil compatible con «Lateral derecho para el Cadete A»", null, "/club/oportunitats/o_vn_ld", 3 * D, true);
  nt(U.coach, "match", "3 nuevos perfiles coinciden con tu necesidad.", "Central zurdo para el Juvenil A.", "/club/oportunitats/o_vn_central", 95);
  nt(U.coach, "event", "Mañana tienes una prueba programada.", `${pname("p_arnau")} · 19:30 h`, "/club/calendari", 9 * 60);
  nt(U.coach, "system", "La dirección te ha asignado un nuevo jugador en el pipeline", null, "/club/pipeline", 2 * D, true);

  nt(U.player, "match", "Nueva oportunidad 89% compatible.", "CF Vallès Nord · «Buscamos central sub-19».", "/jugador/oportunitats/o_vn_central", 50);
  nt(U.player, "interest", "Nuevo club interesado en tu perfil.", "Un club ha añadido tu perfil a su lista de seguimiento.", "/jugador/seguiment", 4 * 60);
  nt(U.player, "contact", "Nueva solicitud de contacto", "CE Masia Nova quiere hablar contigo.", "/jugador/missatges", 2 * 60);
  nt(U.player, "event", "Mañana tienes una prueba programada.", "FC Mediterrani · 18:30 h · Badalona", "/jugador/calendari", 6 * 60);
  nt(U.player, "profile", "Tu perfil lleva 2 meses sin actualizarse.", "Los perfiles actualizados reciben más visitas de los clubes.", "/jugador/perfil/editar", 22 * 60);
  nt(U.player, "application", "UE Els Pins ha visto tu perfil", "Solicitud «Central para el Juvenil A».", "/jugador/seguiment", 3 * D, true);
  nt(U.player, "match", "Nueva oportunidad 74% compatible.", "CF Turó Alt · «Pivot defensiu Juvenil A».", "/jugador/oportunitats/o_turo_mcd", 5 * D, true);

  nt(U.tutor, "contact", "CF Vallès Nord quiere contactar con Nil.", "Hace falta tu autorización antes de que el club pueda escribirle.", "/tutor", 20 * 60);
  nt(U.tutor, "profile", "El perfil de Nil ha recibido 4 visitas esta semana.", null, "/tutor", 2 * D, true);

  // Informe de moderació d'exemple
  ins(c, "reports", { id: "rp_1", reporter_user_id: U.player, target_type: "club", target_id: "club_vilamar", reason: "Club no verificado pide datos personales", details: "Me pidieron el teléfono por un canal externo.", status: "revisada", created_at: ago(c, 40) });
}

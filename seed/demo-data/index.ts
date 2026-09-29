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
import { CLUBS, CLUB_TEXTS, HOME_CLUB_ID } from "./clubs.ts";
import type { ClubDef } from "./clubs.ts";
import { MALE_NAMES, FEMALE_NAMES, SURNAMES, BLOCKED_COMBOS, FILLER_TEAMS, COACH_NAMES } from "./names.ts";
import {
  POSITIONS, POSITION_LABEL, levelLabel, currentSeasonStartYear, seasonLabel, seasonId, DEFAULT_PRIVACY,
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
  POR: ["Porter de reflexos i bon joc de peus", "Porter dominador de l'àrea", "Porter àgil, fort en l'u contra u"],
  LD: ["Lateral de recorregut, arriba a línia de fons", "Lateral defensiu i ordenat", "Carriler amb molta projecció"],
  LE: ["Lateral esquerre ofensiu i intens", "Lateral fiable en defensa, bona centrada", "Carriler de molt recorregut"],
  DC: ["Central contundent, dominador del joc aeri", "Central amb sortida de pilota", "Central ràpid, bo a l'espai"],
  MCD: ["Pivot d'equilibri, recuperador", "Mig defensiu amb bona lectura", "Pivot posicional, primer passador"],
  MC: ["Interior de recorregut box to box", "Migcampista d'associació", "Mig organitzador, ritme i pausa"],
  MCO: ["Mitjapunta creatiu, últim passador", "Enganxe amb arribada a l'àrea", "Mitjapunta entre línies"],
  ED: ["Extrem desequilibrant a l'u contra u", "Extrem a cama canviada, diagonal i xut", "Extrem ràpid i profund"],
  EE: ["Extrem esquerre vertical", "Extrem associatiu a banda esquerra", "Extrem de desbordament"],
  DAV: ["Davanter de referència, bo d'esquena", "Davanter mòbil, ataca l'espai", "Rematador d'àrea"],
};
const DESC_BY_POS: Record<string, string[]> = {
  POR: ["Porter amb bona comunicació amb la defensa i molt treball en la sortida de pilota. Busco un projecte on créixer i competir.", "Molt segur per alt i ràpid a terra. Treballo cada setmana el joc de peus i vull fer un pas endavant de categoria."],
  DEF: ["Defensa intens i ordenat, m'agrada sortir jugant des de darrere i ajudar l'equip a pressionar amunt. Compromès i puntual.", "Jugador competitiu, fort en el duel i amb bona lectura de les jugades. Busco un club amb un projecte formatiu seriós."],
  MIG: ["Migcampista amb criteri, m'agrada tenir la pilota i donar ritme a l'equip. Treballador en defensa i amb arribada.", "Jugador d'equip, intel·ligent tàcticament i amb molt recorregut. Vull continuar creixent en un entorn exigent."],
  ATK: ["Jugador d'atac vertical, m'agrada encarar i generar ocasions. Bona definició i molta mobilitat.", "Atacant amb gol i desmarcatge, treballo molt la pressió alta. Busco minuts i un projecte on sumar."],
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
  const nowIso = iso(now);

  for (const y of seasons) ins(c, "seasons", { id: seasonId(y), label: seasonLabel(y), start_year: y, is_current: y === start ? 1 : 0 });

  // ── Usuaris de demo ─────────────────────────────────────────────────────────
  const demoHash = hashPassword("demo");
  const U = {
    director: "u_director",
    coach: "u_coach",
    coachCadet: "u_coach_cadet",
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
      office_hours: "De dilluns a divendres, de 17:30 a 20:30 h",
      languages: "Català, castellà",
      description: cl.id === HOME_CLUB_ID
        ? "Club del Vallès Occidental amb més de seixanta anys d'història i una de les estructures de futbol base més completes de la comarca: set equips, del Infantil al primer equip amateur, i un equip juvenil femení en plena progressió."
        : t.description,
      history: `Fundat el ${cl.founded} a ${place.city}. ${cl.tier === 1 ? "Ha format jugadors que han arribat a categories nacionals i és un club de referència per a les famílies de la zona." : cl.tier === 2 ? "Club amb una base molt arrelada al municipi, que ha viscut diversos ascensos en les categories formatives." : "Entitat jove que ha crescut ràpidament gràcies al treball de voluntaris i famílies."}`,
      philosophy: t.philosophy, values_text: t.values, objectives: t.objectives, sporting_model: t.model,
      facilities: JSON.stringify([
        { name: `Camp Municipal ${cl.short}`, type: "Gespa artificial · Futbol 11", note: "Seu dels partits oficials" },
        { name: `Camp annex ${cl.short}`, type: "Gespa artificial · Futbol 7", note: "Entrenaments de base" },
        ...(cl.tier === 1 ? [{ name: "Sala de vídeo i gimnàs", type: "Instal·lacions complementàries", note: "Ús de tots els equips A" }] : []),
      ]),
      tier: cl.tier, verified: cl.verified ? 1 : 0, created_at: ago(c, 400 - idx * 7),
    });

    // Usuari responsable de cada club (no pot iniciar sessió; serveix d'autor dels missatges)
    if (cl.id !== HOME_CLUB_ID) {
      const uid = `u_staff_${clubSuffix(cl.id)}`;
      staffOf[cl.id] = uid;
      ins(c, "users", {
        id: uid, email: `direccio@${s}.example`, password_hash: "!", name: COACH_NAMES[idx % COACH_NAMES.length], role: "director",
        title: "Direcció esportiva", club_id: cl.id, avatar_hue: (idx * 37) % 360, is_demo_login: 0, created_at: ago(c, 300),
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
  ins(c, "users", { id: U.director, email: "director@scoutup.demo", password_hash: demoHash, name: "Marta Casanovas", role: "director", title: "Directora esportiva", club_id: HOME_CLUB_ID, avatar_hue: 152, is_demo_login: 1, created_at: ago(c, 380) });
  ins(c, "users", { id: U.coach, email: "coach@scoutup.demo", password_hash: demoHash, name: "Jordi Esteve", role: "coach", title: "Entrenador · Juvenil A", club_id: HOME_CLUB_ID, team_id: "t_vn_juva", avatar_hue: 210, is_demo_login: 1, created_at: ago(c, 370) });
  ins(c, "users", { id: U.coachCadet, email: "cadet@vallesnord.example", password_hash: "!", name: "Laia Ferrer", role: "coach", title: "Entrenadora · Cadet A", club_id: HOME_CLUB_ID, team_id: "t_vn_cada", avatar_hue: 330, is_demo_login: 0, created_at: ago(c, 360) });
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
        name: `${t.category}${t.gender === "F" ? " Femení" : ""} ${levelLabel(t.rank)} · Grup ${t.group}`,
        category: t.category, gender: t.gender, division: levelLabel(t.rank), level_rank: t.rank, group_name: `Grup ${t.group}`, source: "mock",
      });
    }
    return id;
  };

  const needsVN: Record<string, { position: string; text: string; priority: "alta" | "mitjana" | "baixa" }[]> = {
    juva: [
      { position: "DC", text: "Central esquerrà: dos centrals acaben l'etapa juvenil i cap no és esquerrà.", priority: "alta" },
      { position: "DAV", text: "Davanter de referència per competir amb el titular.", priority: "mitjana" },
    ],
    juvb: [{ position: "ED", text: "Extrem dret desequilibrant.", priority: "mitjana" }],
    cada: [{ position: "LE", text: "Lateral esquerre: només n'hi ha un a la plantilla.", priority: "alta" }],
    ama: [{ position: "POR", text: "Porter per competir la titularitat.", priority: "alta" }],
    juvf: [{ position: "MC", text: "Migcampista organitzadora.", priority: "mitjana" }],
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
          { role: "Segon entrenador", name: R.pick(c, COACH_NAMES) },
          { role: "Preparador físic", name: R.pick(c, COACH_NAMES) },
          ...(t.key === "juva" ? [{ role: "Entrenador de porters", name: "Pere Colomer" }] : []),
        ] : []),
        objectives: isVN ? (t.key === "juva" ? "Quedar entre els quatre primers i consolidar la categoria." : t.key === "juvf" ? "Lluitar per l'ascens i fer créixer la base femenina." : "Formar jugadors per als equips A i competir amb una idea de joc clara.") : "Competir i formar jugadors.",
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
      const size = tt[0].category === "Cadet" || tt[0].category === "Infantil" ? 14 : 16;
      const entries: { name: string; clubId: string | null; teamId: string | null; strength: number }[] = tt.map((t) => ({ name: `${t.club.name}${t.name.includes("Femení") ? "" : ""} ${t.name.replace("Juvenil Femení", "Femení")}`.replace(/ (Juvenil|Cadet|Infantil|Amateur) A$/, " A").replace(/ (Juvenil|Cadet) B$/, " B"), clubId: t.clubId, teamId: t.id, strength: 4 - t.club.tier + c.rnd() }));
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
    category === "Cadet" ? [start - 15, start - 14] : category === "Juvenil" ? [start - 18, start - 16] : [start - 24, start - 19];

  const genStats = (rank: number, category: string, pos: Position, attrs: Attrs, role: number, ver: string) => {
    const maxM = category === "Cadet" ? 26 : 30;
    const matches = clamp(Math.round(maxM * (0.45 + 0.5 * role) + (c.rnd() * 4 - 2)), 4, maxM);
    const starts = clamp(Math.round(matches * (0.2 + 0.8 * role)), 0, matches);
    const dur = category === "Cadet" ? 80 : 90;
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
      languages: o.languages ?? R.weighted(c, [["Català, castellà", 70], ["Català, castellà, anglès", 22], ["Castellà, català, àrab", 8]]),
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
  const pol = makePlayer({
    id: "p_pol", userId: U.player, first: "Pol", last: "Serra Batlle", gender: "M", birth: `${start - 18}-03-14`, birthYear: start - 18,
    basePlace: place("Terrassa"), place: place("Terrassa"), pos: "DC", sec: ["MCD"], foot: "esquerre", height: 186,
    clubId: "club_serralada", teamId: "t_serralada_juva", category: "Juvenil", rank: 3, availability: "obert", contract: "final_temporada",
    attrs: { velocitat: 6, resistencia: 7, forca: 8, tecnica: 6, passada: 6, xut: 4, regat: 4, joc_aeri: 8, defensa: 8, visio: 6, posicionament: 7, lideratge: 7 },
    hue: 28, verification: "verified",
    privacy: { ...DEFAULT_PRIVACY, profile: "verificats", contact: "verificats" },
    preferences: { categories: ["Juvenil"], maxKm: 30, interests: ["incorporacio", "prova", "estudis"], levelMin: 2, notes: "Prefereixo entrenar a la tarda (estudio batxillerat)." },
    style: "Central esquerrà, dominador del joc aeri",
    description: "Central esquerrà, fort per alt i en el duel. Capità del Juvenil A. M'agrada comunicar i ordenar la defensa, i estic treballant la sortida de pilota. Busco fer el salt a Nacional.",
    languages: "Català, castellà, anglès", updatedDaysAgo: 62,
    prev: { matches: 25, starts: 13, minutes: 1520, goals: 3, assists: 1, yellow: 5, red: 0, callups: 27, cs: 5, ver: "updated" },
    hasCurrentStats: false, careerSeasons: 3, videos: 0, achievements: 0,
  });
  const biel = makePlayer({
    id: "p_biel", first: "Biel", last: "Riera Coll", gender: "M", birth: `${start - 18}-02-02`, birthYear: start - 18,
    basePlace: place("Sant Cugat del Vallès"), place: place("Sant Cugat del Vallès"), pos: "DC", sec: ["LE"], foot: "esquerre", height: 183,
    clubId: "club_turo", teamId: "t_turo_juva", category: "Juvenil", rank: 2, availability: "escoltant", contract: "amb_fitxa",
    attrs: { velocitat: 7, resistencia: 7, forca: 7, tecnica: 7, passada: 7, xut: 4, regat: 5, joc_aeri: 8, defensa: 6, visio: 7, posicionament: 6, lideratge: 6 },
    hue: 205, verification: "verified", guardianConsent: true,
    privacy: { ...DEFAULT_PRIVACY, profile: "verificats", contact: "verificats" },
    style: "Central amb sortida de pilota",
    description: "Central esquerrà amb bona sortida de pilota i joc aeri. Aquesta temporada he jugat pocs minuts i busco un equip on tenir continuïtat.",
    updatedDaysAgo: 3,
    prev: { matches: 12, starts: 3, minutes: 400, goals: 1, assists: 0, yellow: 2, red: 0, callups: 22, cs: 1, ver: "self" },
    hasCurrentStats: true, careerSeasons: 2, videos: 2, achievements: 1,
  });
  const arnau = makePlayer({
    id: "p_arnau", first: "Arnau", last: "Soler Vives", gender: "M", birth: `${start - 18}-01-19`, birthYear: start - 18,
    basePlace: place("Granollers"), place: place("Granollers"), pos: "DC", sec: [], foot: "dret", height: 188,
    clubId: "club_serraverda", teamId: "t_serraverda_juva", category: "Juvenil", rank: 2, availability: "escoltant",
    attrs: { velocitat: 6, resistencia: 7, forca: 8, tecnica: 6, passada: 7, xut: 5, regat: 4, joc_aeri: 9, defensa: 8, visio: 6, posicionament: 8, lideratge: 8 },
    hue: 140, verification: "verified", updatedDaysAgo: 9,
    prev: { matches: 28, starts: 24, minutes: 2130, goals: 4, assists: 1, yellow: 6, red: 0, callups: 29, cs: 9, ver: "verified" },
    hasCurrentStats: true, careerSeasons: 4, videos: 3, achievements: 2,
  });
  const nil = makePlayer({
    id: "p_nil", first: "Nil", last: "Font Casals", gender: "M", birth: `${start - 16}-05-22`, birthYear: start - 16,
    basePlace: place("Cerdanyola del Vallès"), place: place("Cerdanyola del Vallès"), pos: "ED", sec: ["EE", "MCO"], foot: "dret", height: 172,
    clubId: "club_horitzo", teamId: "t_horitzo_juva", category: "Juvenil", rank: 3, availability: "obert",
    attrs: { velocitat: 8, resistencia: 7, forca: 5, tecnica: 7, passada: 6, xut: 6, regat: 8, joc_aeri: 4, defensa: 4, visio: 6, posicionament: 5, lideratge: 5 },
    hue: 265, verification: "verified", guardianUserId: U.tutor, guardianEmail: "tutor@scoutup.demo", guardianConsent: true,
    privacy: { ...DEFAULT_PRIVACY, profile: "verificats", contact: "verificats", location: "comarca" },
    style: "Extrem desequilibrant a l'u contra u",
    description: "Extrem dret ràpid, m'agrada encarar i centrar. Primer any de juvenil.", updatedDaysAgo: 14,
    hasCurrentStats: true, careerSeasons: 3, videos: 1, achievements: 1,
  });

  // Jugadors del club principal (surten a la plantilla)
  makePlayer({ gender: "M", category: "Juvenil", rank: 2, basePlace: place("Sabadell"), clubId: HOME_CLUB_ID, teamId: "t_vn_juva", pos: "MC", availability: "no_disponible" });
  makePlayer({ gender: "M", category: "Juvenil", rank: 2, basePlace: place("Sabadell"), clubId: HOME_CLUB_ID, teamId: "t_vn_juva", pos: "DAV", availability: "no_disponible" });
  makePlayer({ gender: "M", category: "Cadet", rank: 2, basePlace: place("Sabadell"), clubId: HOME_CLUB_ID, teamId: "t_vn_cada", pos: "DC", availability: "no_disponible" });
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
    makePlayer({ gender: g, category: cat, rank: 4, basePlace: place(city), clubFree: "Sense equip", availability: "obert", contract: "lliure" });
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
      const cat = s - p.birthYear <= 15 ? "Cadet" : s - p.birthYear <= 18 ? "Juvenil" : "Amateur";
      const infantil = s - p.birthYear <= 13;
      const sameClub = k === 0 || (k === 1 && R.chance(c, 0.6)) || R.chance(c, 0.3);
      const cl = k === 0 ? club : sameClub ? club : R.pick(c, CLUBS.filter((x) => x.id !== HOME_CLUB_ID));
      const clName = k === 0 && !club ? (p.clubFree ?? "Sense equip") : cl ? cl.name : R.pick(c, FILLER_TEAMS);
      if (k === 0 && !club) {
        career.push({ season: s, club: "Sense equip", clubId: null, team: "—", category: cat, division: "—", role: "Buscant equip", ver: "self" });
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
      const s2 = genStats(p.rank, p.category === "Juvenil" && p.birthYear >= start - 17 ? "Cadet" : p.category, p.pos, p.attrs, c.rnd(), R.pick(c, ["verified", "self"]));
      ins(c, "player_stats", { id: `ps_${p.id}_${seasonId(start - 2)}`, player_id: p.id, season_id: seasonId(start - 2), team_name: career[2] ? `${career[2].club} · ${career[2].team}` : null, matches: s2.matches, starts: s2.starts, minutes: s2.minutes, goals: s2.goals, assists: s2.assists, yellow: s2.yellow, red: s2.red, callups: s2.callups, clean_sheets: s2.cs, verification: s2.ver, updated_at: updatedAt });
    }
    if (p.hasCurrentStats && p.clubId) {
      const m = R.int(c, 1, 3);
      const s3 = Math.min(m, Math.round(m * (p.prev.starts / Math.max(1, p.prev.matches)) + (c.rnd() - 0.5)));
      const g = p.pos === "DAV" || p.pos === "ED" || p.pos === "EE" ? R.int(c, 0, 2) : R.chance(c, 0.1) ? 1 : 0;
      ins(c, "player_stats", { id: `ps_${p.id}_${cur}`, player_id: p.id, season_id: cur, team_name: `${club!.name} · ${t!.name}`, matches: m, starts: Math.max(0, s3), minutes: Math.max(0, s3) * 84 + (m - Math.max(0, s3)) * 20, goals: g, assists: R.chance(c, 0.25) ? 1 : 0, yellow: R.chance(c, 0.2) ? 1 : 0, red: 0, callups: 3, clean_sheets: 0, verification: p.verification === "verified" ? "verified" : "updated", updated_at: updatedAt });
    }

    // vídeos (només metadades: a la demo no es pugen fitxers)
    const vTitles = ["Highlights temporada " + seasonLabel(start - 1), "Partit complet · jornada 12", "Accions defensives i duels", "Accions ofensives i gols", "Entrenament específic de posició"];
    for (let v = 0; v < p.videos; v++) {
      ins(c, "videos", { id: `v_${p.id}_${v}`, player_id: p.id, title: vTitles[v % vTitles.length], kind: v === 1 ? "partit" : "highlights", duration_s: v === 1 ? 5400 : R.int(c, 70, 240), recorded_at: ago(c, R.int(c, 20, 300)), views: R.int(c, 4, 180) });
    }
    const achList = ["Campió de lliga " + seasonLabel(start - 1), "Capità de l'equip", "Màxim golejador de l'equip " + seasonLabel(start - 1), "Millor jugador del torneig de Nadal", "Ascens de categoria " + seasonLabel(start - 2)];
    for (let a = 0; a < p.achievements; a++) {
      ins(c, "achievements", { id: `a_${p.id}_${a}`, player_id: p.id, season_label: seasonLabel(start - 1 - a), title: achList[(a + p.hue) % achList.length], kind: "esportiu" });
    }
    if (R.chance(c, 0.35)) ins(c, "player_experiences", { id: `pe_${p.id}`, player_id: p.id, kind: "torneig", title: R.pick(c, ["Torneig d'estiu de futbol base", "Campus de tecnificació", "Torneig internacional de Setmana Santa"]), year: start - R.int(c, 1, 3) });

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

  // ── Ofertes ─────────────────────────────────────────────────────────────────
  type OfferDef = { id: string; club: string; team: string; kind?: "incorporacio" | "prova"; title: string; position: Position; level: number; km: number; foot?: string; height?: number; traits: string[]; daysAgo: number; trialIn?: number; description: string; restrictions?: string; availability?: string; status?: string };
  const OFFERS: OfferDef[] = [
    { id: "o_vn_central", club: HOME_CLUB_ID, team: "juva", title: "Busquem central sub-19", position: "DC", level: 2, km: 30, foot: "esquerre", height: 180, traits: ["joc_aeri", "sortida_pilota", "defensa"], daysAgo: 12, availability: "temporada",
      description: "Busquem un defensa central, preferiblement esquerrà, per al Juvenil A (Nacional). Volem un central dominador del joc aeri, amb capacitat per sortir jugant i lideratge a la línia defensiva.",
      restrictions: "Entrenaments dilluns, dimecres i divendres de 19:30 a 21:00 h a Sabadell. Imprescindible poder-hi assistir." },
    { id: "o_vn_le", club: HOME_CLUB_ID, team: "cada", title: "Lateral esquerre per al Cadet A", position: "LE", level: 3, km: 25, foot: "esquerre", traits: ["velocitat", "resistencia"], daysAgo: 20,
      description: "El Cadet A necessita un lateral esquerre amb recorregut i capacitat d'arribar a línia de fons.", restrictions: "Entrenaments dimarts i dijous a les 18:00 h." },
    { id: "o_vn_ed", club: HOME_CLUB_ID, team: "juvb", title: "Extrem dret desequilibrant", position: "ED", level: 4, km: 25, traits: ["regat", "velocitat"], daysAgo: 6,
      description: "Busquem un extrem dret amb u contra u per al Juvenil B, amb possibilitat de pujar al Juvenil A." },
    { id: "o_vn_por", club: HOME_CLUB_ID, team: "ama", title: "Porter per a l'Amateur A", position: "POR", level: 4, km: 35, height: 182, traits: ["reflexos"], daysAgo: 25,
      description: "Porter per competir la titularitat al primer equip amateur. Valorem experiència en categoria sènior." },
    { id: "o_vn_mcf", club: HOME_CLUB_ID, team: "juvf", title: "Migcampista organitzadora", position: "MC", level: 3, km: 30, traits: ["visio", "sortida_pilota"], daysAgo: 9,
      description: "El Juvenil Femení busca una migcampista amb criteri per organitzar el joc." },
    { id: "o_vn_prova", club: HOME_CLUB_ID, team: "juva", kind: "prova", title: "Jornada de proves · davanters sub-19", position: "DAV", level: 4, km: 40, traits: ["gol"], daysAgo: 4, trialIn: 9,
      description: "Sessió de proves oberta per a davanters juvenils. Places limitades: el club confirma cada inscripció." },

    { id: "o_pins_dc", club: "club_pins", team: "juva", title: "Central per al Juvenil A", position: "DC", level: 3, km: 45, traits: ["joc_aeri", "defensa"], daysAgo: 18, description: "Busquem central per reforçar el Juvenil A de cara a la segona volta." },
    { id: "o_med_prova", club: "club_mediterrani", team: "juva", kind: "prova", title: "Proves Juvenil A · defenses", position: "DC", level: 3, km: 40, traits: ["defensa"], daysAgo: 10, trialIn: 1, description: "Jornada de proves per a defenses juvenils. Entrenament amb el Juvenil A." },
    { id: "o_turo_mcd", club: "club_turo", team: "juva", title: "Pivot defensiu Juvenil A", position: "MCD", level: 3, km: 30, traits: ["posicionament", "sortida_pilota"], daysAgo: 8, description: "Busquem un pivot d'equilibri per al Juvenil A." },
    { id: "o_masia_dc", club: "club_masia", team: "juva", title: "Central esquerrà Juvenil", position: "DC", level: 4, km: 35, foot: "esquerre", traits: ["joc_aeri"], daysAgo: 14, description: "Central esquerrà per al Juvenil A. Possibilitat d'entrenar amb l'amateur." },
    { id: "o_ribera_dav", club: "club_ribera", team: "juva", title: "Davanter centre Juvenil A", position: "DAV", level: 3, km: 30, traits: ["gol", "fisic"], daysAgo: 5, description: "Davanter de referència per a un equip que vol lluitar per l'ascens." },
    { id: "o_ribera_por", club: "club_ribera", team: "cada", title: "Porter Cadet A", position: "POR", level: 3, km: 25, traits: ["reflexos"], daysAgo: 22, description: "Porter per al Cadet A." },
    { id: "o_llev_mco", club: "club_llevant", team: "juva", title: "Mitjapunta creatiu", position: "MCO", level: 2, km: 30, traits: ["visio", "tecnica"], daysAgo: 11, description: "Mitjapunta amb últim passi per al Juvenil A de Divisió d'Honor." },
    { id: "o_llev_f_dav", club: "club_llevant", team: "juvf", title: "Davantera Juvenil Femení", position: "DAV", level: 3, km: 35, traits: ["gol", "velocitat"], daysAgo: 7, description: "Davantera amb gol per al Juvenil Femení." },
    { id: "o_serraverda_ld", club: "club_serraverda", team: "juva", title: "Lateral dret Juvenil A", position: "LD", level: 3, km: 30, traits: ["resistencia", "velocitat"], daysAgo: 16, description: "Lateral dret amb projecció ofensiva." },
    { id: "o_torrent_ee", club: "club_torrent", team: "juva", title: "Extrem esquerre", position: "EE", level: 3, km: 30, traits: ["regat"], daysAgo: 13, description: "Extrem esquerre desequilibrant per al Juvenil A." },
    { id: "o_torrent_prova", club: "club_torrent", team: "cada", kind: "prova", title: "Proves obertes Cadet A", position: "MC", level: 4, km: 30, traits: [], daysAgo: 3, trialIn: 6, description: "Jornada de proves per a migcampistes cadets." },
    { id: "o_portal_dc", club: "club_portal", team: "juva", title: "Central Divisió d'Honor", position: "DC", level: 2, km: 40, height: 182, traits: ["joc_aeri", "defensa", "lideratge"], daysAgo: 19, description: "Central amb experiència per a Divisió d'Honor juvenil." },
    { id: "o_delta_mc", club: "club_delta", team: "ama", title: "Migcampista per a l'Amateur", position: "MC", level: 4, km: 25, traits: ["visio"], daysAgo: 12, description: "Migcampista per al primer equip amateur." },
    { id: "o_serralada_ed", club: "club_serralada", team: "juva", title: "Extrem per al Juvenil A", position: "ED", level: 4, km: 25, traits: ["velocitat", "regat"], daysAgo: 10, description: "Extrem ràpid per completar la plantilla." },
    { id: "o_horitzo_f_mc", club: "club_horitzo", team: "juvf", title: "Migcampista Juvenil Femení", position: "MC", level: 4, km: 25, traits: ["resistencia"], daysAgo: 15, description: "Migcampista per al Juvenil Femení." },
    { id: "o_rambla_dav", club: "club_rambla", team: "ama", title: "Davanter Amateur A", position: "DAV", level: 4, km: 40, traits: ["gol"], daysAgo: 21, description: "Davanter per al primer equip amateur." },
    { id: "o_fontclara_por", club: "club_fontclara", team: "juva", title: "Porter Juvenil A", position: "POR", level: 5, km: 25, traits: [], daysAgo: 24, description: "Porter per al Juvenil A." },
    { id: "o_ribes_prova", club: "club_ribes", team: "juva", kind: "prova", title: "Proves de pretemporada Juvenil", position: "EE", level: 5, km: 40, traits: [], daysAgo: 2, trialIn: 12, description: "Proves per a extrems juvenils." },
    { id: "o_olivera_ld", club: "club_olivera", team: "ama", title: "Lateral per a l'Amateur", position: "LD", level: 5, km: 30, traits: [], daysAgo: 30, description: "Lateral dret per al primer equip.", status: "tancada" },
    { id: "o_planou_mcd", club: "club_planou", team: "cada", title: "Pivot Cadet A", position: "MCD", level: 5, km: 20, traits: ["posicionament"], daysAgo: 9, description: "Pivot per al Cadet A." },
    { id: "o_mirador_dc", club: "club_mirador", team: "juva", title: "Central Juvenil A", position: "DC", level: 5, km: 30, traits: [], daysAgo: 6, description: "Central per al Juvenil A." },
    { id: "o_vilamar_prova", club: "club_vilamar", team: "juva", kind: "prova", title: "Proves Juvenil", position: "MC", level: 5, km: 25, traits: [], daysAgo: 4, trialIn: 8, description: "Proves obertes per a migcampistes juvenils." },
  ];

  const offerMatch = new Map<string, MatchOffer>();
  for (const o of OFFERS) {
    const t = teamById.get(`t_${clubSuffix(o.club)}_${o.team}`)!;
    const cl = clubById.get(o.club)!;
    const pl = placeByCity(cl.city)!;
    const [y0, y1] = t.category === "Cadet" ? [start - 15, start - 14] : t.category === "Juvenil" ? [start - 18, start - 16] : [start - 26, start - 19];
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
  addApp("o_pins_dc", "p_pol", "vista", 11, "Hola! Soc central esquerrà del Juvenil A de la UE Serralada. M'agradaria molt poder-vos conèixer.");
  addApp("o_med_prova", "p_pol", "prova", 8, "M'interessa la jornada de proves. Hi puc anar sense problema.");

  const visibleForApps = players.filter((p) => p.availability !== "no_disponible" && p.clubId !== HOME_CLUB_ID && p.id !== "p_pol" && p.id !== "p_biel" && (!isMinorP(p) || p.guardianConsent));
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
      .filter((p) => p.gender === om.gender && p.clubId !== HOME_CLUB_ID && p.id !== "p_pol" && p.id !== "p_biel" && p.id !== "p_arnau" && p.id !== "p_nil" && (!isMinorP(p) || p.guardianConsent) && p.privacy.profile !== "ocult")
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
    ins(c, "pipeline_activity", { id: `pa_${e.player}_0`, club_id: HOME_CLUB_ID, player_id: e.player, entry_id: id, user_id: U.director, kind: "afegit", text: e.offer ? `Afegit al pipeline des de l'oferta «${OFFERS.find((q) => q.id === e.offer)!.title}»` : "Afegit al pipeline", from_stage: null, to_stage: "nou", created_at: created });
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
    ins(c, "applications", { id: `ap_${i}`, offer_id: a.offer, player_id: a.player, origin: "jugador", status: a.status, message: a.msg ?? (R.chance(c, 0.5) ? "Hola, m'interessa molt l'oferta. Quedo a la vostra disposició per a qualsevol informació." : null), match_score: score(a.player, a.offer), created_at: t, updated_at: t });
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
      { side: "club" as const, body: `Hola ${n}, soc la Marta Casanovas, directora esportiva del CF Vallès Nord. Hem vist el teu perfil i ens agradaria conèixer-te. Tindries uns minuts per parlar aquesta setmana?`, minsAgo: 6 * D },
      { side: "player" as const, body: "Hola Marta! Moltes gràcies pel missatge, és una alegria. Sí, aquesta setmana puc qualsevol tarda a partir de les 17 h.", minsAgo: 6 * D - 180 },
      { side: "club" as const, body: `Perfecte. Et proposo una videotrucada dijous a les 18:00 h per explicar-te el projecte del ${team}. Et va bé?`, minsAgo: 5 * D },
      { side: "player" as const, body: "Em va perfecte. Pot participar-hi també el meu pare?", minsAgo: 5 * D - 90 },
      { side: "club" as const, body: "I tant, de fet ho preferim. T'envio la invitació per aquí mateix.", minsAgo: 5 * D - 60 },
      { side: "player" as const, body: "Genial, moltes gràcies. Fins dijous!", minsAgo: 3 * 60, readClub: false },
    ],
    (n: string, team: string) => [
      { side: "club" as const, body: `Bon dia ${n}. Des del CF Vallès Nord estem seguint la teva temporada. T'agradaria venir a fer un entrenament amb el ${team}?`, minsAgo: 9 * D },
      { side: "player" as const, body: "Bon dia! Sí, m'encantaria. Quins dies entreneu?", minsAgo: 8 * D },
      { side: "club" as const, body: "Dilluns, dimecres i divendres a les 19:30 h a Sabadell. Et proposem venir el proper dimecres.", minsAgo: 8 * D - 200 },
      { side: "player" as const, body: "Hi seré. Haig de portar alguna cosa especial?", minsAgo: 7 * D },
      { side: "club" as const, body: `Només la teva roba d'entrenament i botes de gespa artificial. Et rebrà el cos tècnic del ${team}.`, minsAgo: 7 * D - 30 },
    ],
    (n: string, team: string) => [
      { side: "club" as const, body: `Hola ${n}, gràcies per acceptar la sol·licitud. Ens agradaria saber quins són els teus plans per a la propera temporada.`, minsAgo: 3 * D },
      { side: "player" as const, body: "Hola! Ara mateix estic bé al meu club, però estic obert a escoltar propostes per l'any vinent.", minsAgo: 2 * D },
      { side: "club" as const, body: "Entesos. Et seguirem durant la temporada i et tornarem a escriure més endavant. Molta sort!", minsAgo: 2 * D - 45 },
      { side: "player" as const, body: "Moltes gràcies a vosaltres!", minsAgo: 20 * 60, readClub: false },
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
    cr(HOME_CLUB_ID, e.player, e.team, "oferta", `Hola ${pById.get(e.player)!.first}, t'escrivim des del CF Vallès Nord per l'oferta «${OFFERS.find((o) => o.id === e.offer)?.title ?? "del club"}». T'agradaria parlar-ne?`, "pendent", 2);
  });
  // Nil (menor): cal autorització del tutor
  cr(HOME_CLUB_ID, "p_nil", "t_vn_juvb", "oferta", "Hola Nil, des del CF Vallès Nord ens agradaria convidar-te a conèixer el nostre Juvenil B, amb possibilitat de pujar al Juvenil A.", "pendent_tutor", 1);
  // Una sol·licitud rebutjada
  const rej = pipe.find((e) => e.stage === "rebutjat");
  if (rej) cr(HOME_CLUB_ID, rej.player, rej.team, "seguiment", "Hola, ens agradaria conèixer-te de cara a la propera temporada.", "rebutjada", 12);

  // En Pol: conversa amb FC Mediterrani (prova demà) i sol·licitud pendent de CE Masia Nova
  const polConv = conv("club_mediterrani", "p_pol", "t_mediterrani_juva", "Proves Juvenil A · defenses", [
    { side: "club", body: "Hola Pol, soc el director esportiu del FC Mediterrani. Hem rebut la teva inscripció a la jornada de proves. T'esperem demà a les 18:30 h al Camp Municipal Mediterrani (Badalona).", minsAgo: 2 * D },
    { side: "player", body: "Moltes gràcies! Allà seré. A quina hora cal ser-hi per canviar-se?", minsAgo: 2 * D - 120 },
    { side: "club", body: "Amb mitja hora d'antelació n'hi ha prou. Porta botes per a gespa artificial. Ens veiem demà!", minsAgo: 5 * 60, readPlayer: false },
  ]);
  cr("club_mediterrani", "p_pol", "t_mediterrani_juva", "prova", "Hola Pol, hem vist la teva inscripció. Volem confirmar-te la prova.", "acceptada", 3, polConv);
  cr("club_masia", "p_pol", "t_masia_juva", "oferta", "Hola Pol! Som el CE Masia Nova (Manresa). Busquem un central esquerrà per al Juvenil A i el teu perfil encaixa molt amb el que necessitem. T'agradaria que en parléssim?", "pendent", 0);

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
    ev({ club: HOME_CLUB_ID, team: "t_vn_juva", kind: "partit", title: `${wk % 2 ? "CF Vallès Nord – " + opponents[(wk + 6) % 12] : opponents[(wk + 6) % 12] + " – CF Vallès Nord"} (Juvenil A)`, day: nextW(5, 0) + wk * 7, h: 17, dur: 105, location: wk % 2 ? "Camp Municipal Vallès Nord" : "Camp visitant", opponent: opponents[(wk + 6) % 12] });
    ev({ club: HOME_CLUB_ID, team: "t_vn_cada", kind: "partit", title: `Cadet A · ${opponents[(wk + 9) % 12]}`, day: nextW(5, 0) + wk * 7, h: 11, dur: 95, location: wk % 2 ? "Camp Municipal Vallès Nord" : "Camp visitant", opponent: opponents[(wk + 9) % 12] });
    ev({ club: HOME_CLUB_ID, team: "t_vn_ama", kind: "partit", title: `Amateur A · ${opponents[(wk + 3) % 12]}`, day: nextW(6, 0) + wk * 7, h: 12, dur: 105, location: wk % 2 ? "Camp visitant" : "Camp Municipal Vallès Nord", opponent: opponents[(wk + 3) % 12] });
    // entrenaments Juvenil A
    for (const d of [0, 2, 4]) ev({ club: HOME_CLUB_ID, team: "t_vn_juva", kind: "entrenament", title: "Entrenament Juvenil A", day: nextW(d, 0) + wk * 7, h: 19, m: 30, dur: 90, location: "Camp Municipal Vallès Nord" });
    ev({ club: HOME_CLUB_ID, team: "t_vn_cada", kind: "entrenament", title: "Entrenament Cadet A", day: nextW(1, 0) + wk * 7, h: 18, dur: 90, location: "Camp annex Vallès Nord" });
    // reunió de coordinació
    ev({ club: HOME_CLUB_ID, team: null, owner: U.director, kind: "reunio", title: "Reunió de coordinació tècnica", day: nextW(1, 0) + wk * 7, h: 21, dur: 60, location: "Oficines del club" });
  }
  // proves i scouting
  const arnauEntry = pipe.find((e) => e.player === "p_arnau")!;
  ev({ club: HOME_CLUB_ID, team: "t_vn_juva", owner: U.coach, kind: "prova", title: `Prova: ${pname("p_arnau")}`, day: 1, h: 19, m: 30, dur: 90, location: "Camp Municipal Vallès Nord", related: "p_arnau", notes: "Entrena amb el Juvenil A. Observar sortida de pilota i comunicació." });
  void arnauEntry;
  const otherProva = pipe.find((e) => e.stage === "prova" && e.player !== "p_arnau");
  if (otherProva) ev({ club: HOME_CLUB_ID, team: otherProva.team, owner: U.director, kind: "prova", title: `Prova: ${pname(otherProva.player)}`, day: 3, h: 18, dur: 90, location: "Camp annex Vallès Nord", related: otherProva.player });
  ev({ club: HOME_CLUB_ID, team: "t_vn_juva", owner: U.director, kind: "scouting", title: "Scouting: UE Serralada – CF Turó Alt (Juvenil)", day: nextW(6, 0), h: 11, m: 30, dur: 105, location: "Terrassa", notes: "Seguir els centrals dels dos equips (oferta central sub-19)." });
  ev({ club: HOME_CLUB_ID, team: "t_vn_juvb", owner: U.director, kind: "scouting", title: "Scouting: CF Horitzó – FC Delta Sud (Juvenil)", day: nextW(5, 1), h: 16, dur: 105, location: "Cerdanyola del Vallès" });
  const talk = pipe.find((e) => e.stage === "en_conversa");
  if (talk) ev({ club: HOME_CLUB_ID, team: talk.team, owner: U.director, kind: "trucada", title: `Videotrucada amb ${pname(talk.player)}`, day: nextW(3, 0) === 0 ? 7 : nextW(3, 0), h: 18, dur: 30, location: "Videotrucada (enllaç per ScoutUp)", related: talk.player });
  ev({ club: HOME_CLUB_ID, team: null, owner: U.director, kind: "reunio", title: "Reunió amb famílies · Juvenil A", day: 8, h: 20, dur: 60, location: "Sala d'actes del club" });

  // Esdeveniments d'en Pol
  ev({ player: "p_pol", owner: U.player, kind: "prova", title: "Prova amb el FC Mediterrani (Juvenil A)", day: 1, h: 18, m: 30, dur: 90, location: "Camp Municipal Mediterrani · Badalona", notes: "Arribar 30 min abans. Botes de gespa artificial." });
  for (let wk = -2; wk <= 4; wk++) {
    ev({ player: "p_pol", owner: U.player, kind: "partit", title: `UE Serralada – ${opponents[(wk + 4) % 12]}`, day: nextW(6, 0) + wk * 7, h: 11, m: 30, dur: 105, location: wk % 2 ? "Camp visitant" : "Camp Municipal Serralada" });
    for (const d of [1, 3]) ev({ player: "p_pol", owner: U.player, kind: "entrenament", title: "Entrenament Juvenil A · UE Serralada", day: nextW(d, 0) + wk * 7, h: 19, dur: 90, location: "Camp Municipal Serralada" });
  }
  ev({ player: "p_pol", owner: U.player, kind: "recordatori", title: "Actualitzar estadístiques de la temporada", day: 2, h: 20, dur: 15 });

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
    ins(c, "evaluations", { id: `e_${pid}_${author}`, club_id: HOME_CLUB_ID, player_id: pid, author_user_id: author, team_id: pipe.find((x) => x.player === pid)?.team ?? null, scores: JSON.stringify(scores), decision, comment, created_at: ago(c, daysAgo), updated_at: ago(c, daysAgo) });
  };
  evalFor("p_arnau", U.director, 0.3, "prova", "Central molt complet. Dominant per alt i amb lideratge. Cal veure'l en la sortida de pilota sota pressió.", 9);
  evalFor("p_arnau", U.coach, 0.1, "fitxar", "Encaixa perfectament amb el que necessitem. Molta personalitat.", 3);
  pipe.filter((e) => ["interessant", "en_conversa", "prova", "en_espera", "incorporat"].includes(e.stage) && e.player !== "p_arnau").slice(0, 9).forEach((e, i) => {
    evalFor(e.player, i % 3 === 0 ? U.coach : U.director, c.rnd() - 0.4, e.stage === "en_espera" ? "seguir" : e.stage === "prova" ? "prova" : e.stage === "incorporat" ? "fitxar" : R.pick(c, ["seguir", "prova"]), R.pick(c, [
      "Bon perfil tècnic. Li falta una mica de físic per a la categoria, però té marge de millora.",
      "Jugador intel·ligent, sempre ben perfilat. Caldria veure'l contra rivals de més nivell.",
      "Molt intens i competitiu. Gestiona bé l'error i contagia l'equip.",
      "Interessant per a la propera temporada. De moment, seguir-lo.",
    ]), R.int(c, 2, 20));
  });

  const noteTexts = [
    "Parlat amb el seu entrenador actual: molt bona actitud als entrenaments.",
    "La família prioritza que pugui compaginar-ho amb els estudis. Horaris d'entrenament clau.",
    "Vist en directe dissabte: bon partit, dos talls decisius i bona comunicació.",
    "Interessat també un altre club de la zona. No allargar gaire la decisió.",
    "Demanar vídeo del partit complet abans de convidar-lo a una prova.",
    "Contracte fins a final de temporada: bona oportunitat per a l'estiu.",
    "Pot jugar també de lateral en cas de necessitat.",
    "Recomanat pel coordinador de l'Amateur.",
  ];
  let noteN = 0;
  pipe.slice(0, 14).forEach((e, i) => {
    ins(c, "notes", { id: `n_${++noteN}`, club_id: HOME_CLUB_ID, player_id: e.player, author_user_id: i % 3 === 1 ? U.coach : U.director, team_id: e.team, body: noteTexts[i % noteTexts.length], created_at: ago(c, R.int(c, 1, 20), R.int(c, 0, 10)) });
  });
  ins(c, "notes", { id: `n_${++noteN}`, club_id: HOME_CLUB_ID, player_id: "p_arnau", author_user_id: U.coach, team_id: "t_vn_juva", body: "Li hem demanat que vingui a la prova amb el material del seu club. Parlar amb el seu entrenador després.", created_at: ago(c, 1, 3) });

  const scoutPool = players.filter((p) => p.clubId !== HOME_CLUB_ID && p.gender === "M" && p.category === "Juvenil" && p.privacy.profile !== "ocult" && (!isMinorP(p) || p.guardianConsent)).slice(0, 40);
  const reportPlayers = ["p_biel", "p_arnau", ...R.shuffle(c, scoutPool.map((p) => p.id)).filter((id) => id !== "p_biel" && id !== "p_arnau" && id !== "p_pol").slice(0, 8)];
  reportPlayers.forEach((pid, i) => {
    const p = pById.get(pid)!;
    const t = p.teamId ? teamById.get(p.teamId) : null;
    ins(c, "scout_reports", {
      id: `sr_${i + 1}`, club_id: HOME_CLUB_ID, author_user_id: i % 2 ? U.coach : U.director, team_id: "t_vn_juva", player_id: pid,
      match_title: t ? `${t.club.name} – ${R.pick(c, FILLER_TEAMS)}` : "Partit amistós",
      match_date: ago(c, R.int(c, 2, 35)), competition: t ? `${t.category} ${levelLabel(t.rank)}` : null, position_observed: p.pos,
      rating: pid === "p_biel" ? 8 : pid === "p_arnau" ? 8 : R.int(c, 5, 8),
      observations: pid === "p_biel"
        ? "Central esquerrà amb molt bona sortida de pilota i temps en el passi. Guanya molts duels aeris. Juga pocs minuts al seu equip: oportunitat."
        : R.pick(c, ["Bon partit. Destaca en la lectura defensiva i en l'anticipació.", "Jugador amb molta energia, però precipitat amb pilota.", "Molt bona actitud. Tècnicament correcte, li falta velocitat.", "Presència física important. Cal millorar la presa de decisions."]),
      recommendation: pid === "p_biel" ? "contactar" : pid === "p_arnau" ? "prova" : R.pick(c, ["seguir", "seguir", "contactar", "descartar"]),
      reminder_at: pid === "p_biel" ? at(c, 4, 10) : R.chance(c, 0.3) ? at(c, R.int(c, 3, 20), 10) : null,
      created_at: ago(c, R.int(c, 1, 30)),
    });
  });

  // ── Plantilles (roster) del club principal, 3 temporades ────────────────────
  const rosterPos: Record<string, Position[]> = {
    Juvenil: ["POR", "POR", "LD", "LD", "DC", "DC", "DC", "LE", "MCD", "MCD", "MC", "MC", "MCO", "MCO", "ED", "ED", "EE", "EE", "DAV", "DAV"],
    Cadet: ["POR", "POR", "LD", "DC", "DC", "DC", "LE", "MCD", "MC", "MC", "MCO", "ED", "ED", "EE", "DAV", "DAV", "MC"],
    Infantil: ["POR", "LD", "DC", "DC", "LE", "MCD", "MC", "MC", "MCO", "ED", "EE", "DAV", "DAV", "DC"],
    Amateur: ["POR", "POR", "LD", "LD", "DC", "DC", "DC", "LE", "LE", "MCD", "MC", "MC", "MCO", "ED", "EE", "DAV", "DAV", "ED"],
  };
  for (const t of teams.filter((x) => x.clubId === HOME_CLUB_ID)) {
    // grup de jugadors (externs) amb anys de naixement, perquè hi hagi continuïtat entre temporades
    const [ya, yb] = t.category === "Cadet" ? [start - 16, start - 13] : t.category === "Juvenil" ? [start - 20, start - 15] : t.category === "Infantil" ? [start - 14, start - 11] : [start - 30, start - 18];
    const pool: { name: string; pos: Position; by: number; foot: string; rating: number }[] = [];
    for (let i = 0; i < 44; i++) {
      const nm = genName(t.gender as "M" | "F");
      const pos = rosterPos[t.category][i % rosterPos[t.category].length];
      pool.push({ name: `${nm.first} ${nm.last.split(" ")[0]}`, pos, by: R.int(c, ya, yb), foot: pos === "LE" || pos === "EE" ? "esquerre" : R.chance(c, 0.15) ? "esquerre" : "dret", rating: 5.5 + c.rnd() * 2.8 });
    }
    for (const s of seasons) {
      const range = t.category === "Cadet" ? [s - 15, s - 14] : t.category === "Juvenil" ? [s - 18, s - 16] : t.category === "Infantil" ? [s - 13, s - 12] : [s - 30, s - 19];
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
  nt(U.director, "match", "3 nous perfils coincideixen amb la teva necessitat.", "Oferta «Busquem central sub-19» · compatibilitat superior al 80%.", "/club/ofertes/o_vn_central", 95);
  nt(U.director, "contact", "Un jugador ha acceptat la teva sol·licitud.", convPlayers[0] ? `${pname(convPlayers[0].player)} ha acceptat parlar amb el club.` : null, talkConv ? `/club/missatges/${talkConv}` : "/club/missatges", 5 * 60);
  nt(U.director, "application", "Noves sol·licituds a «Busquem central sub-19»", "Tens candidatures pendents de revisar.", "/club/ofertes/o_vn_central?tab=sollicituds", 7 * 60);
  nt(U.director, "event", "Demà tens una prova programada.", `${pname("p_arnau")} · 19:30 h · Camp Municipal Vallès Nord`, "/club/calendari", 9 * 60);
  nt(U.director, "message", "Nou missatge", "Tens missatges sense llegir a la safata.", "/club/missatges", 3 * 60);
  nt(U.director, "system", "Oferta «Porter per a l'Amateur A» caduca aviat", "Queden 15 dies. Pots ampliar-la o tancar-la.", "/club/ofertes/o_vn_por", 2 * D, true);
  nt(U.director, "match", "Nou perfil compatible amb «Lateral esquerre per al Cadet A»", null, "/club/ofertes/o_vn_le", 3 * D, true);
  nt(U.coach, "match", "3 nous perfils coincideixen amb la teva necessitat.", "Central esquerrà per al Juvenil A.", "/club/ofertes/o_vn_central", 95);
  nt(U.coach, "event", "Demà tens una prova programada.", `${pname("p_arnau")} · 19:30 h`, "/club/calendari", 9 * 60);
  nt(U.coach, "system", "La direcció t'ha assignat un nou jugador al pipeline", null, "/club/pipeline", 2 * D, true);

  nt(U.player, "match", "Nova oportunitat 89% compatible.", "CF Vallès Nord · «Busquem central sub-19».", "/jugador/oportunitats/o_vn_central", 50);
  nt(U.player, "interest", "Nou club interessat en el teu perfil.", "Un club ha afegit el teu perfil a la seva llista de seguiment.", "/jugador/seguiment", 4 * 60);
  nt(U.player, "contact", "Nova sol·licitud de contacte", "CE Masia Nova vol parlar amb tu.", "/jugador/missatges", 2 * 60);
  nt(U.player, "event", "Demà tens una prova programada.", "FC Mediterrani · 18:30 h · Badalona", "/jugador/calendari", 6 * 60);
  nt(U.player, "profile", "El teu perfil porta 2 mesos sense actualitzar-se.", "Els perfils actualitzats reben més visites dels clubs.", "/jugador/perfil/editar", 22 * 60);
  nt(U.player, "application", "UE Els Pins ha vist el teu perfil", "Sol·licitud «Central per al Juvenil A».", "/jugador/seguiment", 3 * D, true);
  nt(U.player, "match", "Nova oportunitat 74% compatible.", "CF Turó Alt · «Pivot defensiu Juvenil A».", "/jugador/oportunitats/o_turo_mcd", 5 * D, true);

  nt(U.tutor, "contact", "CF Vallès Nord vol contactar amb en Nil.", "Cal la teva autorització abans que el club pugui escriure-li.", "/tutor", 20 * 60);
  nt(U.tutor, "profile", "El perfil d'en Nil ha rebut 4 visites aquesta setmana.", null, "/tutor", 2 * D, true);

  // Informe de moderació d'exemple
  ins(c, "reports", { id: "rp_1", reporter_user_id: U.player, target_type: "club", target_id: "club_vilamar", reason: "Club no verificat demana dades personals", details: "Em van demanar el telèfon per un canal extern.", status: "revisada", created_at: ago(c, 40) });
}

/**
 * Domini compartit (client + servidor + seed).
 * IMPORTANT: aquest fitxer no pot fer servir àlies (@/...) perquè també l'executa
 * `node --experimental-strip-types` des de scripts/seed.ts.
 */

export type Role = "director" | "coach" | "player" | "guardian";

export const ROLE_LABEL: Record<Role, string> = {
  director: "Director esportiu",
  coach: "Entrenador",
  player: "Jugador",
  guardian: "Tutor legal",
};

// ─── Posicions ────────────────────────────────────────────────────────────────
export const POSITIONS = ["POR", "LD", "DC", "LE", "MCD", "MC", "MCO", "ED", "EE", "DAV"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABEL: Record<Position, string> = {
  POR: "Porter",
  LD: "Lateral dret",
  DC: "Defensa central",
  LE: "Lateral esquerre",
  MCD: "Pivot defensiu",
  MC: "Migcampista",
  MCO: "Mitjapunta",
  ED: "Extrem dret",
  EE: "Extrem esquerre",
  DAV: "Davanter centre",
};

export const POSITION_GROUP: Record<Position, "POR" | "DEF" | "MIG" | "ATK"> = {
  POR: "POR", LD: "DEF", DC: "DEF", LE: "DEF", MCD: "MIG", MC: "MIG", MCO: "MIG", ED: "ATK", EE: "ATK", DAV: "ATK",
};

/** Posicions properes (compatibilitat parcial per al matching). */
export const ADJACENT_POSITIONS: Record<Position, Position[]> = {
  POR: [],
  LD: ["DC", "ED"],
  DC: ["MCD", "LD", "LE"],
  LE: ["DC", "EE"],
  MCD: ["DC", "MC"],
  MC: ["MCD", "MCO"],
  MCO: ["MC", "DAV", "ED", "EE"],
  ED: ["EE", "MCO", "LD"],
  EE: ["ED", "MCO", "LE"],
  DAV: ["MCO", "ED", "EE"],
};

/** Coordenades (en %) per dibuixar la posició en un camp vertical (atac amunt). */
export const POSITION_PITCH: Record<Position, { x: number; y: number }> = {
  POR: { x: 50, y: 91 },
  LD: { x: 84, y: 72 },
  DC: { x: 50, y: 76 },
  LE: { x: 16, y: 72 },
  MCD: { x: 50, y: 60 },
  MC: { x: 50, y: 47 },
  MCO: { x: 50, y: 34 },
  ED: { x: 83, y: 24 },
  EE: { x: 17, y: 24 },
  DAV: { x: 50, y: 14 },
};

// ─── Categories i nivells ─────────────────────────────────────────────────────
export const CATEGORIES = ["Infantil", "Cadet", "Juvenil", "Amateur"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Edat (any de temporada − any de naixement) de cada categoria. */
export const CATEGORY_AGE: Record<Category, { min: number; max: number; sub: string }> = {
  Infantil: { min: 12, max: 13, sub: "sub-14" },
  Cadet: { min: 14, max: 15, sub: "sub-16" },
  Juvenil: { min: 16, max: 18, sub: "sub-19" },
  Amateur: { min: 19, max: 40, sub: "sènior" },
};

export const LEVELS: { rank: number; label: string }[] = [
  { rank: 1, label: "Divisió d'Honor" },
  { rank: 2, label: "Nacional" },
  { rank: 3, label: "Preferent" },
  { rank: 4, label: "Primera Divisió" },
  { rank: 5, label: "Segona Divisió" },
];
export function levelLabel(rank: number | null | undefined): string {
  return LEVELS.find((l) => l.rank === rank)?.label ?? "—";
}

export const GENDER_LABEL: Record<string, string> = { M: "Masculí", F: "Femení" };

// ─── Atributs ─────────────────────────────────────────────────────────────────
export const ATTRS = [
  "velocitat", "resistencia", "forca", "tecnica", "passada", "xut",
  "regat", "joc_aeri", "defensa", "visio", "posicionament", "lideratge",
] as const;
export type AttrKey = (typeof ATTRS)[number] | "reflexos" | "sortides";
export type Attrs = Partial<Record<AttrKey, number>>;

export const ATTR_LABEL: Record<AttrKey, string> = {
  velocitat: "Velocitat",
  resistencia: "Resistència",
  forca: "Força",
  tecnica: "Tècnica",
  passada: "Passada",
  xut: "Definició",
  regat: "Regat",
  joc_aeri: "Joc aeri",
  defensa: "Defensa",
  visio: "Visió de joc",
  posicionament: "Posicionament",
  lideratge: "Lideratge",
  reflexos: "Reflexos",
  sortides: "Sortides",
};

/** Eixos del radar (6) calculats a partir dels atributs. */
export const RADAR_AXES: { key: string; label: string; from: AttrKey[] }[] = [
  { key: "fisic", label: "Físic", from: ["velocitat", "resistencia", "forca"] },
  { key: "tecnica", label: "Tècnica", from: ["tecnica", "regat"] },
  { key: "passada", label: "Passada", from: ["passada", "visio"] },
  { key: "atac", label: "Atac", from: ["xut", "regat"] },
  { key: "defensa", label: "Defensa", from: ["defensa", "joc_aeri", "posicionament"] },
  { key: "mental", label: "Mental", from: ["lideratge", "posicionament", "visio"] },
];

// ─── Característiques (traits) que pot demanar una oferta ─────────────────────
export const TRAITS: { key: string; label: string; attr: AttrKey }[] = [
  { key: "joc_aeri", label: "Joc aeri", attr: "joc_aeri" },
  { key: "sortida_pilota", label: "Sortida de pilota", attr: "passada" },
  { key: "defensa", label: "Solidesa defensiva", attr: "defensa" },
  { key: "velocitat", label: "Velocitat", attr: "velocitat" },
  { key: "regat", label: "1x1 / regat", attr: "regat" },
  { key: "visio", label: "Visió de joc", attr: "visio" },
  { key: "gol", label: "Gol", attr: "xut" },
  { key: "lideratge", label: "Lideratge", attr: "lideratge" },
  { key: "resistencia", label: "Recorregut", attr: "resistencia" },
  { key: "fisic", label: "Físic i duel", attr: "forca" },
  { key: "tecnica", label: "Tècnica", attr: "tecnica" },
  { key: "posicionament", label: "Lectura del joc", attr: "posicionament" },
  { key: "reflexos", label: "Reflexos", attr: "reflexos" },
];
export function traitLabel(key: string): string {
  return TRAITS.find((t) => t.key === key)?.label ?? key;
}

export const FOOT_LABEL: Record<string, string> = {
  dret: "Dret",
  esquerre: "Esquerre",
  ambdues: "Ambidextre",
  indiferent: "Indiferent",
};

// ─── Estats ───────────────────────────────────────────────────────────────────
export const AVAILABILITY_LABEL: Record<string, string> = {
  obert: "Obert a ofertes",
  escoltant: "Escoltant propostes",
  no_disponible: "No disponible",
};

export const CONTRACT_LABEL: Record<string, string> = {
  amb_fitxa: "Amb fitxa",
  final_temporada: "Fitxa fins a final de temporada",
  lliure: "Sense equip",
};

export const VERIFICATION_LABEL: Record<string, string> = {
  verified: "Verificat",
  pending: "Pendent",
  self: "Autodeclarat",
  updated: "Actualitzat",
};
export const VERIFICATION_HINT: Record<string, string> = {
  verified: "Dada confirmada pel club emissor (simulat a la demo).",
  pending: "Verificació sol·licitada, encara no confirmada.",
  self: "Dada introduïda pel mateix jugador.",
  updated: "Dada actualitzada recentment pel jugador o el club.",
};

export const PIPELINE_STAGES = [
  "nou", "revisar", "interessant", "contactat", "en_conversa", "prova", "en_espera", "rebutjat", "incorporat",
] as const;
export type Stage = (typeof PIPELINE_STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = {
  nou: "Nou",
  revisar: "Revisar",
  interessant: "Interessant",
  contactat: "Contactat",
  en_conversa: "En conversa",
  prova: "Prova",
  en_espera: "En espera",
  rebutjat: "Rebutjat",
  incorporat: "Incorporat",
};
export const STAGE_COLOR: Record<Stage, string> = {
  nou: "#64748B",
  revisar: "#8B5CF6",
  interessant: "#0EA5E9",
  contactat: "#F59E0B",
  en_conversa: "#F97316",
  prova: "#00B85F",
  en_espera: "#A1A1AA",
  rebutjat: "#EF4444",
  incorporat: "#059669",
};

/** Estat del procés tal com el veu el jugador. */
export const APP_STATUSES = [
  "enviada", "vista", "contacte", "prova", "en_proces", "acceptat", "rebutjat", "tancat",
] as const;
export type AppStatus = (typeof APP_STATUSES)[number];
export const APP_STATUS_LABEL: Record<AppStatus, string> = {
  enviada: "Sol·licitud enviada",
  vista: "El club ha vist el perfil",
  contacte: "Contacte",
  prova: "Prova",
  en_proces: "En procés",
  acceptat: "Acceptat",
  rebutjat: "No seleccionat",
  tancat: "Tancat",
};

/** Traducció de l'etapa del pipeline del club a l'estat que veu el jugador. */
export function stageToAppStatus(stage: Stage): AppStatus | null {
  switch (stage) {
    case "nou": return null;
    case "revisar":
    case "interessant": return "vista";
    case "contactat":
    case "en_conversa": return "contacte";
    case "prova": return "prova";
    case "en_espera": return "en_proces";
    case "rebutjat": return "rebutjat";
    case "incorporat": return "acceptat";
  }
}

export const CONTACT_STATUS_LABEL: Record<string, string> = {
  pendent: "Pendent de resposta",
  pendent_tutor: "Pendent del tutor",
  acceptada: "Acceptada",
  rebutjada: "Rebutjada",
  cancel_lada: "Cancel·lada",
};

export const CONTACT_REASONS: { key: string; label: string }[] = [
  { key: "oferta", label: "Interès per una oferta concreta" },
  { key: "prova", label: "Convidar a una prova" },
  { key: "seguiment", label: "Seguiment de cara a la propera temporada" },
  { key: "informacio", label: "Sol·licitar més informació" },
];

export const EVENT_KINDS = ["partit", "entrenament", "prova", "reunio", "scouting", "trucada", "recordatori"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  partit: "Partit",
  entrenament: "Entrenament",
  prova: "Prova",
  reunio: "Reunió",
  scouting: "Scouting",
  trucada: "Trucada / videotrucada",
  recordatori: "Recordatori",
};
export const EVENT_KIND_COLOR: Record<EventKind, string> = {
  partit: "#0E1116",
  entrenament: "#64748B",
  prova: "#00B85F",
  reunio: "#8B5CF6",
  scouting: "#0EA5E9",
  trucada: "#F59E0B",
  recordatori: "#EC4899",
};

// ─── Avaluacions ──────────────────────────────────────────────────────────────
export const EVAL_AREAS: { key: string; label: string; criteria: { key: string; label: string }[] }[] = [
  { key: "tecnica", label: "Tècnica", criteria: [
    { key: "control", label: "Control orientat" }, { key: "passada", label: "Passada" }, { key: "conduccio", label: "Conducció" },
  ] },
  { key: "tactica", label: "Tàctica", criteria: [
    { key: "posicionament", label: "Posicionament" }, { key: "lectura", label: "Lectura del joc" }, { key: "pressio", label: "Pressió i basculació" },
  ] },
  { key: "fisica", label: "Física", criteria: [
    { key: "velocitat", label: "Velocitat" }, { key: "resistencia", label: "Resistència" }, { key: "duel", label: "Duel i força" },
  ] },
  { key: "mental", label: "Mental", criteria: [
    { key: "concentracio", label: "Concentració" }, { key: "competitivitat", label: "Competitivitat" }, { key: "resiliencia", label: "Resposta a l'error" },
  ] },
  { key: "social", label: "Social", criteria: [
    { key: "companyonia", label: "Companyonia" }, { key: "comunicacio", label: "Comunicació" }, { key: "compromis", label: "Compromís" },
  ] },
];
export const EVAL_DECISIONS: Record<string, string> = {
  seguir: "Seguir observant",
  prova: "Convidar a prova",
  fitxar: "Recomanar incorporació",
  descartar: "Descartar",
};

export const SCOUT_RECOMMENDATION: Record<string, string> = {
  seguir: "Seguir",
  contactar: "Contactar",
  prova: "Prova",
  descartar: "Descartar",
};

export const ROSTER_STATUS_LABEL: Record<string, string> = {
  titular: "Titular",
  rotacio: "Rotació",
  jove: "Promoció",
  baixa: "Baixa a final de temporada",
  cedit: "Cedit",
};

// ─── Privacitat ───────────────────────────────────────────────────────────────
export type Privacy = {
  profile: "tots" | "verificats" | "contactats" | "ocult";
  videos: "tots" | "verificats" | "contactats";
  contact: "tots" | "verificats" | "ningu";
  showStats: boolean;
  showHeight: boolean;
  location: "ciutat" | "comarca" | "provincia";
  notifyEmail: boolean;
};
export const DEFAULT_PRIVACY: Privacy = {
  profile: "verificats",
  videos: "verificats",
  contact: "verificats",
  showStats: true,
  showHeight: true,
  location: "ciutat",
  notifyEmail: true,
};
export const PROFILE_VISIBILITY_LABEL: Record<string, string> = {
  tots: "Tots els clubs",
  verificats: "Només clubs verificats",
  contactats: "Només clubs amb qui tinc contacte",
  ocult: "Ocult (ningú no em pot trobar)",
};
export const CONTACT_PERMISSION_LABEL: Record<string, string> = {
  tots: "Qualsevol club",
  verificats: "Només clubs verificats",
  ningu: "Ningú (no accepto contactes nous)",
};
export const LOCATION_LABEL: Record<string, string> = {
  ciutat: "Municipi",
  comarca: "Només comarca",
  provincia: "Només província",
};

export type Preferences = {
  categories: string[];
  maxKm: number;
  interests: string[]; // "incorporacio" | "prova" | "segon_equip" | "femeni"
  levelMin: number | null;
  notes: string;
};
export const DEFAULT_PREFERENCES: Preferences = { categories: [], maxKm: 30, interests: ["incorporacio", "prova"], levelMin: null, notes: "" };

export const INTEREST_LABEL: Record<string, string> = {
  incorporacio: "Incorporació per a la temporada",
  prova: "Proves i entrenaments oberts",
  seguent_temporada: "Pensant en la propera temporada",
  estudis: "Compatible amb estudis",
};

// ─── Temporades i edats ───────────────────────────────────────────────────────
/** Any d'inici de la temporada en curs (la temporada comença l'agost). */
export function currentSeasonStartYear(now: Date = new Date()): number {
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}
export function seasonLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}
export function seasonId(startYear: number): string {
  return `s${startYear}`;
}
export function ageAt(birthDate: string, now: Date = new Date()): number {
  const b = new Date(birthDate);
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}
export function isMinor(birthDate: string, now: Date = new Date()): boolean {
  return ageAt(birthDate, now) < 18;
}
/** Categoria segons l'any de naixement per a una temporada donada. */
export function categoryForBirthYear(birthYear: number, seasonStart: number): Category {
  const age = seasonStart - birthYear;
  if (age <= 13) return "Infantil";
  if (age <= 15) return "Cadet";
  if (age <= 18) return "Juvenil";
  return "Amateur";
}
export function birthYearsForCategory(cat: Category, seasonStart: number): { min: number; max: number } {
  const r = CATEGORY_AGE[cat];
  return { min: seasonStart - Math.min(r.max, 23), max: seasonStart - r.min };
}

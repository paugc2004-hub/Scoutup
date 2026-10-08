/**
 * Dominio compartido (cliente + servidor + seed).
 * IMPORTANTE: este fichero no puede usar alias (@/...) porque también lo ejecuta
 * `node --experimental-strip-types` desde scripts/seed.ts.
 */

export type Role = "director" | "coordinator" | "coach" | "player" | "guardian";

export const ROLE_LABEL: Record<Role, string> = {
  director: "Director deportivo",
  coordinator: "Coordinador",
  coach: "Entrenador",
  player: "Jugador",
  guardian: "Tutor legal",
};

// ─── Posicions ────────────────────────────────────────────────────────────────
export const POSITIONS = ["POR", "LD", "DC", "LE", "MCD", "MC", "MCO", "ED", "EE", "DAV"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABEL: Record<Position, string> = {
  POR: "Portero",
  LD: "Lateral derecho",
  DC: "Defensa central",
  LE: "Lateral izquierdo",
  MCD: "Pivote defensivo",
  MC: "Centrocampista",
  MCO: "Mediapunta",
  ED: "Extremo derecho",
  EE: "Extremo izquierdo",
  DAV: "Delantero centro",
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
export const CATEGORIES = ["Infantil", "Cadete", "Juvenil", "Amateur"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Edat (any de temporada − any de naixement) de cada categoria. */
export const CATEGORY_AGE: Record<Category, { min: number; max: number; sub: string }> = {
  Infantil: { min: 12, max: 13, sub: "sub-14" },
  Cadete: { min: 14, max: 15, sub: "sub-16" },
  Juvenil: { min: 16, max: 18, sub: "sub-19" },
  Amateur: { min: 19, max: 40, sub: "sénior" },
};

export const LEVELS: { rank: number; label: string }[] = [
  { rank: 1, label: "División de Honor" },
  { rank: 2, label: "Nacional" },
  { rank: 3, label: "Preferente" },
  { rank: 4, label: "Primera División" },
  { rank: 5, label: "Segunda División" },
];
export function levelLabel(rank: number | null | undefined): string {
  return LEVELS.find((l) => l.rank === rank)?.label ?? "—";
}

export const GENDER_LABEL: Record<string, string> = { M: "Masculino", F: "Femenino" };

// ─── Atributs ─────────────────────────────────────────────────────────────────
export const ATTRS = [
  "velocitat", "resistencia", "forca", "tecnica", "passada", "xut",
  "regat", "joc_aeri", "defensa", "visio", "posicionament", "lideratge",
] as const;
export type AttrKey = (typeof ATTRS)[number] | "reflexos" | "sortides";
export type Attrs = Partial<Record<AttrKey, number>>;

export const ATTR_LABEL: Record<AttrKey, string> = {
  velocitat: "Velocidad",
  resistencia: "Resistencia",
  forca: "Fuerza",
  tecnica: "Técnica",
  passada: "Pase",
  xut: "Definición",
  regat: "Regate",
  joc_aeri: "Juego aéreo",
  defensa: "Defensa",
  visio: "Visión de juego",
  posicionament: "Posicionamiento",
  lideratge: "Liderazgo",
  reflexos: "Reflejos",
  sortides: "Salidas",
};

/** Eixos del radar (6) calculats a partir dels atributs. */
export const RADAR_AXES: { key: string; label: string; from: AttrKey[] }[] = [
  { key: "fisic", label: "Físico", from: ["velocitat", "resistencia", "forca"] },
  { key: "tecnica", label: "Técnica", from: ["tecnica", "regat"] },
  { key: "passada", label: "Pase", from: ["passada", "visio"] },
  { key: "atac", label: "Ataque", from: ["xut", "regat"] },
  { key: "defensa", label: "Defensa", from: ["defensa", "joc_aeri", "posicionament"] },
  { key: "mental", label: "Mental", from: ["lideratge", "posicionament", "visio"] },
];

// ─── Característiques (traits) que pot demanar una oportunitat ─────────────────────
export const TRAITS: { key: string; label: string; attr: AttrKey }[] = [
  { key: "joc_aeri", label: "Juego aéreo", attr: "joc_aeri" },
  { key: "sortida_pilota", label: "Salida de balón", attr: "passada" },
  { key: "defensa", label: "Solidez defensiva", attr: "defensa" },
  { key: "velocitat", label: "Velocidad", attr: "velocitat" },
  { key: "regat", label: "1x1 / regate", attr: "regat" },
  { key: "visio", label: "Visión de juego", attr: "visio" },
  { key: "gol", label: "Gol", attr: "xut" },
  { key: "lideratge", label: "Liderazgo", attr: "lideratge" },
  { key: "resistencia", label: "Recorrido", attr: "resistencia" },
  { key: "fisic", label: "Físico y duelo", attr: "forca" },
  { key: "tecnica", label: "Técnica", attr: "tecnica" },
  { key: "posicionament", label: "Lectura del juego", attr: "posicionament" },
  { key: "reflexos", label: "Reflejos", attr: "reflexos" },
];
export function traitLabel(key: string): string {
  return TRAITS.find((t) => t.key === key)?.label ?? key;
}

export const FOOT_LABEL: Record<string, string> = {
  dret: "Diestro",
  esquerre: "Zurdo",
  ambdues: "Ambidiestro",
  indiferent: "Indiferente",
};

// ─── Estats ───────────────────────────────────────────────────────────────────
export const AVAILABILITY_LABEL: Record<string, string> = {
  obert: "Abierto a oportunidades",
  escoltant: "Escuchando propuestas",
  no_disponible: "No disponible",
};

export const CONTRACT_LABEL: Record<string, string> = {
  amb_fitxa: "Con ficha",
  final_temporada: "Ficha hasta final de temporada",
  lliure: "Sin equipo",
};

export const VERIFICATION_LABEL: Record<string, string> = {
  verified: "Verificado",
  pending: "Pendiente",
  self: "Autodeclarado",
  updated: "Actualizado",
};
export const VERIFICATION_HINT: Record<string, string> = {
  verified: "Dato confirmado por el club emisor (simulado en la demo).",
  pending: "Verificación solicitada, aún sin confirmar.",
  self: "Dato introducido por el propio jugador.",
  updated: "Dato actualizado recientemente por el jugador o el club.",
};

export const PIPELINE_STAGES = [
  "nou", "revisar", "interessant", "contactat", "en_conversa", "prova", "en_espera", "rebutjat", "incorporat",
] as const;
export type Stage = (typeof PIPELINE_STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = {
  nou: "Nuevo",
  revisar: "Revisar",
  interessant: "Interesante",
  contactat: "Contactado",
  en_conversa: "En conversación",
  prova: "Prueba",
  en_espera: "En espera",
  rebutjat: "Descartado",
  incorporat: "Incorporado",
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
  enviada: "Solicitud enviada",
  vista: "El club ha visto el perfil",
  contacte: "Contacto",
  prova: "Prueba",
  en_proces: "En proceso",
  acceptat: "Aceptado",
  rebutjat: "No seleccionado",
  tancat: "Cerrado",
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
  pendent: "Pendiente de respuesta",
  pendent_tutor: "Pendiente del tutor",
  acceptada: "Aceptada",
  rebutjada: "Rechazada",
  cancel_lada: "Cancelada",
};

export const CONTACT_REASONS: { key: string; label: string }[] = [
  { key: "oferta", label: "Interés por una oportunidad concreta" },
  { key: "prova", label: "Invitar a una prueba" },
  { key: "seguiment", label: "Seguimiento de cara a la próxima temporada" },
  { key: "informacio", label: "Solicitar más información" },
];

export const EVENT_KINDS = ["partit", "entrenament", "prova", "reunio", "scouting", "trucada", "recordatori"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  partit: "Partido",
  entrenament: "Entrenamiento",
  prova: "Prueba",
  reunio: "Reunión",
  scouting: "Observación",
  trucada: "Llamada / videollamada",
  recordatori: "Recordatorio",
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
  { key: "tecnica", label: "Técnica", criteria: [
    { key: "control", label: "Control orientado" }, { key: "passada", label: "Pase" }, { key: "conduccio", label: "Conducción" },
  ] },
  { key: "tactica", label: "Táctica", criteria: [
    { key: "posicionament", label: "Posicionamiento" }, { key: "lectura", label: "Lectura del juego" }, { key: "pressio", label: "Presión y basculación" },
  ] },
  { key: "fisica", label: "Física", criteria: [
    { key: "velocitat", label: "Velocidad" }, { key: "resistencia", label: "Resistencia" }, { key: "duel", label: "Duelo y fuerza" },
  ] },
  { key: "mental", label: "Mental", criteria: [
    { key: "concentracio", label: "Concentración" }, { key: "competitivitat", label: "Competitividad" }, { key: "resiliencia", label: "Respuesta al error" },
  ] },
  { key: "social", label: "Social", criteria: [
    { key: "companyonia", label: "Compañerismo" }, { key: "comunicacio", label: "Comunicación" }, { key: "compromis", label: "Compromiso" },
  ] },
];
export const EVAL_DECISIONS: Record<string, string> = {
  seguir: "Seguir observando",
  prova: "Invitar a prueba",
  fitxar: "Recomendar incorporación",
  descartar: "Descartar",
};

export const SCOUT_RECOMMENDATION: Record<string, string> = {
  seguir: "Seguir",
  contactar: "Contactar",
  prova: "Prueba",
  descartar: "Descartar",
};

export const ROSTER_STATUS_LABEL: Record<string, string> = {
  titular: "Titular",
  rotacio: "Rotación",
  jove: "Promoción",
  baixa: "Baja a final de temporada",
  cedit: "Cedido",
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
  tots: "Todos los clubes",
  verificats: "Solo clubes verificados",
  contactats: "Solo clubes con los que tengo contacto",
  ocult: "Oculto (nadie me puede encontrar)",
};
export const CONTACT_PERMISSION_LABEL: Record<string, string> = {
  tots: "Cualquier club",
  verificats: "Solo clubes verificados",
  ningu: "Nadie (no acepto contactos nuevos)",
};
export const LOCATION_LABEL: Record<string, string> = {
  ciutat: "Municipio",
  comarca: "Solo comarca",
  provincia: "Solo provincia",
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
  incorporacio: "Incorporación para la temporada",
  prova: "Pruebas y entrenamientos abiertos",
  seguent_temporada: "Pensando en la próxima temporada",
  estudis: "Compatible con estudios",
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
  if (age <= 15) return "Cadete";
  if (age <= 18) return "Juvenil";
  return "Amateur";
}
export function birthYearsForCategory(cat: Category, seasonStart: number): { min: number; max: number } {
  const r = CATEGORY_AGE[cat];
  return { min: seasonStart - Math.min(r.max, 23), max: seasonStart - r.min };
}

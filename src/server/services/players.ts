import { all, get, parseJson } from "@/server/db/client";
import {
  ageAt, isMinor, levelLabel, POSITION_LABEL, DEFAULT_PRIVACY, DEFAULT_PREFERENCES, RADAR_AXES,
} from "@/lib/domain";
import type { Attrs, Privacy, Preferences, Position } from "@/lib/domain";
import type { MatchPlayer } from "@/lib/matching";

export type Season = { id: string; label: string; start_year: number; is_current: number };

export function seasons(): Season[] {
  return all<Season>("SELECT * FROM seasons ORDER BY start_year");
}
export function currentSeason(): Season {
  return get<Season>("SELECT * FROM seasons WHERE is_current = 1")!;
}
export function previousSeason(): Season {
  const cur = currentSeason();
  return get<Season>("SELECT * FROM seasons WHERE start_year = ?", cur.start_year - 1)!;
}

export type PlayerRow = {
  id: string; user_id: string | null; first_name: string; last_name: string; gender: string; birth_date: string; nationality: string;
  languages: string | null; city: string; comarca: string; province: string; region: string; lat: number; lng: number;
  primary_position: string; secondary_positions: string | null; foot: string; height_cm: number | null; club_id: string | null;
  team_id: string | null; club_name_free: string | null; category: string; division_rank: number; style: string | null;
  description: string | null; availability: string; available_from: string | null; contract_status: string; attrs: string;
  avatar_hue: number; verification: string; guardian_user_id: string | null; guardian_email: string | null; guardian_consent: number;
  preferences: string | null; privacy: string | null; completeness: number; onboarding_done: number; updated_at: string; created_at: string;
  club_name: string | null; club_short: string | null; club_initials: string | null; club_color: string | null; club_verified: number | null; team_name: string | null;
};

const PLAYER_SELECT = `SELECT p.*, c.name AS club_name, c.short_name AS club_short, c.initials AS club_initials, c.color_primary AS club_color,
  c.verified AS club_verified, t.name AS team_name
  FROM players p LEFT JOIN clubs c ON c.id = p.club_id LEFT JOIN teams t ON t.id = p.team_id`;

export function allPlayerRows(): PlayerRow[] {
  return all<PlayerRow>(`${PLAYER_SELECT} WHERE p.onboarding_done = 1 OR p.completeness >= 30`);
}
export function playerRow(id: string): PlayerRow | undefined {
  return get<PlayerRow>(`${PLAYER_SELECT} WHERE p.id = ?`, id);
}

export type StatsRow = { id: string; player_id: string; season_id: string; team_name: string | null; matches: number; starts: number; minutes: number; goals: number; assists: number; yellow: number; red: number; callups: number; clean_sheets: number; verification: string; updated_at: string };

export function statsBySeason(seasonId: string): Map<string, StatsRow> {
  return new Map(all<StatsRow>("SELECT * FROM player_stats WHERE season_id = ?", seasonId).map((s) => [s.player_id, s]));
}
export function careerCounts(): Map<string, number> {
  return new Map(all<{ player_id: string; n: number }>("SELECT player_id, COUNT(*) AS n FROM player_career GROUP BY player_id").map((r) => [r.player_id, r.n]));
}
export function videoCounts(): Map<string, number> {
  return new Map(all<{ player_id: string; n: number }>("SELECT player_id, COUNT(*) AS n FROM videos GROUP BY player_id").map((r) => [r.player_id, r.n]));
}

export function privacyOf(p: Pick<PlayerRow, "privacy">): Privacy {
  return { ...DEFAULT_PRIVACY, ...parseJson<Partial<Privacy>>(p.privacy, {}) };
}
export function preferencesOf(p: Pick<PlayerRow, "preferences">): Preferences {
  return { ...DEFAULT_PREFERENCES, ...parseJson<Partial<Preferences>>(p.preferences, {}) };
}
export function attrsOf(p: Pick<PlayerRow, "attrs">): Attrs {
  return parseJson<Attrs>(p.attrs, {});
}
export function secondaryOf(p: Pick<PlayerRow, "secondary_positions">): Position[] {
  return parseJson<Position[]>(p.secondary_positions, []);
}

export function toMatchPlayer(p: PlayerRow, prev: StatsRow | undefined, careerCount: number): MatchPlayer {
  return {
    primary_position: p.primary_position,
    secondary_positions: secondaryOf(p),
    birth_year: Number(p.birth_date.slice(0, 4)),
    gender: p.gender,
    division_rank: p.division_rank,
    lat: p.lat,
    lng: p.lng,
    city: p.city,
    availability: p.availability,
    available_from: p.available_from,
    foot: p.foot,
    height_cm: p.height_cm,
    attrs: attrsOf(p),
    prev_minutes: prev?.minutes ?? 0,
    prev_matches: prev?.matches ?? 0,
    prev_starts: prev?.starts ?? 0,
    career_seasons: careerCount,
    stats_verified: prev?.verification === "verified",
  };
}

/** Context que es carrega un cop per petició per construir llistes de jugadors. */
export type PlayerCtx = { prev: Map<string, StatsRow>; career: Map<string, number>; videos: Map<string, number>; prevSeason: Season; now: Date };
export function playerCtx(): PlayerCtx {
  const prevSeason = previousSeason();
  return { prev: statsBySeason(prevSeason.id), career: careerCounts(), videos: videoCounts(), prevSeason, now: new Date() };
}

export type PlayerView = {
  id: string; name: string; first_name: string; last_name: string; initials: string; hue: number; gender: string;
  age: number; birth_year: number; minor: boolean; position: Position; position_label: string; secondary: Position[];
  foot: string; height: number | null; location: string; comarca: string; club_id: string | null; club_name: string;
  club_short: string | null; club_initials: string | null; club_color: string | null; team_name: string | null; category: string;
  level_rank: number; level_label: string; availability: string; contract_status: string; verification: string;
  completeness: number; style: string | null; description: string | null; updated_at: string; attrs: Attrs;
  radar: { key: string; label: string; value: number }[];
  prev: { matches: number; starts: number; minutes: number; goals: number; assists: number; yellow: number; red: number; callups: number; clean_sheets: number; verification: string } | null;
  stats_hidden: boolean; has_video: boolean; languages: string | null;
};

export function radarOf(a: Attrs) {
  return RADAR_AXES.map((ax) => {
    const vals = ax.from.map((k) => a[k] ?? 0).filter((v) => v > 0);
    return { key: ax.key, label: ax.label, value: vals.length ? Math.round((vals.reduce((x, y) => x + y, 0) / vals.length) * 10) / 10 : 0 };
  });
}

/**
 * Construeix la vista d'un jugador aplicant els controls de privacitat camp a camp.
 * `full` = el propi jugador o el seu tutor (ho veuen tot).
 */
export function presentPlayer(p: PlayerRow, ctx: PlayerCtx, opts: { full?: boolean; ownClub?: boolean } = {}): PlayerView {
  const priv = privacyOf(p);
  const full = !!opts.full || !!opts.ownClub;
  const minor = isMinor(p.birth_date, ctx.now);
  const loc = full || priv.location === "ciutat" ? `${p.city} · ${p.comarca}` : priv.location === "comarca" || minor ? p.comarca : p.province;
  const statsHidden = !full && !priv.showStats;
  const prev = ctx.prev.get(p.id);
  const attrs = attrsOf(p);
  return {
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    first_name: p.first_name,
    last_name: p.last_name,
    initials: (p.first_name[0] + (p.last_name[0] ?? "")).toUpperCase(),
    hue: p.avatar_hue,
    gender: p.gender,
    age: ageAt(p.birth_date, ctx.now),
    birth_year: Number(p.birth_date.slice(0, 4)),
    minor,
    position: p.primary_position as Position,
    position_label: POSITION_LABEL[p.primary_position as Position],
    secondary: secondaryOf(p),
    foot: p.foot,
    height: full || priv.showHeight ? p.height_cm : null,
    location: minor && !full ? p.comarca : loc,
    comarca: p.comarca,
    club_id: p.club_id,
    club_name: p.club_name ?? p.club_name_free ?? "Sense equip",
    club_short: p.club_short,
    club_initials: p.club_initials,
    club_color: p.club_color,
    team_name: p.team_name,
    category: p.category,
    level_rank: p.division_rank,
    level_label: levelLabel(p.division_rank),
    availability: p.availability,
    contract_status: p.contract_status,
    verification: p.verification,
    completeness: p.completeness,
    style: p.style,
    description: p.description,
    updated_at: p.updated_at,
    attrs,
    radar: radarOf(attrs),
    prev: statsHidden || !prev ? null : { matches: prev.matches, starts: prev.starts, minutes: prev.minutes, goals: prev.goals, assists: prev.assists, yellow: prev.yellow, red: prev.red, callups: prev.callups, clean_sheets: prev.clean_sheets, verification: prev.verification },
    stats_hidden: statsHidden,
    has_video: (ctx.videos.get(p.id) ?? 0) > 0,
    languages: p.languages,
  };
}

/** Filtres de cerca que es resolen a SQL (consulta parametritzada, sense concatenar entrada de l'usuari). */
export type PlayerSqlFilter = {
  excludeClubId?: string; pos?: string; withSecondary?: boolean; category?: string; gender?: string; foot?: string;
  levelMax?: number; heightMin?: number; comarca?: string; availability?: string; activeOnly?: boolean; verifiedOnly?: boolean; freeOnly?: boolean;
};

/**
 * Cerca de jugadors al servidor. Els filtres simples es fan a SQL perquè la cerca escali;
 * la visibilitat (privacitat, menors, bloquejos) es continua aplicant després amb clubCanSee.
 */
export function searchPlayerRows(f: PlayerSqlFilter): PlayerRow[] {
  const where: string[] = ["(p.onboarding_done = 1 OR p.completeness >= 30)"];
  const params: unknown[] = [];
  const add = (sql: string, ...v: unknown[]) => {
    where.push(sql);
    params.push(...v);
  };
  if (f.excludeClubId) add("(p.club_id IS NULL OR p.club_id != ?)", f.excludeClubId);
  if (f.pos) {
    if (f.withSecondary) add("(p.primary_position = ? OR EXISTS (SELECT 1 FROM json_each(p.secondary_positions) WHERE value = ?))", f.pos, f.pos);
    else add("p.primary_position = ?", f.pos);
  }
  if (f.category) add("p.category = ?", f.category);
  if (f.gender) add("p.gender = ?", f.gender);
  if (f.foot) add("p.foot = ?", f.foot);
  if (f.levelMax) add("p.division_rank <= ?", f.levelMax);
  if (f.heightMin) add("p.height_cm >= ?", f.heightMin);
  if (f.comarca) add("p.comarca = ?", f.comarca);
  if (f.activeOnly) add("p.availability != 'no_disponible'");
  else if (f.availability) add("p.availability = ?", f.availability);
  if (f.verifiedOnly) add("p.verification = 'verified'");
  if (f.freeOnly) add("p.club_id IS NULL");
  return all<PlayerRow>(`${PLAYER_SELECT} WHERE ${where.join(" AND ")}`, ...params);
}

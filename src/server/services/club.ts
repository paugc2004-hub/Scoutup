import { all, get, parseJson } from "@/server/db/client";
import type { SessionUser } from "@/server/auth/session";
import { teamFilterSql } from "@/server/services/access";
import { currentSeason } from "@/server/services/players";
import type { Stage } from "@/lib/domain";
import { hasClubScope } from "@/lib/permissions";
import type { ClubRole } from "@/lib/permissions";

export type ClubRow = {
  id: string; name: string; short_name: string; initials: string; color_primary: string; color_secondary: string; founded: number | null;
  city: string; comarca: string; province: string; lat: number; lng: number; website: string | null; instagram: string | null; email: string | null;
  phone: string | null; office_hours: string | null; languages: string | null; description: string | null; history: string | null; philosophy: string | null;
  values_text: string | null; objectives: string | null; sporting_model: string | null; facilities: string | null; tier: number; verified: number; created_at: string;
};
export type TeamRow = { id: string; club_id: string; name: string; category: string; gender: string; is_first_team: number };

export function club(id: string): ClubRow {
  return get<ClubRow>("SELECT * FROM clubs WHERE id = ?", id)!;
}
export function facilitiesOf(c: ClubRow): { name: string; type: string; note?: string }[] {
  return parseJson(c.facilities, []);
}

const CAT_ORDER = "CASE category WHEN 'Amateur' THEN 0 WHEN 'Juvenil' THEN 1 WHEN 'Cadete' THEN 2 WHEN 'Infantil' THEN 3 ELSE 4 END";

export function clubTeams(clubId: string): TeamRow[] {
  return all<TeamRow>(`SELECT * FROM teams WHERE club_id = ? ORDER BY ${CAT_ORDER}, gender, name`, clubId);
}
export function scopedTeams(u: SessionUser & { club_id: string }): TeamRow[] {
  const all_ = clubTeams(u.club_id);
  return hasClubScope(u.role) ? all_ : all_.filter((t) => t.id === u.team_id);
}

export type Need = { position: string; text: string; priority: "alta" | "mitjana" | "baixa"; team_id: string; team_name: string };
export function teamNeeds(u: SessionUser & { club_id: string }): Need[] {
  const season = currentSeason();
  const tf = teamFilterSql(u, "t.id");
  const rows = all<{ needs: string | null; team_id: string; team_name: string }>(
    `SELECT ts.needs, t.id AS team_id, t.name AS team_name FROM team_seasons ts JOIN teams t ON t.id = ts.team_id WHERE t.club_id = ? AND ts.season_id = ? AND ${tf.sql}`,
    u.club_id, season.id, ...tf.params,
  );
  return rows.flatMap((r) => parseJson<Omit<Need, "team_id" | "team_name">[]>(r.needs, []).map((n) => ({ ...n, team_id: r.team_id, team_name: r.team_name })));
}

export type EventRow = { id: string; club_id: string | null; team_id: string | null; player_id: string | null; owner_user_id: string | null; kind: string; title: string; starts_at: string; ends_at: string | null; location: string | null; opponent: string | null; notes: string | null; related_player_id: string | null; team_name?: string | null; related_name?: string | null };

export function clubEvents(u: SessionUser & { club_id: string }, fromIso: string, toIso: string): EventRow[] {
  const tf = teamFilterSql(u, "e.team_id", true);
  return all<EventRow>(
    `SELECT e.*, t.name AS team_name, p.first_name || ' ' || p.last_name AS related_name FROM events e LEFT JOIN teams t ON t.id = e.team_id LEFT JOIN players p ON p.id = e.related_player_id
     WHERE e.club_id = ? AND e.starts_at >= ? AND e.starts_at < ? AND ${tf.sql} ORDER BY e.starts_at`,
    u.club_id, fromIso, toIso, ...tf.params,
  );
}

export type PipelineRow = { id: string; team_id: string | null; player_id: string; offer_id: string | null; stage: Stage; added_by: string | null; sort: number; created_at: string; updated_at: string; team_name: string | null; offer_title: string | null; added_by_name: string | null };
export function pipelineRows(u: SessionUser & { club_id: string }): PipelineRow[] {
  const tf = teamFilterSql(u, "pe.team_id");
  return all<PipelineRow>(
    `SELECT pe.*, t.name AS team_name, o.title AS offer_title, us.name AS added_by_name FROM pipeline_entries pe
     LEFT JOIN teams t ON t.id = pe.team_id LEFT JOIN offers o ON o.id = pe.offer_id LEFT JOIN users us ON us.id = pe.added_by
     WHERE pe.club_id = ? AND ${tf.sql} ORDER BY pe.updated_at DESC`,
    u.club_id, ...tf.params,
  );
}

export type ActivityRow = { id: string; player_id: string; kind: string; text: string; created_at: string; user_name: string | null; player_name: string; from_stage: string | null; to_stage: string | null };
export function recentActivity(u: SessionUser & { club_id: string }, limit = 8, playerId?: string): ActivityRow[] {
  const tf = teamFilterSql(u, "pe.team_id");
  const scope = hasClubScope(u.role) ? "1=1" : `(pa.user_id = ? OR pa.entry_id IN (SELECT pe.id FROM pipeline_entries pe WHERE ${tf.sql}))`;
  const params = hasClubScope(u.role) ? [] : [u.id, ...tf.params];
  return all<ActivityRow>(
    `SELECT pa.*, us.name AS user_name, p.first_name || ' ' || p.last_name AS player_name FROM pipeline_activity pa
     LEFT JOIN users us ON us.id = pa.user_id JOIN players p ON p.id = pa.player_id
     WHERE pa.club_id = ? ${playerId ? "AND pa.player_id = ?" : ""} AND ${scope} ORDER BY pa.created_at DESC LIMIT ?`,
    u.club_id, ...(playerId ? [playerId] : []), ...params, limit,
  );
}

export type StaffUser = { id: string; name: string; email: string; role: ClubRole; status: "active" | "disabled"; title: string | null; team_id: string | null; team_name: string | null; avatar_hue: number; last_login_at: string | null; is_demo_login: number };
export function staffUsers(clubId: string): StaffUser[] {
  return all<StaffUser>(
    "SELECT u.id, u.name, u.email, u.role, u.status, u.title, u.team_id, t.name AS team_name, u.avatar_hue, u.last_login_at, u.is_demo_login FROM users u LEFT JOIN teams t ON t.id = u.team_id WHERE u.club_id = ? AND u.role IN ('director','coordinator','coach') ORDER BY CASE u.role WHEN 'director' THEN 0 WHEN 'coordinator' THEN 1 ELSE 2 END, u.name",
    clubId,
  );
}

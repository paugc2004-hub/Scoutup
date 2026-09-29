import { all } from "@/server/db/client";
import type { AppStatus } from "@/lib/domain";

export type Interest = { club_id: string; club_name: string; initials: string; color: string; verified: number; city: string; views: number; last_view: string | null; following: boolean; saved: boolean; since: string };

/** Clubs que han mostrat interès pel jugador (sense revelar dades internes com notes o etapes). */
export function clubsInterested(playerId: string): Interest[] {
  const views = all<{ club_id: string; n: number; last: string }>("SELECT club_id, COUNT(*) AS n, MAX(created_at) AS last FROM profile_views WHERE player_id = ? AND created_at > ? GROUP BY club_id", playerId, new Date(Date.now() - 30 * 86400000).toISOString());
  const pipes = all<{ club_id: string; created_at: string }>("SELECT club_id, created_at FROM pipeline_entries WHERE player_id = ? AND stage != 'rebutjat'", playerId);
  const favs = all<{ club_id: string; created_at: string }>("SELECT u.club_id, f.created_at FROM favorites f JOIN users u ON u.id = f.user_id WHERE f.target_type = 'player' AND f.target_id = ? AND u.club_id IS NOT NULL", playerId);
  const ids = new Set([...views.map((v) => v.club_id), ...pipes.map((p) => p.club_id), ...favs.map((f) => f.club_id)]);
  const clubs = ids.size ? all<{ id: string; name: string; initials: string; color_primary: string; verified: number; city: string }>(`SELECT id, name, initials, color_primary, verified, city FROM clubs WHERE id IN (${[...ids].map(() => "?").join(",")})`, ...ids) : [];
  return clubs
    .map((c) => {
      const v = views.find((x) => x.club_id === c.id);
      const p = pipes.find((x) => x.club_id === c.id);
      const f = favs.find((x) => x.club_id === c.id);
      const dates = [v?.last, p?.created_at, f?.created_at].filter(Boolean) as string[];
      return { club_id: c.id, club_name: c.name, initials: c.initials, color: c.color_primary, verified: c.verified, city: c.city, views: v?.n ?? 0, last_view: v?.last ?? null, following: !!p, saved: !!f, since: dates.sort().reverse()[0] };
    })
    .sort((a, b) => Number(b.following) - Number(a.following) || b.since.localeCompare(a.since));
}

export type TrackItem = { id: string; offer_id: string; title: string; kind: string; club_id: string; club_name: string; initials: string; color: string; status: AppStatus; match_score: number | null; created_at: string; updated_at: string; trial_date: string | null; team_name: string | null };
export function applicationsOf(playerId: string): TrackItem[] {
  return all<TrackItem>(
    `SELECT a.id, a.offer_id, o.title, o.kind, o.club_id, c.name AS club_name, c.initials, c.color_primary AS color, a.status, a.match_score, a.created_at, a.updated_at, o.trial_date, t.name AS team_name
     FROM applications a JOIN offers o ON o.id = a.offer_id JOIN clubs c ON c.id = o.club_id LEFT JOIN teams t ON t.id = o.team_id WHERE a.player_id = ? ORDER BY a.updated_at DESC`,
    playerId,
  );
}

export function playerEvents(playerId: string, fromIso: string, toIso: string) {
  return all<{ id: string; kind: string; title: string; starts_at: string; ends_at: string | null; location: string | null; notes: string | null; owner_user_id: string | null }>(
    "SELECT * FROM events WHERE player_id = ? AND starts_at >= ? AND starts_at < ? ORDER BY starts_at", playerId, fromIso, toIso,
  );
}

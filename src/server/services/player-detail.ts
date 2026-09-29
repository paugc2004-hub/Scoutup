import { all } from "@/server/db/client";

export type SeasonStats = { season_id: string; label: string; start_year: number; team_name: string | null; matches: number; starts: number; minutes: number; goals: number; assists: number; yellow: number; red: number; callups: number; clean_sheets: number; verification: string; updated_at: string };
export type CareerRow = { id: string; season_label: string; club_name: string; club_id: string | null; team_name: string | null; category: string | null; division: string | null; role: string | null; verification: string; sort: number };
export type VideoRow = { id: string; title: string; kind: string; duration_s: number; recorded_at: string; views: number };
export type AchievementRow = { id: string; season_label: string | null; title: string; kind: string };

export function playerDetail(playerId: string) {
  return {
    stats: all<SeasonStats>("SELECT ps.*, s.label, s.start_year FROM player_stats ps JOIN seasons s ON s.id = ps.season_id WHERE ps.player_id = ? ORDER BY s.start_year DESC", playerId),
    career: all<CareerRow>("SELECT * FROM player_career WHERE player_id = ? ORDER BY sort", playerId),
    videos: all<VideoRow>("SELECT * FROM videos WHERE player_id = ? ORDER BY recorded_at DESC", playerId),
    achievements: all<AchievementRow>("SELECT * FROM achievements WHERE player_id = ? ORDER BY season_label DESC", playerId),
    experiences: all<{ id: string; kind: string; title: string; year: number | null }>("SELECT * FROM player_experiences WHERE player_id = ? ORDER BY year DESC", playerId),
  };
}

import { requirePlayer } from "@/server/auth/session";
import { all, get } from "@/server/db/client";
import { playerRow, preferencesOf, privacyOf, secondaryOf, attrsOf, currentSeason, previousSeason } from "@/server/services/players";
import { playerDetail } from "@/server/services/player-detail";
import { completenessOf } from "@/server/services/player-actions";
import { PageHeader } from "@/components/ui";
import { ProfileWizard } from "@/components/player/profile-wizard";
import { isMinor } from "@/lib/domain";
import type { Position } from "@/lib/domain";

export const metadata = { title: "Editar perfil" };

export default async function EditProfile({ searchParams }: { searchParams: Promise<{ pas?: string }> }) {
  const u = await requirePlayer();
  const sp = await searchParams;
  const p = playerRow(u.player_id)!;
  const d = playerDetail(u.player_id);
  const comp = completenessOf(u.player_id);
  const seasons = [currentSeason(), previousSeason()].map((s) => {
    const st = get<Record<string, number> & { team_name: string | null; verification: string }>("SELECT * FROM player_stats WHERE player_id = ? AND season_id = ?", u.player_id, s.id);
    return { id: s.id, label: s.label, team_name: st?.team_name ?? (p.club_name ? `${p.club_name}${p.team_name ? ` · ${p.team_name}` : ""}` : null), verification: st?.verification ?? null, stats: st ? { callups: st.callups, matches: st.matches, starts: st.starts, minutes: st.minutes, goals: st.goals, assists: st.assists, yellow: st.yellow, red: st.red, clean_sheets: st.clean_sheets } : null };
  });
  void all;
  return (
    <div>
      <PageHeader eyebrow={p.onboarding_done ? "El meu perfil" : "Benvingut a ScoutUp"} title={p.onboarding_done ? "Editar el perfil" : "Crea el teu perfil esportiu"} subtitle="Vuit passos curts. Pots guardar i tornar-hi quan vulguis; la completesa s'actualitza a cada pas." />
      <ProfileWizard
        startStep={Number(sp.pas ?? 1)}
        initial={{
          first_name: p.first_name, last_name: p.last_name, birth_date: p.birth_date, city: p.city, nationality: p.nationality, languages: p.languages ?? "",
          primary_position: p.primary_position as Position, secondary_positions: secondaryOf(p), foot: p.foot, height_cm: p.height_cm, style: p.style ?? "", description: p.description ?? "", attrs: attrsOf(p),
          club_label: p.club_name ? `${p.club_name}${p.team_name ? ` · ${p.team_name}` : ""}` : "", has_club: !!p.club_id, club_name_free: p.club_name_free ?? "", division_rank: p.division_rank,
          availability: p.availability, available_from: p.available_from?.slice(0, 10) ?? "", contract_status: p.contract_status,
          preferences: preferencesOf(p), privacy: privacyOf(p), minor: isMinor(p.birth_date),
          career: d.career, achievements: d.achievements.map((a) => ({ id: a.id, title: a.title, season_label: a.season_label })), videos: d.videos.map((v) => ({ id: v.id, title: v.title, kind: v.kind, duration_s: v.duration_s })),
          seasons, completeness: comp.score, items: comp.items,
        }}
      />
    </div>
  );
}

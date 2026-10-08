import { requirePlayer } from "@/server/auth/session";
import { all } from "@/server/db/client";
import { playerRow, currentSeason } from "@/server/services/players";
import { competitionProvider } from "@/server/competition/provider";
import { distanceKm, COMARQUES } from "@/lib/geo";
import { PageHeader } from "@/components/ui";
import { ClubBrowser } from "@/components/player/club-browser";
import type { ClubLite } from "@/components/player/club-browser";

export const metadata = { title: "Descubrir clubes" };

export default async function ClubsPage() {
  const u = await requirePlayer();
  const me = playerRow(u.player_id)!;
  const season = currentSeason();
  const provider = competitionProvider();
  const clubs = all<{ id: string; name: string; initials: string; color_primary: string; city: string; comarca: string; verified: number; lat: number; lng: number }>("SELECT id, name, initials, color_primary, city, comarca, verified, lat, lng FROM clubs");
  const teams = all<{ id: string; club_id: string; name: string; category: string; gender: string }>("SELECT id, club_id, name, category, gender FROM teams");
  const offers = all<{ club_id: string; n: number }>("SELECT club_id, COUNT(*) AS n FROM offers WHERE status = 'oberta' GROUP BY club_id");
  const favs = new Set(all<{ target_id: string }>("SELECT target_id FROM favorites WHERE user_id = ? AND target_type = 'club'", u.id).map((f) => f.target_id));
  const items: ClubLite[] = clubs.map((c) => ({
    id: c.id, name: c.name, initials: c.initials, color: c.color_primary, city: c.city, comarca: c.comarca, verified: !!c.verified,
    km: distanceKm(me.lat, me.lng, c.lat, c.lng), offers: offers.find((o) => o.club_id === c.id)?.n ?? 0, favorite: favs.has(c.id),
    teams: teams.filter((t) => t.club_id === c.id).map((t) => ({ name: t.name, category: t.category, gender: t.gender, level: provider.competitionForTeam(t.id, season.id)?.division ?? "—" })),
  }));
  return (
    <div>
      <PageHeader eyebrow="Explorar" title="Descubrir clubes y equipos" subtitle="Busca clubes y equipos de cualquier categoría. Ordenados por proximidad a tu municipio." />
      <ClubBrowser clubs={items} comarques={COMARQUES} />
    </div>
  );
}

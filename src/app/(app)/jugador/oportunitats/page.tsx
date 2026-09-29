import { requirePlayer } from "@/server/auth/session";
import { playerCtx, playerRow, secondaryOf } from "@/server/services/players";
import { opportunitiesFor, traitsOf } from "@/server/services/offers";
import { PageHeader } from "@/components/ui";
import { OpportunityList } from "@/components/player/opportunities";
import type { OppLite } from "@/components/player/opportunities";
import { POSITION_LABEL, levelLabel } from "@/lib/domain";
import type { Position } from "@/lib/domain";

export const metadata = { title: "Oportunitats" };

export default async function OpportunitiesPage() {
  const u = await requirePlayer();
  const row = playerRow(u.player_id)!;
  const sec = secondaryOf(row);
  const list = opportunitiesFor(row, playerCtx());
  const items: OppLite[] = list.map(({ offer: o, match: m, application: a, favorite }) => ({
    id: o.id, title: o.title, kind: o.kind, club_id: o.club_id, club_name: o.club_name, club_initials: o.club_initials, club_color: o.club_color, club_verified: o.club_verified,
    team_name: o.team_name, position: o.position, position_label: POSITION_LABEL[o.position as Position], mine: o.position === row.primary_position || sec.includes(o.position as Position),
    score: m.score, km: m.distanceKm, created_at: o.created_at, trial_date: o.trial_date, status: a?.status ?? null, favorite, traits: traitsOf(o), level: levelLabel(o.level_min),
  }));
  return (
    <div>
      <PageHeader eyebrow="Per a tu" title="Oportunitats" subtitle={`${items.length} oportunitats obertes per a equips ${row.gender === "F" ? "femenins" : "masculins"}. El percentatge indica com encaixa el teu perfil amb el que busca cada club.`} />
      <OpportunityList items={items} />
    </div>
  );
}

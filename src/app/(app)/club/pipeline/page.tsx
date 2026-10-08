import { KanbanSquare } from "lucide-react";
import { can } from "@/server/services/access";
import { requireClubStaff } from "@/server/auth/session";
import { all } from "@/server/db/client";
import { club as getClub, pipelineRows, scopedTeams } from "@/server/services/club";
import { clubOffers, offerRow, toMatchOffer } from "@/server/services/offers";
import { playerCtx, playerRowsByIds, presentPlayer, toMatchPlayer } from "@/server/services/players";
import { computeMatch } from "@/lib/matching";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { Kanban } from "@/components/club/kanban";
import type { KanbanCard } from "@/components/club/kanban";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const u = await requireClubStaff();
  const club = getClub(u.club_id);
  const rows = pipelineRows(u);
  const ctx = playerCtx();
  const unread = new Set(all<{ player_id: string }>("SELECT DISTINCT c.player_id FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.club_id = ? AND m.sender_side = 'player' AND m.read_by_club_at IS NULL", u.club_id).map((r) => r.player_id));
  const offerCache = new Map<string, ReturnType<typeof toMatchOffer> | null>();
  const players = playerRowsByIds(rows.map((r) => r.player_id));
  const cards: KanbanCard[] = rows.filter((r) => players.has(r.player_id)).map((r) => {
    const pr = players.get(r.player_id)!;
    const p = presentPlayer(pr, ctx);
    let score: number | null = null;
    if (r.offer_id) {
      if (!offerCache.has(r.offer_id)) {
        const o = offerRow(r.offer_id);
        offerCache.set(r.offer_id, o ? toMatchOffer(o) : null);
      }
      const om = offerCache.get(r.offer_id);
      if (om) score = computeMatch(toMatchPlayer(pr, ctx.prev.get(pr.id), ctx.career.get(pr.id) ?? 0), om, ctx.now).score;
    }
    return { id: r.id, playerId: p.id, name: p.name, initials: p.initials, hue: p.hue, position: p.position_label, age: p.age, club: p.club_name, stage: r.stage, team: r.team_name, teamId: r.team_id, offer: r.offer_title, offerId: r.offer_id, score, updated_at: r.updated_at, unread: unread.has(p.id), minor: p.minor };
  });
  const offers = clubOffers(u.club_id).filter((o) => cards.some((c) => c.offerId === o.id)).map((o) => ({ id: o.id, title: o.title }));
  return (
    <div>
      <PageHeader eyebrow={club.name} title="Pipeline de captación" subtitle={can.allTeams(u) ? "Todos los jugadores que sigue el club, por etapas. Los cambios de etapa actualizan el estado que ve el jugador." : "Jugadores que sigue tu equipo. Los de otros equipos del club no se muestran."} actions={<LinkButton href="/club/cercar">Añadir jugadores</LinkButton>} />
      {cards.length === 0 ? (
        <EmptyState icon={<KanbanSquare className="size-5" />} title="No hay candidatos en el pipeline" text="Añade jugadores desde la búsqueda, las oportunidades o ScoutUp Intelligence." action={<LinkButton href="/club/cercar" variant="primary">Explorar jugadores</LinkButton>} />
      ) : (
        <Kanban cards={cards} teams={scopedTeams(u).map((t) => ({ id: t.id, name: t.name }))} offers={offers} />
      )}
    </div>
  );
}

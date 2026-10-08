import Link from "next/link";
import { MessagesSquare, ArrowLeft, Ban, Flag, ShieldCheck } from "lucide-react";
import { requirePlayer } from "@/server/auth/session";
import { conversationsFor, messagesOf, requestsForPlayer } from "@/server/services/messages";
import { conversationFor } from "@/server/services/actions";
import { ClubCrest, EmptyState, cn } from "@/components/ui";
import { Thread } from "@/components/messages/thread";
import { RequestCard } from "@/components/player/request-card";
import { BlockButton } from "@/components/player/block-button";
import { ReportButton } from "@/components/player/report-button";
import { get } from "@/server/db/client";
import { fmtRelative } from "@/lib/time";

export const metadata = { title: "Mensajes" };

export default async function PlayerMessages({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const u = await requirePlayer();
  const { c } = await searchParams;
  const convs = conversationsFor(u);
  const pending = requestsForPlayer(u.player_id).filter((r) => r.status === "pendent");
  let active: { id: string; item: (typeof convs)[number]; club_id: string; status: string } | null = null;
  if (c) {
    try {
      const { conv } = conversationFor(u, c);
      const item = convs.find((x) => x.id === conv.id);
      active = item ? { id: conv.id, item, club_id: conv.club_id, status: conv.status } : null;
    } catch {
      active = null;
    }
  }
  const msgs = active ? messagesOf(active.id) : [];
  const blocked = active ? !!get("SELECT id FROM blocks WHERE player_id = ? AND club_id = ?", u.player_id, active.club_id) : false;

  return (
    <div className="space-y-4">
      {pending.length > 0 && !active && <div className="space-y-3">{pending.map((r) => <RequestCard key={r.id} r={r} />)}</div>}
      <div className="grid h-[calc(100dvh-10rem)] min-h-[480px] overflow-hidden rounded-2xl border border-line bg-surface shadow-card md:grid-cols-[320px_1fr]">
        <div className={cn("flex min-h-0 flex-col border-r border-line", active && "hidden md:flex")}>
          <div className="border-b border-line px-4 py-3.5"><p className="text-[15px] font-bold">Mensajes</p><p className="text-[12px] text-muted">Conversaciones con clubes que has aceptado</p></div>
          <div className="scroll-thin flex-1 overflow-y-auto">
            {convs.length === 0 && <p className="px-4 py-10 text-center text-[13px] text-subtle">Cuando aceptes una solicitud de un club, la conversación aparecerá aquí.</p>}
            {convs.map((x) => (
              <Link key={x.id} href={`/jugador/missatges?c=${x.id}`} className={cn("flex gap-3 border-b border-line px-4 py-3 transition hover:bg-bg", active?.id === x.id && "bg-accent-soft/50")}>
                <ClubCrest initials={x.club_initials} color={x.club_color} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><p className={cn("truncate text-[13.5px]", x.unread ? "font-extrabold" : "font-semibold")}>{x.club_name}</p><span className="shrink-0 text-[11px] text-subtle">{fmtRelative(x.last_message_at)}</span></div>
                  <p className="truncate text-[12px] text-muted">{x.subject}</p>
                  <div className="flex items-center gap-2"><p className={cn("min-w-0 flex-1 truncate text-[12.5px]", x.unread ? "text-ink" : "text-subtle")}>{x.last_side === "player" ? "Tu: " : ""}{x.last_body}</p>{x.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-night">{x.unread}</span>}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className={cn("min-h-0 flex-col", active ? "flex" : "hidden md:flex")}>
          {active ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                <Link href="/jugador/missatges" className="grid size-8 place-items-center rounded-lg hover:bg-sunken md:hidden" aria-label="Volver"><ArrowLeft className="size-4" /></Link>
                <ClubCrest initials={active.item.club_initials} color={active.item.club_color} size={36} />
                <div className="min-w-0 flex-1">
                  <Link href={`/jugador/clubs/${active.club_id}`} className="flex items-center gap-1 truncate text-[14.5px] font-bold hover:underline">{active.item.club_name} <ShieldCheck className="size-4 text-accent-ink" /></Link>
                  <p className="truncate text-[12px] text-muted">{active.item.subject}{active.item.team_name ? ` · ${active.item.team_name}` : ""}</p>
                </div>
                <BlockButton clubId={active.club_id} blocked={blocked} icon={<Ban className="size-3.5" />} />
                <ReportButton targetType="club" targetId={active.club_id} icon={<Flag className="size-3.5" />} />
              </div>
              <div className="min-h-0 flex-1">
                {active.status === "tancada" || blocked ? (
                  <div className="grid h-full place-items-center p-8"><EmptyState title="Conversación cerrada" text={blocked ? "Has bloqueado a este club." : "Esta conversación se ha cerrado."} /></div>
                ) : (
                  <Thread conversationId={active.id} me="player" otherName={active.item.club_name} messages={msgs.map((m) => ({ id: m.id, side: m.sender_side, body: m.body, flagged: !!m.flagged, created_at: m.created_at, sender: m.sender_side === "club" ? `${m.sender_name ?? ""} · ${active!.item.club_name}` : null, read: !!m.read_by_club_at }))} />
                )}
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8"><EmptyState icon={<MessagesSquare className="size-5" />} title="Selecciona una conversación" text="Los clubes solo pueden escribirte si aceptas su solicitud de contacto." /></div>
          )}
        </div>
      </div>
    </div>
  );
}

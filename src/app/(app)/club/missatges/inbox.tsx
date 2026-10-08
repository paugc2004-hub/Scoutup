import Link from "next/link";
import { MessagesSquare, Clock3, UserRound, ArrowLeft } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { conversationsFor, messagesOf, requestsForClub } from "@/server/services/messages";
import { conversationFor } from "@/server/services/actions";
import { Avatar, Badge, EmptyState, cn } from "@/components/ui";
import { Thread, ScheduleCallButton, RequestInfoButton } from "@/components/messages/thread";
import { InteractionForm } from "@/components/club/player-actions";
import { CONTACT_STATUS_LABEL, isMinor } from "@/lib/domain";
import { fmtRelative } from "@/lib/time";

export function ClubInbox({ u, activeId }: { u: SessionUser & { club_id: string }; activeId?: string }) {
  const convs = conversationsFor(u);
  const reqs = requestsForClub(u).filter((r) => r.status !== "acceptada");
  let active = null as null | { conv: ReturnType<typeof conversationFor>["conv"]; item: (typeof convs)[number] };
  if (activeId) {
    try {
      const { conv } = conversationFor(u, activeId);
      const item = convs.find((c) => c.id === conv.id);
      active = item ? { conv, item } : null;
    } catch {
      active = null;
    }
  }
  const msgs = active ? messagesOf(active.conv.id) : [];

  return (
    <div className="grid h-[calc(100dvh-8rem)] min-h-[520px] overflow-hidden rounded-2xl border border-line bg-surface shadow-card md:grid-cols-[320px_1fr]">
      <div className={cn("flex min-h-0 flex-col border-r border-line", active && "hidden md:flex")}>
        <div className="border-b border-line px-4 py-3.5">
          <p className="text-[15px] font-bold">Mensajes</p>
          <p className="text-[12px] text-muted">{convs.length} converses · {reqs.filter((r) => r.status.startsWith("pendent")).length} sol·licituds pendents</p>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto">
          {convs.length === 0 && <p className="px-4 py-10 text-center text-[13px] text-subtle">Todavía no hay conversaciones.</p>}
          {convs.map((c) => (
            <Link key={c.id} href={`/club/missatges/${c.id}`} className={cn("flex gap-3 border-b border-line px-4 py-3 transition hover:bg-bg", active?.conv.id === c.id && "bg-accent-soft/50")}>
              <Avatar initials={c.player_name.split(" ").map((w) => w[0]).slice(0, 2).join("")} hue={c.player_hue} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("truncate text-[13.5px]", c.unread ? "font-extrabold" : "font-semibold")}>{c.player_name}</p>
                  <span className="shrink-0 text-[11px] text-subtle">{fmtRelative(c.last_message_at)}</span>
                </div>
                <p className="truncate text-[12px] text-muted">{c.subject}{c.team_name ? ` · ${c.team_name}` : ""}</p>
                <div className="flex items-center gap-2">
                  <p className={cn("min-w-0 flex-1 truncate text-[12.5px]", c.unread ? "text-ink" : "text-subtle")}>{c.last_side === "club" ? "Tu: " : ""}{c.last_body}</p>
                  {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-night">{c.unread}</span>}
                </div>
              </div>
            </Link>
          ))}
          {reqs.length > 0 && (
            <>
              <p className="px-4 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">Solicitudes enviadas</p>
              {reqs.map((r) => (
                <Link key={r.id} href={`/club/jugadors/${r.player_id}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-bg">
                  <Avatar initials={r.player_name.split(" ").map((w) => w[0]).slice(0, 2).join("")} hue={r.player_hue} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{r.player_name}</p>
                    <p className="truncate text-[11.5px] text-subtle">{fmtRelative(r.created_at)}</p>
                  </div>
                  <Badge tone={r.status === "rebutjada" ? "danger" : r.status === "pendent_tutor" ? "violet" : r.status === "cancel_lada" ? "neutral" : "warn"}><Clock3 className="size-3" />{CONTACT_STATUS_LABEL[r.status]}</Badge>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
      <div className={cn("min-h-0 flex-col", active ? "flex" : "hidden md:flex")}>
        {active ? (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 md:px-5">
              <Link href="/club/missatges" className="grid size-8 place-items-center rounded-lg hover:bg-sunken md:hidden" aria-label="Volver"><ArrowLeft className="size-4" /></Link>
              <Avatar initials={active.item.player_name.split(" ").map((w) => w[0]).slice(0, 2).join("")} hue={active.item.player_hue} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold">{active.item.player_name} {isMinor(active.item.player_birth) && <Badge tone="violet" className="ml-1">Menor · tutor informado</Badge>}</p>
                <p className="truncate text-[12px] text-muted">{active.conv.subject}{active.item.team_name ? ` · ${active.item.team_name}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/club/jugadors/${active.conv.player_id}`} className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-line px-2.5 text-[12.5px] font-semibold hover:bg-sunken"><UserRound className="size-3.5" /> Perfil</Link>
                <RequestInfoButton conversationId={active.conv.id} />
                <ScheduleCallButton conversationId={active.conv.id} playerId={active.conv.player_id} playerName={active.item.player_name.split(" ")[0]} teamId={active.conv.team_id} />
                <InteractionForm playerId={active.conv.player_id} />
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <Thread
                conversationId={active.conv.id}
                me="club"
                minor={isMinor(active.item.player_birth)}
                otherName={active.item.player_name.split(" ")[0]}
                messages={msgs.map((m) => ({ id: m.id, side: m.sender_side, body: m.body, flagged: !!m.flagged, created_at: m.created_at, sender: m.sender_side === "club" ? m.sender_name : active!.item.player_name.split(" ")[0], read: !!m.read_by_player_at }))}
              />
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8">
            <EmptyState icon={<MessagesSquare className="size-5" />} title="Selecciona una conversación" text="Las conversaciones se abren cuando un jugador (o su tutor) acepta la solicitud de contacto del club." />
          </div>
        )}
      </div>
    </div>
  );
}

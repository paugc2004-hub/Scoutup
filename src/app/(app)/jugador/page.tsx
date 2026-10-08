import Link from "next/link";
import { Eye, Heart, Send, MessageSquare, ArrowRight, CalendarClock, Compass, Circle, Sparkles, Route } from "lucide-react";
import { requirePlayer } from "@/server/auth/session";
import { get } from "@/server/db/client";
import { playerCtx, playerRow, presentPlayer } from "@/server/services/players";
import { opportunitiesFor } from "@/server/services/offers";
import { completenessOf } from "@/server/services/player-actions";
import { applicationsOf, clubsInterested, playerEvents } from "@/server/services/player-home";
import { requestsForPlayer } from "@/server/services/messages";
import { Badge, Card, CardHeader, ClubCrest, EmptyState, LinkButton, MatchRing, PageHeader, Stat, AvailabilityBadge, cn } from "@/components/ui";
import { RequestCard } from "@/components/player/request-card";
import { APP_STATUS_LABEL, EVENT_KIND_COLOR, EVENT_KIND_LABEL, POSITION_LABEL } from "@/lib/domain";
import type { EventKind, Position } from "@/lib/domain";
import { fmtDate, fmtRelative, fmtTime, madridAt } from "@/lib/time";

export const metadata = { title: "Inici · Jugador" };

export default async function PlayerHome() {
  const u = await requirePlayer();
  const row = playerRow(u.player_id)!;
  const ctx = playerCtx();
  const me = presentPlayer(row, ctx, { full: true });
  const comp = completenessOf(u.player_id);
  const missing = comp.items.filter((i) => !i.done).sort((a, b) => b.weight - a.weight);
  const opps = opportunitiesFor(row, ctx).filter((o) => !o.application).slice(0, 4);
  const apps = applicationsOf(u.player_id);
  const interested = clubsInterested(u.player_id);
  const views30 = get<{ n: number }>("SELECT COUNT(*) AS n FROM profile_views WHERE player_id = ? AND created_at > ?", u.player_id, new Date(Date.now() - 30 * 86400000).toISOString())?.n ?? 0;
  const unread = get<{ n: number }>("SELECT COUNT(*) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.player_id = ? AND m.sender_side = 'club' AND m.read_by_player_at IS NULL", u.player_id)?.n ?? 0;
  const pending = requestsForPlayer(u.player_id).filter((r) => r.status === "pendent");
  const now = new Date();
  const events = playerEvents(u.player_id, now.toISOString(), madridAt(now, 14, 0).toISOString()).filter((e) => e.kind !== "entrenament").slice(0, 5);
  const active = apps.filter((a) => !["rebutjat", "tancat"].includes(a.status));
  const staleDays = Math.floor((Date.now() - new Date(row.updated_at).getTime()) / 86400000);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${me.position_label} · ${me.club_name}`}
        title={`Hola, ${me.first_name}!`}
        subtitle={<>Tens <strong className="text-ink">{opportunitiesFor(row, ctx).filter((o) => !o.application && o.match.score >= 80).length} oportunitats</strong> per sobre del 80% d'encaix{pending.length ? <> i <strong className="text-ink">{pending.length} {pending.length === 1 ? "club vol" : "clubs volen"} parlar amb tu</strong></> : null}.</>}
        actions={<><AvailabilityBadge value={me.availability} /><LinkButton href="/jugador/oportunitats" variant="primary" icon={<Compass className="size-4" />}>Veure oportunitats</LinkButton></>}
      />

      {pending.length > 0 && <div className="space-y-3">{pending.map((r) => <RequestCard key={r.id} r={r} />)}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="relative overflow-hidden">
          <div className="flex items-center gap-5">
            <MatchRing score={comp.score} size={96} stroke={9} />
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">El teu perfil</p>
              <p className="text-[22px] font-extrabold tracking-tight">Perfil {comp.score}% complet</p>
              <p className="text-[13px] text-muted">{missing.length ? `Et falten ${missing.length} ${missing.length === 1 ? "detall" : "detalls"} per arribar al 100%.` : "Perfil complet. Genial!"}</p>
            </div>
          </div>
          {missing.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {missing.slice(0, 4).map((m) => (
                <Link key={m.key} href={`/jugador/perfil/editar?pas=${m.step}`} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] transition hover:bg-bg">
                  <Circle className="size-4 text-line-strong" />
                  <span className="flex-1">{m.label}</span>
                  <span className="font-bold text-accent-ink">+{m.weight}%</span>
                </Link>
              ))}
            </div>
          )}
          {staleDays > 45 && <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[12.5px] text-ink-2">El teu perfil porta {Math.floor(staleDays / 30)} {Math.floor(staleDays / 30) === 1 ? "mes" : "mesos"} sense actualitzar-se. Els perfils actualitzats reben més visites.</p>}
          <LinkButton href="/jugador/perfil/editar" variant="dark" size="sm" className="mt-4">Completar el perfil</LinkButton>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Visites al perfil" value={views30} hint="Últims 30 dies" icon={<Eye className="size-4" />} tone="info" href="/jugador/seguiment" />
          <Stat label="Clubs interessats" value={interested.filter((i) => i.following || i.saved).length} hint={`${interested.length} clubs t'han vist`} icon={<Heart className="size-4" />} tone="violet" href="/jugador/seguiment" />
          <Stat label="Sol·licituds actives" value={active.length} hint={`${apps.length} en total`} icon={<Send className="size-4" />} tone="accent" href="/jugador/seguiment" />
          <Stat label="Missatges nous" value={unread + pending.length} hint={pending.length ? `${pending.length} sol·licituds de contacte` : "Converses amb clubs"} icon={<MessageSquare className="size-4" />} href="/jugador/missatges" />
        </div>
      </div>

      <Card>
        <CardHeader title="Oportunitats per a tu" subtitle="Ordenades pel teu percentatge d'encaix" icon={<Sparkles className="size-4 text-accent-ink" />} action={<LinkButton href="/jugador/oportunitats" size="sm" variant="ghost">Totes <ArrowRight className="size-3.5" /></LinkButton>} />
        {opps.length === 0 ? <EmptyState title="No hi ha oportunitats noves ara mateix" /> : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {opps.map(({ offer: o, match: m }) => (
              <Link key={o.id} href={`/jugador/oportunitats/${o.id}`} className="group flex flex-col rounded-2xl border border-line p-4 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop">
                <div className="flex items-start justify-between gap-2">
                  <ClubCrest initials={o.club_initials} color={o.club_color} size={36} />
                  <MatchRing score={m.score} size={48} stroke={5} />
                </div>
                <p className="mt-3 text-[14.5px] font-bold leading-snug group-hover:underline">{o.title}</p>
                <p className="mt-0.5 text-[12.5px] text-muted">{o.club_name} · {o.team_name}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge>{POSITION_LABEL[o.position as Position]}</Badge>
                  {o.kind === "prova" && <Badge tone="violet">Prova</Badge>}
                  <Badge>{Math.round(m.distanceKm)} km</Badge>
                </div>
                <span className="mt-auto pt-4 text-[12.5px] font-bold text-accent-ink">M'interessa →</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Clubs interessats en tu" subtitle="Últims 30 dies" icon={<Heart className="size-4" />} />
          {interested.length === 0 ? <p className="text-[13px] text-subtle">Encara cap club ha mostrat interès.</p> : (
            <div className="space-y-1">
              {interested.slice(0, 6).map((c) => (
                <Link key={c.club_id} href={`/jugador/clubs/${c.club_id}`} className="flex items-center gap-3 rounded-xl px-1.5 py-1.5 transition hover:bg-bg">
                  <ClubCrest initials={c.initials} color={c.color} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{c.club_name}</p>
                    <p className="truncate text-[12px] text-muted">{c.following ? "T'està seguint" : c.saved ? "T'ha desat com a favorit" : `Ha vist el teu perfil${c.views > 1 ? ` ${c.views} vegades` : ""}`} · {fmtRelative(c.since)}</p>
                  </div>
                  {c.following && <Badge tone="accent">Interès</Badge>}
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Els teus processos" icon={<Route className="size-4" />} action={<LinkButton href="/jugador/seguiment" size="sm" variant="ghost">Seguiment <ArrowRight className="size-3.5" /></LinkButton>} />
          {apps.length === 0 ? <p className="text-[13px] text-subtle">Encara no t'has inscrit a cap oportunitat.</p> : (
            <div className="space-y-2">
              {apps.slice(0, 4).map((a) => (
                <Link key={a.id} href={`/jugador/oportunitats/${a.offer_id}`} className="flex items-center gap-3 rounded-xl border border-line p-2.5 transition hover:border-line-strong">
                  <ClubCrest initials={a.initials} color={a.color} size={30} />
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{a.title}</p><p className="truncate text-[11.5px] text-muted">{a.club_name}</p></div>
                  <Badge tone={a.status === "prova" ? "violet" : a.status === "rebutjat" ? "danger" : a.status === "enviada" ? "neutral" : "accent"}>{APP_STATUS_LABEL[a.status]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Agenda" subtitle="Pròxims 14 dies" icon={<CalendarClock className="size-4" />} action={<LinkButton href="/jugador/calendari" size="sm" variant="ghost">Calendari <ArrowRight className="size-3.5" /></LinkButton>} />
          {events.length === 0 ? <p className="text-[13px] text-subtle">Sense esdeveniments.</p> : (
            <div className="space-y-2">
              {events.map((e) => (
                <div key={e.id} className={cn("flex items-center gap-3 rounded-xl p-2", e.kind === "prova" && "bg-accent-soft/60")}>
                  <div className="w-11 shrink-0 text-center"><p className="text-[10.5px] font-bold uppercase text-subtle">{fmtDate(e.starts_at, { short: true }).split(" ")[1]}</p><p className="text-[17px] font-extrabold leading-none tabular">{fmtDate(e.starts_at, { short: true }).split(" ")[0]}</p></div>
                  <span className="h-8 w-1 rounded-full" style={{ background: EVENT_KIND_COLOR[e.kind as EventKind] }} />
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{e.title}</p><p className="truncate text-[11.5px] text-muted">{EVENT_KIND_LABEL[e.kind as EventKind]} · {fmtTime(e.starts_at)}</p></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

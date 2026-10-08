import Link from "next/link";
import { ArrowRight, Plus, Sparkles, Target, Activity, CalendarClock, Inbox, MessagesSquare, ShieldAlert, FlaskConical, KanbanSquare, CircleAlert, CheckCircle2 } from "lucide-react";
import { can, teamFilterSql } from "@/server/services/access";
import { requireClubStaff } from "@/server/auth/session";
import { all, get } from "@/server/db/client";
import { club as getClub, clubEvents, pipelineRows, recentActivity, teamNeeds } from "@/server/services/club";
import type { Need } from "@/server/services/club";
import { clubOffers, rankCandidates, toMatchOffer } from "@/server/services/offers";
import type { Candidate, OfferRow } from "@/server/services/offers";
import { playerCtx } from "@/server/services/players";
import { onboardingStatus } from "@/server/services/onboarding";
import { Avatar, Badge, Card, CardHeader, EmptyState, LinkButton, MatchRing, Dot, StageBadge, cn } from "@/components/ui";
import { IntelligenceBox } from "@/components/client/intelligence-box";
import { EVENT_KIND_COLOR, EVENT_KIND_LABEL, PIPELINE_STAGES, POSITION_LABEL, STAGE_COLOR, STAGE_LABEL } from "@/lib/domain";
import type { EventKind, Position } from "@/lib/domain";
import { fmtDate, fmtRelative, fmtTime, madridAt } from "@/lib/time";

export const metadata = { title: "Inicio · Club" };

/** Umbral a partir del cual un jugador cuenta como «compatible» con una oportunidad. */
const COMPATIBLE = 70;

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(new Date()));
  return h >= 6 && h < 14 ? "Buenos días" : h >= 14 && h < 21 ? "Buenas tardes" : "Buenas noches";
}

type NeedRow = Need & { offer: OfferRow | null; compatibles: Candidate[] };

export default async function ClubHome() {
  const u = await requireClubStaff();
  const club = getClub(u.club_id);
  const now = new Date();
  const ctx = playerCtx();

  const offers = clubOffers(u.club_id).filter((o) => o.status === "oberta" && can.seeTeam(u, o.team_id));
  // compatibles por oportunidad abierta (una sola pasada por oportunidad)
  const ranked = new Map(offers.map((o) => [o.id, rankCandidates(toMatchOffer(o), club, { ctx, minScore: COMPATIBLE, offerId: o.id })]));

  // Necesidades de la plantilla conectadas con su oportunidad (si existe)
  const needs: NeedRow[] = teamNeeds(u)
    .map((n) => {
      const offer = offers.find((o) => o.team_id === n.team_id && o.position === n.position) ?? null;
      return { ...n, offer, compatibles: offer ? ranked.get(offer.id) ?? [] : [] };
    })
    .sort((a, b) => (a.priority === "alta" ? 0 : 1) - (b.priority === "alta" ? 0 : 1) || b.compatibles.length - a.compatibles.length);
  // destacada: la necesidad prioritaria cuya oportunidad se publicó más recientemente
  const withOffer = needs.filter((n) => n.offer && n.compatibles.length > 0).sort((a, b) => (a.priority === "alta" ? 0 : 1) - (b.priority === "alta" ? 0 : 1) || b.offer!.created_at.localeCompare(a.offer!.created_at));
  const featured = withOffer[0] ?? null;

  const of = teamFilterSql(u, "o.team_id");
  const newApps = all<{ id: string; created_at: string; match_score: number; offer_id: string; offer_title: string; player_id: string; first_name: string; last_name: string; avatar_hue: number; primary_position: string }>(
    `SELECT a.id, a.created_at, a.match_score, a.offer_id, o.title AS offer_title, p.id AS player_id, p.first_name, p.last_name, p.avatar_hue, p.primary_position
     FROM applications a JOIN offers o ON o.id = a.offer_id JOIN players p ON p.id = a.player_id WHERE o.club_id = ? AND a.status = 'enviada' AND ${of.sql} ORDER BY a.created_at DESC`,
    u.club_id, ...of.params,
  );
  const cf = teamFilterSql(u, "c.team_id");
  const unreadConv = get<{ n: number }>(`SELECT COUNT(DISTINCT m.conversation_id) AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.club_id = ? AND m.sender_side = 'player' AND m.read_by_club_at IS NULL AND ${cf.sql}`, u.club_id, ...cf.params)?.n ?? 0;
  const rf = teamFilterSql(u, "r.team_id", true);
  const pendingTutor = get<{ n: number }>(`SELECT COUNT(*) AS n FROM contact_requests r WHERE r.club_id = ? AND r.status = 'pendent_tutor' AND ${rf.sql}`, u.club_id, ...rf.params)?.n ?? 0;
  const pipe = pipelineRows(u);
  const events = clubEvents(u, now.toISOString(), madridAt(now, 14, 0).toISOString());
  const weekEnd = madridAt(now, 7, 0).toISOString();
  const trialsWeek = events.filter((e) => e.kind === "prova" && e.starts_at < weekEnd);
  const activity = recentActivity(u, 8);

  // nuevos perfiles: los mejores candidatos de cada oportunidad que todavía no están en el pipeline
  const seen = new Set<string>(featured?.compatibles.slice(0, 3).map((c) => c.player.id) ?? []);
  const suggestions = offers
    .flatMap((o) => (ranked.get(o.id) ?? []).filter((c) => !c.stage && c.match.score >= 80 && !seen.has(c.player.id)).slice(0, 2).map((c) => ({ ...c, offer: o })))
    .filter((s) => (seen.has(s.player.id) ? false : (seen.add(s.player.id), true)))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 5);

  const todo = [
    newApps.length > 0 && { icon: <Inbox className="size-4" />, tone: "accent", text: <><strong>{newApps.length}</strong> {newApps.length === 1 ? "solicitud nueva" : "solicitudes nuevas"} por revisar</>, href: `/club/oportunitats/${newApps[0].offer_id}?tab=sollicituds`, cta: "Revisar" },
    unreadConv > 0 && { icon: <MessagesSquare className="size-4" />, tone: "info", text: <><strong>{unreadConv}</strong> {unreadConv === 1 ? "conversación" : "conversaciones"} con mensajes sin leer</>, href: "/club/missatges", cta: "Responder" },
    trialsWeek.length > 0 && { icon: <FlaskConical className="size-4" />, tone: "violet", text: <><strong>{trialsWeek.length}</strong> {trialsWeek.length === 1 ? "prueba" : "pruebas"} esta semana · la próxima {fmtRelative(trialsWeek[0].starts_at)}</>, href: "/club/calendari", cta: "Ver agenda" },
    pendingTutor > 0 && { icon: <ShieldAlert className="size-4" />, tone: "warn", text: <><strong>{pendingTutor}</strong> {pendingTutor === 1 ? "contacto pendiente" : "contactos pendientes"} de la autorización del tutor</>, href: "/club/pipeline", cta: "Ver" },
    needs.some((n) => !n.offer) && can.manageOffers(u) && { icon: <CircleAlert className="size-4" />, tone: "danger", text: <><strong>{needs.filter((n) => !n.offer).length}</strong> {needs.filter((n) => !n.offer).length === 1 ? "necesidad sin oportunidad" : "necesidades sin oportunidad"} publicada</>, href: "/club/oportunitats/nova", cta: "Crear" },
  ].filter(Boolean) as { icon: React.ReactNode; tone: string; text: React.ReactNode; href: string; cta: string }[];
  const TODO_TONE: Record<string, string> = { accent: "bg-accent-soft text-accent-ink", info: "bg-info-soft text-info", violet: "bg-violet-soft text-violet", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger" };

  const firstName = u.name.split(" ")[0];
  const best = featured?.compatibles[0];

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between animate-rise">
        <div>
          <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent-ink">{can.allTeams(u) ? club.name : `${club.name} · ${u.title}`}</p>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] md:text-[32px]">{greeting()}, {firstName}</h1>
          <p className="mt-1 text-[14px] text-muted">Hoy es {fmtDate(now, { weekday: true })}. {todo.length ? `Tienes ${todo.length} ${todo.length === 1 ? "cosa pendiente" : "cosas pendientes"}.` : "Estás al día."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/club/intelligence" icon={<Sparkles className="size-4" />}>Buscar con IA</LinkButton>
          {can.manageOffers(u) && <LinkButton href="/club/oportunitats/nova" variant="primary" icon={<Plus className="size-4" />}>Nueva oportunidad</LinkButton>}
        </div>
      </div>

      {!onboardingStatus(u.club_id).done && can.editClub(u) && (
        <Link href="/club/bienvenida" className="flex items-center gap-4 rounded-3xl border border-accent-soft-2 bg-accent-soft p-5 transition hover:border-accent">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-night"><Sparkles className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-extrabold">Configura tu club en 3 pasos</p>
            <p className="text-[13px] text-ink-2">Equipos → primera necesidad → primeros jugadores compatibles.</p>
          </div>
          <ArrowRight className="size-5 text-accent-ink" />
        </Link>
      )}

      {/* Necesidad destacada → oportunidad → compatibles → mejor encaje */}
      {featured && featured.offer && best ? (
        <section aria-label="Necesidad prioritaria" className="relative overflow-hidden rounded-3xl bg-night p-6 text-white shadow-pop md:p-7 animate-rise">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/20 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wider text-[#ff8a8a]"><CircleAlert className="size-3.5" /> Necesidad prioritaria</span>
                <span className="text-[12.5px] text-night-muted">{featured.team_name}</span>
              </div>
              <h2 className="mt-3 text-[26px] font-extrabold leading-tight tracking-tight md:text-[30px]">
                El {featured.team_name} necesita un {POSITION_LABEL[featured.position as Position].toLowerCase()}
              </h2>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-night-text">{featured.text}</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
                <div>
                  <p className="text-[40px] font-extrabold leading-none tabular text-accent">{featured.compatibles.length}</p>
                  <p className="mt-1 text-[12.5px] text-night-muted">jugadores compatibles (≥{COMPATIBLE}%)</p>
                </div>
                <div className="flex -space-x-2">
                  {featured.compatibles.slice(0, 5).map((c) => <span key={c.player.id} className="rounded-full ring-2 ring-night"><Avatar initials={c.player.initials} hue={c.player.hue} size={36} /></span>)}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href={`/club/oportunitats/${featured.offer.id}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-bold text-night transition hover:bg-accent-600">Ver los {featured.compatibles.length} compatibles <ArrowRight className="size-4" /></Link>
              </div>
            </div>
            <Link href={`/club/jugadors/${best.player.id}?offer=${featured.offer.id}`} className="group block rounded-2xl border border-night-line bg-night-2 p-5 transition hover:border-accent/60">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-night-muted">Mejor encaje</p>
              <div className="mt-3 flex items-center gap-4">
                <Avatar initials={best.player.initials} hue={best.player.hue} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-extrabold group-hover:underline">{best.player.name}</p>
                  <p className="truncate text-[13px] text-night-text">{best.player.position_label} · {best.player.age} años · {best.player.club_name}</p>
                </div>
                <div className="rounded-full bg-white p-1"><MatchRing score={best.match.score} size={60} stroke={5} /></div>
              </div>
              <ul className="mt-4 space-y-1.5 text-[12.5px] text-night-text">
                {best.match.factors.filter((f) => f.status === "ok").slice(0, 3).map((f) => (
                  <li key={f.key} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" /><span className="truncate">{f.detail}</span></li>
                ))}
              </ul>
              <p className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-accent">¿Por qué encaja? <ArrowRight className="size-3.5" /></p>
            </Link>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        {/* Para hoy */}
        <Card>
          <CardHeader title="Para hoy" subtitle="Lo que necesita tu atención, por orden de prioridad." icon={<Target className="size-4" />} />
          {todo.length === 0 ? (
            <EmptyState title="Estás al día" text="No hay solicitudes, mensajes ni pruebas pendientes." />
          ) : (
            <ul className="space-y-2">
              {todo.map((t, i) => (
                <li key={i}>
                  <Link href={t.href} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:border-line-strong hover:bg-bg">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", TODO_TONE[t.tone])}>{t.icon}</span>
                    <span className="min-w-0 flex-1 text-[13.5px] text-ink-2">{t.text}</span>
                    <span className="shrink-0 text-[12.5px] font-semibold text-accent-ink">{t.cta} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Necesidades */}
        <Card>
          <CardHeader title="Necesidades de la plantilla" subtitle="Cada necesidad, su oportunidad y los compatibles que ScoutUp ha encontrado." icon={<CircleAlert className="size-4" />} action={<LinkButton href="/club/plantilla" size="sm" variant="ghost">Plantilla <ArrowRight className="size-3.5" /></LinkButton>} />
          {needs.length === 0 ? (
            <EmptyState title="Sin necesidades definidas" text="Define las necesidades desde la plantilla de cada equipo." />
          ) : (
            <ul className="space-y-2">
              {needs.map((n, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-extrabold", n.priority === "alta" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn")}>{n.position}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{n.team_name} · {POSITION_LABEL[n.position as Position]}</p>
                    <p className="truncate text-[12px] text-muted">{n.offer ? <>{n.compatibles.length} compatibles · «{n.offer.title}»</> : "Sin oportunidad publicada"}</p>
                  </div>
                  {n.offer ? (
                    <Link href={`/club/oportunitats/${n.offer.id}`} className="shrink-0 text-[12.5px] font-semibold text-accent-ink hover:underline">Ver</Link>
                  ) : can.manageOffers(u) ? (
                    <Link href="/club/oportunitats/nova" className="shrink-0 text-[12.5px] font-semibold text-accent-ink hover:underline">Crear oportunidad</Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="Nuevos perfiles compatibles" subtitle="Superan el 80 % en alguna oportunidad y todavía no están en tu pipeline." icon={<Sparkles className="size-4 text-accent-ink" />} />
          {suggestions.length === 0 ? (
            <EmptyState title="Ningún perfil nuevo por encima del 80 %" text="Cuando un jugador actualice su perfil y encaje con una oportunidad, aparecerá aquí." action={<LinkButton href="/club/cercar" size="sm">Explorar jugadores</LinkButton>} />
          ) : (
            <div className="-mx-2 space-y-1">
              {suggestions.map((s) => (
                <Link key={s.player.id} href={`/club/jugadors/${s.player.id}?offer=${s.offer.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-bg">
                  <Avatar initials={s.player.initials} hue={s.player.hue} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold">{s.player.name}</p>
                    <p className="truncate text-[12px] text-muted">{s.player.position_label} · {s.player.age} años · {s.player.club_name}</p>
                    <p className="truncate text-[11.5px] text-subtle">para «{s.offer.title}»</p>
                  </div>
                  <MatchRing score={s.match.score} size={42} stroke={4} />
                </Link>
              ))}
            </div>
          )}
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">Copiloto de búsqueda (IA demo)</p>
            <IntelligenceBox compact />
          </div>
        </Card>

        <Card>
          <CardHeader title="Pipeline" subtitle={`${pipe.length} jugadores en seguimiento`} action={<LinkButton href="/club/pipeline" size="sm" variant="ghost">Abrir <ArrowRight className="size-3.5" /></LinkButton>} icon={<KanbanSquare className="size-4" />} />
          {pipe.length === 0 ? (
            <EmptyState title="No hay candidatos en el pipeline" text="Añade jugadores desde una oportunidad o desde la búsqueda." action={<LinkButton href="/club/cercar" size="sm">Explorar jugadores</LinkButton>} />
          ) : (
            <div className="space-y-2">
              {PIPELINE_STAGES.map((s) => {
                const n = pipe.filter((p) => p.stage === s).length;
                const max = Math.max(1, ...PIPELINE_STAGES.map((x) => pipe.filter((p) => p.stage === x).length));
                return (
                  <Link key={s} href="/club/pipeline" className="grid grid-cols-[110px_1fr_24px] items-center gap-3 rounded-md text-[12.5px] hover:bg-bg">
                    <span className="flex items-center gap-1.5 font-medium text-ink-2"><Dot color={STAGE_COLOR[s]} />{STAGE_LABEL[s]}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-sunken"><div className="bar-anim h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: STAGE_COLOR[s] }} /></div>
                    <span className="text-right font-bold tabular">{n}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Actividad reciente" subtitle="Lo último que ha hecho tu equipo" icon={<Activity className="size-4" />} />
          {activity.length === 0 ? (
            <EmptyState title="Sin actividad todavía" text="Guardar, evaluar o contactar jugadores aparecerá aquí." />
          ) : (
            <ol className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: a.to_stage ? STAGE_COLOR[a.to_stage as keyof typeof STAGE_COLOR] : "#8a8f9c" }} aria-hidden />
                  <div className="min-w-0 flex-1 text-[13px]">
                    <p className="leading-snug"><Link href={`/club/jugadors/${a.player_id}`} className="font-semibold hover:underline">{a.player_name}</Link> <span className="text-muted">· {a.text}</span></p>
                    <p className="mt-0.5 text-[11.5px] text-subtle">{a.user_name ?? "Sistema"} · {fmtRelative(a.created_at)}</p>
                  </div>
                  {a.to_stage && <StageBadge stage={a.to_stage as never} />}
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card>
          <CardHeader title="Agenda" subtitle="Próximos 14 días" action={<LinkButton href="/club/calendari" size="sm" variant="ghost">Calendario <ArrowRight className="size-3.5" /></LinkButton>} icon={<CalendarClock className="size-4" />} />
          {events.filter((e) => e.kind !== "entrenament").length === 0 ? (
            <EmptyState title="Sin eventos" />
          ) : (
            <div className="space-y-1.5">
              {events.filter((e) => e.kind !== "entrenament").slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-[11px] font-bold uppercase text-subtle">{fmtDate(e.starts_at, { short: true }).split(" ")[1]}</p>
                    <p className="text-[18px] font-extrabold leading-none tabular">{fmtDate(e.starts_at, { short: true }).split(" ")[0]}</p>
                  </div>
                  <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: EVENT_KIND_COLOR[e.kind as EventKind] }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{e.title}</p>
                    <p className="truncate text-[12px] text-muted">{EVENT_KIND_LABEL[e.kind as EventKind]} · {fmtTime(e.starts_at)}{e.location ? ` · ${e.location}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {newApps.length > 0 && (
        <Card>
          <CardHeader title="Solicitudes nuevas" subtitle="Jugadores que se han inscrito a tus oportunidades." icon={<Inbox className="size-4" />} action={<LinkButton href="/club/oportunitats" size="sm" variant="ghost">Todas <ArrowRight className="size-3.5" /></LinkButton>} />
          <div className="grid gap-2 md:grid-cols-2">
            {newApps.slice(0, 6).map((a) => (
              <Link key={a.id} href={`/club/jugadors/${a.player_id}?offer=${a.offer_id}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:border-line-strong hover:bg-bg">
                <Avatar initials={(a.first_name[0] + a.last_name[0]).toUpperCase()} hue={a.avatar_hue} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{a.first_name} {a.last_name} <span className="font-normal text-muted">· {POSITION_LABEL[a.primary_position as Position]}</span></p>
                  <p className="truncate text-[12px] text-muted">{a.offer_title} · {fmtRelative(a.created_at)}</p>
                </div>
                <Badge tone="accent">Nueva</Badge>
                <MatchRing score={a.match_score} size={38} stroke={4} />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

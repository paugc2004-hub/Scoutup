import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Footprints, Ruler, CalendarDays, Languages, Sparkles, Lock, Trophy, Binoculars, History, ShieldAlert, Info, Check, Circle, UserRound, BarChart3, Target, Compass } from "lucide-react";
import { can, clubCanContact, clubCanSee, clubRelations, teamScope } from "@/server/services/access";
import { requireClubStaff } from "@/server/auth/session";
import { all, get } from "@/server/db/client";
import { club as getClub, recentActivity, scopedTeams } from "@/server/services/club";
import { clubOffers, toMatchOffer } from "@/server/services/offers";
import { currentSeason, playerCtx, playerRow, presentPlayer, privacyOf, toMatchPlayer } from "@/server/services/players";
import { playerDetail } from "@/server/services/player-detail";
import { recordProfileView } from "@/server/services/actions";
import { profileSummary } from "@/server/services/intelligence";
import { competitionProvider } from "@/server/competition/provider";
import { computeMatch } from "@/lib/matching";
import { FOOT_LABEL, CONTRACT_LABEL, POSITION_LABEL, EVAL_AREAS, EVAL_DECISIONS, SCOUT_RECOMMENDATION, APP_STATUS_LABEL } from "@/lib/domain";
import type { AppStatus, Stage } from "@/lib/domain";
import { fmtDate, fmtRelative } from "@/lib/time";
import { Avatar, AvailabilityBadge, Badge, Card, CardHeader, ClubCrest, EmptyState, MinorBadge, Radar, VerificationBadge, StageBadge, cn } from "@/components/ui";
import { MatchBreakdown } from "@/components/match-breakdown";
import { StatsTable, CareerList, VideoGrid, Achievements, AttrBars, PositionPitch } from "@/components/player-sections";
import { ClientTabs, ContactControl, EvaluationForm, FavoriteButton, InteractionForm, NotesPanel, OfferSelector, PipelineControl } from "@/components/club/player-actions";
import type { ContactState } from "@/components/club/player-actions";
import { CompareToggle } from "@/components/club/compare-tray";

export const metadata = { title: "Perfil del jugador" };

export default async function ClubPlayerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ offer?: string; tab?: string }> }) {
  const u = await requireClubStaff();
  const { id } = await params;
  const sp = await searchParams;
  const row = playerRow(id);
  if (!row) notFound();
  const club = getClub(u.club_id);
  const rel = clubRelations(u.club_id);
  const vis = clubCanSee(row, club, rel);
  if (!vis.visible) {
    return (
      <div className="mx-auto max-w-xl pt-10">
        <EmptyState icon={<Lock className="size-5" />} title="Perfil no disponible" text={`Este perfil no es visible para tu club. ${vis.reason ?? ""}`} action={<Link href="/club/cercar" className="text-[13px] font-semibold text-accent-ink hover:underline">Volver a la búsqueda</Link>} />
      </div>
    );
  }
  recordProfileView(u, id);

  const ctx = playerCtx();
  const p = presentPlayer(row, ctx, { ownClub: row.club_id === u.club_id });
  const priv = privacyOf(row);
  const mp = toMatchPlayer(row, ctx.prev.get(row.id), ctx.career.get(row.id) ?? 0);
  const offers = clubOffers(u.club_id).filter((o) => o.status === "oberta" && o.gender === row.gender && can.seeTeam(u, o.team_id));
  const scored = offers.map((o) => ({ o, m: computeMatch(mp, toMatchOffer(o), ctx.now) })).sort((a, b) => b.m.score - a.m.score);
  const sel = scored.find((s) => s.o.id === sp.offer) ?? scored[0] ?? null;
  const detail = playerDetail(id);
  const teams = scopedTeams(u).map((t) => ({ id: t.id, name: t.name }));

  const entry = get<{ id: string; stage: Stage; team_id: string | null; team_name: string | null; offer_title: string | null; created_at: string }>(
    "SELECT pe.id, pe.stage, pe.team_id, t.name AS team_name, o.title AS offer_title, pe.created_at FROM pipeline_entries pe LEFT JOIN teams t ON t.id = pe.team_id LEFT JOIN offers o ON o.id = pe.offer_id WHERE pe.club_id = ? AND pe.player_id = ?",
    u.club_id, id,
  );
  const entryOutOfScope = entry && !can.seeTeam(u, entry.team_id);
  const apps = all<{ id: string; status: AppStatus; created_at: string; message: string | null; title: string; offer_id: string }>("SELECT a.id, a.status, a.created_at, a.message, o.title, o.id AS offer_id FROM applications a JOIN offers o ON o.id = a.offer_id WHERE o.club_id = ? AND a.player_id = ? ORDER BY a.created_at DESC", u.club_id, id);
  const conv = get<{ id: string }>("SELECT id FROM conversations WHERE club_id = ? AND player_id = ?", u.club_id, id);
  const pendingReq = get<{ id: string; status: string; created_at: string }>("SELECT id, status, created_at FROM contact_requests WHERE club_id = ? AND player_id = ? AND status IN ('pendent','pendent_tutor') ORDER BY created_at DESC", u.club_id, id);
  let contact: ContactState;
  if (conv) contact = { kind: "conversation", conversationId: conv.id };
  else if (pendingReq) contact = { kind: "pending", requestId: pendingReq.id, status: pendingReq.status, created_at: pendingReq.created_at, minor: p.minor };
  else {
    const chk = clubCanContact(row, club, rel);
    contact = chk.ok ? { kind: "can", needsGuardian: chk.needsGuardian } : { kind: "blocked", reason: chk.reason ?? "" };
  }
  const isFav = !!get("SELECT id FROM favorites WHERE user_id = ? AND target_type = 'player' AND target_id = ?", u.id, id);

  const scope = teamScope(u);
  const scopeSql = scope === null ? "1=1" : `(x.team_id IN (${scope.map(() => "?").join(",") || "''"}) OR x.author_user_id = ?)`;
  const scopeParams = scope === null ? [] : [...scope, u.id];
  const evals = all<{ id: string; author_user_id: string; author_name: string; author_title: string | null; scores: string; decision: string; comment: string | null; context: string | null; updated_at: string }>(
    `SELECT x.*, us.name AS author_name, us.title AS author_title FROM evaluations x JOIN users us ON us.id = x.author_user_id WHERE x.club_id = ? AND x.player_id = ? AND ${scopeSql} ORDER BY x.updated_at DESC`, u.club_id, id, ...scopeParams,
  );
  const myEval = evals.find((e) => e.author_user_id === u.id);
  const notes = all<{ id: string; body: string; created_at: string; author_name: string; author_user_id: string }>(
    `SELECT x.id, x.body, x.created_at, x.author_user_id, us.name AS author_name FROM notes x JOIN users us ON us.id = x.author_user_id WHERE x.club_id = ? AND x.player_id = ? AND ${scopeSql} ORDER BY x.created_at DESC`, u.club_id, id, ...scopeParams,
  );
  const reports = all<{ id: string; match_title: string; match_date: string; rating: number; observations: string; recommendation: string; author_name: string }>(
    `SELECT x.*, us.name AS author_name FROM scout_reports x JOIN users us ON us.id = x.author_user_id WHERE x.club_id = ? AND x.player_id = ? AND ${scopeSql} ORDER BY x.match_date DESC`, u.club_id, id, ...scopeParams,
  );
  const activity = recentActivity(u, 30, id);

  // Contexto competitivo (proveedor de demostración)
  const provider = competitionProvider();
  void provider.label;
  const season = currentSeason();
  const comp = row.team_id ? provider.competitionForTeam(row.team_id, season.id) : null;
  const standings = comp ? provider.standings(comp.id) : [];
  const myRow = standings.find((s) => s.team_id === row.team_id);

  const videosHidden = !(priv.videos === "tots" || (priv.videos === "verificats" && club.verified) || rel.contacted.has(id) || rel.applied.has(id) || row.club_id === u.club_id);
  const avgEval = (sc: string) => {
    const o = JSON.parse(sc) as Record<string, Record<string, number>>;
    const v = Object.values(o).flatMap((x) => Object.values(x));
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
  };

  // Próximo paso recomendado (el proceso del club: guardar → pipeline → evaluar → contactar)
  const steps = [
    { key: "guardar", label: "Guardado", done: isFav || !!entry },
    { key: "pipeline", label: "En el pipeline", done: !!entry },
    { key: "evaluar", label: "Evaluado por ti", done: !!myEval },
    { key: "contactar", label: "Contactado", done: contact.kind === "conversation" || contact.kind === "pending" },
  ];
  const next = !isFav && !entry
    ? { title: "Guárdalo para no perderlo de vista", text: "Con «Guardar» queda en tu lista; con «Añadir al pipeline» el cuerpo técnico lo sigue contigo." }
    : !entry
      ? { title: "Añádelo al pipeline", text: "Así el proceso queda organizado por etapas y compartido con tu equipo." }
      : !myEval
        ? { title: "Deja tu evaluación", text: "Puntúa por áreas e indica el contexto. Es privada del club." }
        : contact.kind === "can"
          ? { title: "Contáctalo de forma segura", text: p.minor ? "Es menor: la solicitud irá primero a su tutor legal." : "La solicitud llega al jugador; si la acepta, se abre la conversación." }
          : contact.kind === "pending"
            ? { title: "Esperando respuesta", text: contact.status === "pendent_tutor" ? "La solicitud está pendiente del tutor legal." : "La solicitud está pendiente del jugador." }
            : contact.kind === "conversation"
              ? { title: "Continúa la conversación", text: "Programa una llamada o una prueba desde la conversación." }
              : { title: "Contacto no disponible", text: contact.reason };

  const prevTxt = p.prev ? `${p.prev.matches} partidos · ${p.prev.starts} de titular · ${p.prev.minutes.toLocaleString("es-ES")} min` : p.stats_hidden ? "Estadísticas ocultas por el jugador" : "Sin estadísticas de la temporada pasada";

  return (
    <div className="space-y-5">
      <Link href={sel ? `/club/oportunitats/${sel.o.id}` : "/club/cercar"} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {sel ? `Volver a «${sel.o.title}»` : "Volver a la búsqueda"}
      </Link>

      {/* Cabecera: quién es + acciones */}
      <Card pad={false} className="overflow-hidden animate-rise">
        <div className="h-20" style={{ background: `linear-gradient(110deg, #0b0d13 0%, #0b0d13 55%, ${row.club_color ?? "#0f5132"} 140%)` }} />
        <div className="flex flex-col gap-5 px-5 pb-5 lg:flex-row lg:items-end lg:px-6">
          <div className="-mt-10 flex items-end gap-4">
            <div className="rounded-full bg-surface p-1 shadow-card"><Avatar initials={p.initials} hue={p.hue} size={88} /></div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-extrabold tracking-tight">{p.name}</h1>
              <VerificationBadge status={p.verification} />
              {p.minor && <MinorBadge />}
            </div>
            <p className="mt-0.5 text-[14px] text-muted">
              <span className="font-semibold text-ink">{p.position_label}</span>
              {p.secondary.length > 0 && <> · también {p.secondary.map((s) => POSITION_LABEL[s].toLowerCase()).join(", ")}</>} · {p.age} años ({p.birth_year})
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                {row.club_initials && <ClubCrest initials={row.club_initials} color={row.club_color ?? "#334155"} size={22} />}
                {p.club_name}{p.team_name ? ` · ${p.team_name}` : ""}
              </span>
              <Badge>{p.category} · {p.level_label}</Badge>
              <AvailabilityBadge value={p.availability} />
              {entry && !entryOutOfScope && <StageBadge stage={entry.stage} />}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FavoriteButton type="player" id={id} initial={isFav} />
            <CompareToggle id={id} name={p.name} initials={p.initials} />
            {entryOutOfScope ? (
              <Badge tone="neutral" title="Lo sigue otro equipo del club">Lo sigue {entry!.team_name}</Badge>
            ) : (
              <PipelineControl playerId={id} entry={entry ? { id: entry.id, stage: entry.stage, team_name: entry.team_name } : null} teams={teams} offerId={sel?.o.id} canTeamSelect={can.allTeams(u)} defaultTeam={sel?.o.team_id ?? teams[0]?.id} />
            )}
            <ContactControl playerId={id} firstName={p.first_name} state={contact} clubName={club.name} offerTitle={sel?.o.title} teams={teams} defaultTeam={sel?.o.team_id ?? entry?.team_id ?? null} />
          </div>
        </div>
      </Card>

      {/* Respuestas rápidas */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-subtle"><UserRound className="size-3.5" /> ¿Quién es?</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{p.position_label} {FOOT_LABEL[p.foot].toLowerCase()}, {p.height ? `${p.height} cm, ` : ""}{p.category.toLowerCase()} en {p.level_label}. {p.location}.</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-subtle"><BarChart3 className="size-3.5" /> ¿Qué ha hecho?</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">Temporada {ctx.prevSeason.label}: {prevTxt}. {detail.career.length} temporadas de trayectoria{detail.videos.length && !videosHidden ? ` · ${detail.videos.length} vídeos` : ""}.</p>
        </Card>
        <Card className={cn("p-4", sel && sel.m.score >= 80 && "border-accent-soft-2 bg-accent-soft/40")}>
          <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-subtle"><Target className="size-3.5" /> ¿Encaja?</p>
          {sel ? (
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2"><strong className="text-[20px] font-extrabold text-ink tabular">{sel.m.score}%</strong> de compatibilidad con «{sel.o.title}». Cumple {sel.m.factors.filter((f) => f.status === "ok").length} de 7 factores.</p>
          ) : (
            <p className="mt-2 text-[13.5px] text-muted">Crea una oportunidad para calcular la compatibilidad.</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-subtle"><Compass className="size-3.5" /> ¿Qué hacemos ahora?</p>
          <p className="mt-2 text-[13.5px] font-bold text-ink">{next.title}</p>
          <p className="text-[12.5px] leading-relaxed text-muted">{next.text}</p>
          <ol className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1" aria-label="Progreso del proceso">
            {steps.map((s) => (
              <li key={s.key} className={cn("inline-flex items-center gap-1 text-[11.5px] font-semibold", s.done ? "text-accent-ink" : "text-subtle")}>
                {s.done ? <Check className="size-3.5" /> : <Circle className="size-3" />} {s.label}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {apps.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent-soft-2 bg-accent-soft px-4 py-3 text-[13px]">
          <span className="font-bold text-accent-ink">Se ha inscrito a tus oportunidades:</span>
          {apps.map((a) => (
            <Link key={a.id} href={`/club/oportunitats/${a.offer_id}?tab=sollicituds`} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 font-semibold hover:underline">
              {a.title} <span className="text-muted">· {APP_STATUS_LABEL[a.status]} · {fmtRelative(a.created_at)}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="flex items-start gap-3 rounded-xl bg-bg p-4">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent-ink">Resumen · IA demo</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{profileSummary(p)}</p>
              </div>
            </div>
            {p.description && (
              <blockquote className="mt-4 border-l-2 border-accent pl-4 text-[14px] italic leading-relaxed text-muted">«{p.description}»<span className="mt-1 block text-[12px] not-italic text-subtle">— Descripción escrita por el jugador</span></blockquote>
            )}
          </Card>

          <Card>
            <ClientTabs
              initial={sp.tab}
              tabs={[
                {
                  key: "resum", label: "Rendimiento", content: (
                    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                      <div className="flex flex-col items-center gap-3">
                        <Radar series={[{ name: p.name, color: "#00b85f", values: p.radar }]} size={240} />
                        <p className="text-[11.5px] text-subtle">Atributos declarados y evaluados (escala 1–10)</p>
                      </div>
                      <div>
                        <AttrBars attrs={p.attrs} position={p.position} />
                        {p.prev && (
                          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {[["Conv.", p.prev.callups], ["Partidos", p.prev.matches], ["Titular", p.prev.starts], ["Minutos", p.prev.minutes.toLocaleString("es-ES")], [p.position === "POR" ? "Portería 0" : "Goles", p.position === "POR" ? p.prev.clean_sheets : p.prev.goals], ["Tarjetas", p.prev.yellow + p.prev.red]].map(([k, v]) => (
                              <div key={k as string} className="rounded-xl bg-sunken p-2.5 text-center">
                                <p className="text-[18px] font-extrabold tabular">{v}</p>
                                <p className="text-[11px] text-muted">{k}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-[11.5px] text-subtle">Temporada {ctx.prevSeason.label}{p.prev ? <> · <VerificationBadge status={p.prev.verification} compact /></> : null}</p>
                      </div>
                    </div>
                  ),
                },
                { key: "estadistiques", label: "Estadísticas", content: <StatsTable stats={detail.stats} hidden={p.stats_hidden} /> },
                { key: "trajectoria", label: "Trayectoria", count: detail.career.length, content: <div className="space-y-5"><CareerList career={detail.career} /><div><p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-subtle">Logros</p><Achievements items={detail.achievements} experiences={detail.experiences} /></div></div> },
                { key: "videos", label: "Vídeos", count: videosHidden ? undefined : detail.videos.length, content: <VideoGrid videos={detail.videos} hidden={videosHidden} /> },
                { key: "avaluacio", label: "Evaluación", count: evals.length, content: (
                  <div className="space-y-6">
                    {evals.length > 0 && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {evals.map((e) => {
                          const sc = JSON.parse(e.scores) as Record<string, Record<string, number>>;
                          return (
                            <div key={e.id} className="rounded-2xl border border-line p-4">
                              <div className="flex items-center justify-between">
                                <div><p className="text-[13.5px] font-bold">{e.author_name}</p><p className="text-[12px] text-muted">{e.author_title} · {fmtRelative(e.updated_at)}{e.context ? ` · ${e.context}` : ""}</p></div>
                                <div className="text-right"><p className="text-[22px] font-extrabold tabular leading-none">{avgEval(e.scores)}</p><p className="text-[11px] text-subtle">media</p></div>
                              </div>
                              <div className="mt-3 grid grid-cols-5 gap-1.5">
                                {EVAL_AREAS.map((a) => {
                                  const v = Object.values(sc[a.key] ?? {});
                                  const m = v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0;
                                  return <div key={a.key} className="rounded-lg bg-sunken px-1 py-1.5 text-center"><p className="text-[14px] font-bold tabular">{m ? m.toFixed(1) : "—"}</p><p className="text-[10.5px] text-muted">{a.label}</p></div>;
                                })}
                              </div>
                              <p className="mt-3 text-[12.5px]"><Badge tone={e.decision === "descartar" ? "danger" : e.decision === "fitxar" ? "accent" : e.decision === "prova" ? "info" : "neutral"}>{EVAL_DECISIONS[e.decision]}</Badge></p>
                              {e.comment && <p className="mt-2 text-[13px] leading-relaxed text-muted">{e.comment}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div>
                      <p className="mb-3 text-[13px] font-bold">{myEval ? "Tu evaluación" : "Nueva evaluación"} <span className="font-normal text-muted">· privada del club</span></p>
                      <EvaluationForm playerId={id} initial={myEval ? { scores: JSON.parse(myEval.scores), decision: myEval.decision, comment: myEval.comment ?? "", context: myEval.context } : null} />
                    </div>
                  </div>
                ) },
                { key: "notes", label: "Notas privadas", count: notes.length, content: <NotesPanel playerId={id} notes={notes} meId={u.id} isDirector={can.manageUsers(u)} /> },
                { key: "activitat", label: "Actividad", count: activity.length, content: (
                  <div>
                    <div className="mb-4 flex items-center justify-between"><p className="text-[13px] text-muted">Historial de este jugador en tu club.</p><InteractionForm playerId={id} /></div>
                    {activity.length === 0 ? <EmptyState icon={<History className="size-5" />} title="Sin actividad" /> : (
                      <ol className="relative space-y-3 border-l border-line pl-5">
                        {activity.map((a) => (
                          <li key={a.id} className="relative text-[13px]">
                            <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-line-strong" />
                            <p>{a.text}</p>
                            <p className="text-[11.5px] text-subtle">{a.user_name ?? "Sistema"} · {fmtDate(a.created_at, { short: true })} · {fmtRelative(a.created_at)}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ) },
              ]}
            />
          </Card>

          {reports.length > 0 && (
            <Card>
              <CardHeader title="Informes de observación" subtitle="Observaciones en partidos" icon={<Binoculars className="size-4" />} />
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13.5px] font-bold">{r.match_title}</p>
                      <div className="flex items-center gap-2"><Badge tone="info">{SCOUT_RECOMMENDATION[r.recommendation]}</Badge><span className="text-[13px] font-extrabold tabular">{r.rating}/10</span></div>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{r.observations}</p>
                    <p className="mt-1 text-[11.5px] text-subtle">{r.author_name} · {fmtDate(r.match_date, { short: true, year: true })}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          <Card className="border-accent-soft-2">
            {sel ? (
              <>
                <div className="mb-4">
                  <h2 className="text-[17px] font-extrabold tracking-tight">¿Por qué encaja?</h2>
                  <p className="mt-0.5 text-[12.5px] text-muted">Compatibilidad con la oportunidad: siete factores ponderados, cada uno con su explicación. No es una probabilidad de fichaje.</p>
                  <div className="mt-3"><OfferSelector offers={scored.map((s) => ({ id: s.o.id, title: s.o.title, score: s.m.score }))} value={sel.o.id} /></div>
                </div>
                <MatchBreakdown match={sel.m} />
              </>
            ) : (
              <EmptyState title="Sin oportunidades abiertas" text="Crea una oportunidad para ver la compatibilidad de este jugador." />
            )}
          </Card>

          <Card>
            <CardHeader title="Datos básicos" />
            <div className="flex gap-4">
              <PositionPitch primary={p.position} secondary={p.secondary} size={96} />
              <dl className="min-w-0 flex-1 space-y-2 text-[13px]">
                <div className="flex items-center gap-2"><MapPin className="size-4 text-subtle" /><span>{p.location}</span></div>
                <div className="flex items-center gap-2"><Footprints className="size-4 text-subtle" /><span>Pie {FOOT_LABEL[p.foot].toLowerCase()}</span></div>
                <div className="flex items-center gap-2"><Ruler className="size-4 text-subtle" /><span>{p.height ? `${p.height} cm` : "Altura no visible"}</span></div>
                <div className="flex items-center gap-2"><CalendarDays className="size-4 text-subtle" /><span>{CONTRACT_LABEL[row.contract_status]}</span></div>
                <div className="flex items-center gap-2"><Languages className="size-4 text-subtle" /><span>{p.languages ?? "—"}</span></div>
              </dl>
            </div>
            {p.style && <p className="mt-3 rounded-xl bg-sunken px-3 py-2 text-[13px]"><span className="text-muted">Estilo:</span> <span className="font-semibold">{p.style}</span></p>}
            <p className="mt-3 text-[11.5px] text-subtle">Perfil actualizado {fmtRelative(p.updated_at)} · completado al {p.completeness}%</p>
          </Card>

          <Card>
            <CardHeader title="Contexto competitivo" subtitle={comp ? `${comp.name} · ${season.label}` : "Sin competición asociada"} icon={<Trophy className="size-4" />} />
            {comp && myRow ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[["Posición", `${myRow.pos}º`], ["Puntos", myRow.points], ["Jornadas", myRow.played]].map(([k, v]) => (
                    <div key={k as string} className="rounded-xl bg-sunken p-2.5 text-center"><p className="text-[18px] font-extrabold tabular">{v}</p><p className="text-[11px] text-muted">{k}</p></div>
                  ))}
                </div>
                <div className="mt-3 space-y-1">
                  {standings.slice(Math.max(0, myRow.pos - 3), myRow.pos + 2).map((s) => (
                    <div key={s.pos} className={cn("flex items-center gap-2 rounded-lg px-2 py-1 text-[12.5px]", s.team_id === row.team_id && "bg-accent-soft font-bold")}>
                      <span className="w-5 text-right tabular text-subtle">{s.pos}</span>
                      <span className="flex-1 truncate">{s.team_name}</span>
                      <span className="tabular">{s.points}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 rounded-xl border border-dashed border-line-strong p-3 text-[11.5px] leading-relaxed text-muted">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  <span><strong className="text-ink-2">Datos ficticios de demostración.</strong> No replican ninguna clasificación oficial; usar datos de la FCF requiere validación FCF, legal y técnica.</span>
                </div>
              </>
            ) : (
              <p className="text-[13px] text-muted">El jugador no tiene un equipo actual en la plataforma.</p>
            )}
          </Card>

          {p.minor && (
            <Card className="border-[#ddd6fe] bg-violet-soft/60">
              <div className="flex gap-3">
                <ShieldAlert className="size-5 shrink-0 text-violet" />
                <p className="text-[12.5px] leading-relaxed text-ink-2"><strong>Menor protegido.</strong> Ubicación mostrada solo por comarca. Cualquier contacto requiere la autorización del tutor legal, que puede revocarla en cualquier momento.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Users } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { all, get } from "@/server/db/client";
import { scopedTeams } from "@/server/services/club";
import { seasons } from "@/server/services/players";
import { Badge, Card, CardHeader, EmptyState, PageHeader, cn } from "@/components/ui";
import { POSITIONS, POSITION_LABEL, POSITION_PITCH, POSITION_GROUP, ROSTER_STATUS_LABEL, FOOT_LABEL } from "@/lib/domain";
import type { Position } from "@/lib/domain";

export const metadata = { title: "Plantilla" };

type Entry = { id: string; player_id: string | null; name: string; shirt: number | null; position: Position; foot: string; status: string; rating: number | null; trend: number; birth_year: number | null };
const GROUP_LABEL: Record<string, string> = { POR: "Porteros", DEF: "Defensas", MIG: "Centrocampistas", ATK: "Atacantes" };
const FORMATION: Position[] = ["POR", "LD", "DC", "DC", "LE", "MCD", "MC", "MCO", "ED", "DAV", "EE"];

export default async function SquadPage({ searchParams }: { searchParams: Promise<{ team?: string; s?: string }> }) {
  const u = await requireClubStaff();
  const sp = await searchParams;
  const teams = scopedTeams(u);
  if (!teams.length) return <EmptyState title="Sin equipos" />;
  const team = teams.find((t) => t.id === sp.team) ?? teams.find((t) => t.id === u.team_id) ?? teams.find((t) => t.name === "Juvenil A") ?? teams[0];
  const ss = [...seasons()].reverse();
  const season = ss.find((s) => s.id === sp.s) ?? ss[0];
  const ts = get<{ id: string; coach_name: string | null; objectives: string | null; needs: string | null }>("SELECT * FROM team_seasons WHERE team_id = ? AND season_id = ?", team.id, season.id);
  const entries: Entry[] = ts ? all<Entry>(
    `SELECT r.id, r.player_id, COALESCE(p.first_name || ' ' || p.last_name, r.external_name) AS name, r.shirt, r.position, r.foot, r.status, r.rating, r.trend, r.birth_year
     FROM roster_entries r LEFT JOIN players p ON p.id = r.player_id WHERE r.team_season_id = ? ORDER BY r.shirt`, ts.id) : [];
  const needs = JSON.parse(ts?.needs ?? "[]") as { position: string; text: string; priority: string }[];

  // onze inicial: el millor valorat per posició segons el sistema 1-4-3-3
  const used = new Set<string>();
  const xi = FORMATION.map((pos, i) => {
    const cand = entries.filter((e) => e.position === pos && !used.has(e.id) && e.status !== "cedit").sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
    if (cand) used.add(cand.id);
    const c = POSITION_PITCH[pos];
    const x = pos === "DC" ? (i === 2 ? 38 : 62) : c.x;
    return { pos, e: cand, x, y: c.y };
  });

  // anàlisi automàtica
  const analysis: { level: "alta" | "mitjana"; text: string }[] = [];
  const dcs = entries.filter((e) => e.position === "DC");
  if (dcs.length && !dcs.some((e) => e.foot === "esquerre")) analysis.push({ level: "alta", text: `Ninguno de los ${dcs.length} defensas centrales es zurdo.` });
  const leaving = entries.filter((e) => e.status === "baixa");
  const leavingByPos = POSITIONS.map((p) => ({ p, n: leaving.filter((e) => e.position === p).length, total: entries.filter((e) => e.position === p).length })).filter((x) => x.n > 0);
  const PLURAL: Record<Position, string> = { POR: "porters", LD: "laterales derechos", DC: "defensas centrales", LE: "laterales izquierdos", MCD: "pivots", MC: "migcampistes", MCO: "mitjapuntes", ED: "extremos derechos", EE: "extremos izquierdos", DAV: "davanters" };
  for (const x of leavingByPos) if (x.n >= 2 && x.n / x.total >= 0.5) analysis.push({ level: "alta", text: `${x.n} de ${x.total} ${PLURAL[x.p]} terminan etapa esta temporada.` });
  for (const p of ["POR", "LE", "LD", "DAV"] as Position[]) {
    const n = entries.filter((e) => e.position === p).length;
    if (entries.length && n < 2) analysis.push({ level: "mitjana", text: `Solo hay ${n} ${POSITION_LABEL[p].toLowerCase()} en la plantilla.` });
  }
  const years = entries.map((e) => e.birth_year).filter(Boolean) as number[];
  const byYear = Array.from(new Set(years)).sort().map((y) => ({ y, n: years.filter((x) => x === y).length }));
  const maxY = Math.max(1, ...byYear.map((b) => b.n));
  const hist = ss.map((s) => {
    const t = get<{ id: string }>("SELECT id FROM team_seasons WHERE team_id = ? AND season_id = ?", team.id, s.id);
    const n = t ? get<{ n: number; r: number }>("SELECT COUNT(*) AS n, AVG(rating) AS r FROM roster_entries WHERE team_season_id = ?", t.id) : null;
    return { s, n: n?.n ?? 0, r: n?.r ?? 0 };
  });
  const query = (k: string, v: string) => {
    const p = new URLSearchParams({ team: team.id, s: season.id, [k]: v });
    return `/club/plantilla?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader eyebrow="Plantilla" title={`${team.name} · ${season.label}`} subtitle={ts?.coach_name ? `Entrenador: ${ts.coach_name}${ts.objectives ? ` · Objetivo: ${ts.objectives}` : ""}` : undefined} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {teams.map((t) => <Link key={t.id} href={query("team", t.id)} className={cn("h-8 rounded-full border px-3 text-[12.5px] font-semibold leading-8 transition", t.id === team.id ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-line-strong")}>{t.name}</Link>)}
        <span className="mx-1 h-5 w-px bg-line" />
        {ss.map((s) => <Link key={s.id} href={query("s", s.id)} className={cn("h-8 rounded-full border px-3 text-[12.5px] font-semibold leading-8 transition", s.id === season.id ? "border-accent-600 bg-accent-soft text-accent-ink" : "border-line bg-surface hover:border-line-strong")}>{s.label}{s.is_current ? " · actual" : ""}</Link>)}
      </div>

      {entries.length === 0 ? <EmptyState icon={<Users className="size-5" />} title="Sin plantilla registrada para esta temporada" /> : (
        <div className="grid gap-5 xl:grid-cols-[440px_1fr]">
          <div className="space-y-5">
            <Card className="overflow-hidden" pad={false}>
              <div className="relative mx-auto aspect-[68/100] w-full max-w-[440px] bg-[#0f5132]">
                <div className="pitch-lines absolute inset-0" />
                <svg viewBox="0 0 68 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
                  <g stroke="rgba(255,255,255,.35)" strokeWidth="0.35" fill="none">
                    <rect x="3" y="3" width="62" height="94" />
                    <line x1="3" y1="50" x2="65" y2="50" />
                    <circle cx="34" cy="50" r="8" />
                    <rect x="16" y="3" width="36" height="14" />
                    <rect x="16" y="83" width="36" height="14" />
                    <rect x="25" y="3" width="18" height="5" />
                    <rect x="25" y="92" width="18" height="5" />
                  </g>
                </svg>
                {xi.map(({ pos, e, x, y }, i) => (
                  <div key={i} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${x}%`, top: `${y}%` }}>
                    <span className={cn("grid size-10 place-items-center rounded-full border-2 text-[13px] font-extrabold shadow-pop", e ? (e.status === "baixa" ? "border-warn bg-white text-ink" : "border-white bg-white text-ink") : "border-dashed border-white/70 bg-white/10 text-white")}>{e?.shirt ?? "?"}</span>
                    <span className="mt-1 max-w-[88px] truncate rounded-md bg-black/55 px-1.5 py-0.5 text-center text-[10.5px] font-semibold text-white">{e ? e.name.split(" ")[0] + " " + (e.name.split(" ")[1]?.[0] ?? "") + "." : POSITION_LABEL[pos]}</span>
                  </div>
                ))}
              </div>
              <p className="px-4 py-3 text-[12px] text-muted">Once orientativo (1-4-3-3) con los jugadores mejor valorados por posición. Los contornos naranjas terminan etapa.</p>
            </Card>
            <Card>
              <CardHeader title="Distribución por año de nacimiento" />
              <div className="flex h-28 items-end gap-2">
                {byYear.map((b) => (
                  <div key={b.y} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[11px] font-bold tabular">{b.n}</span>
                    <div className="bar-anim w-full rounded-t-md bg-accent-600" style={{ height: `${(b.n / maxY) * 80}px`, transformOrigin: "bottom", animationName: "none" }} />
                    <span className="text-[11px] text-muted tabular">{b.y}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="space-y-5">
            {season.is_current ? (
              <Card className="border-[#fde68a] bg-[#fffdf3]">
                <CardHeader title="Análisis de necesidades" subtitle="Detección automática a partir de la plantilla y de las necesidades definidas por la dirección" icon={<AlertTriangle className="size-4 text-warn" />} />
                <div className="space-y-2">
                  {[...needs.map((n) => ({ level: n.priority as "alta" | "mitjana", text: `${POSITION_LABEL[n.position as Position]}: ${n.text}`, pos: n.position })), ...analysis.map((a) => ({ ...a, pos: null }))].map((a, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
                      <Badge tone={a.level === "alta" ? "danger" : "warn"}>{a.level === "alta" ? "Prioridad alta" : "Prioridad media"}</Badge>
                      <p className="flex-1 text-[13px]">{a.text}</p>
                      {a.pos && <Link href={`/club/intelligence?q=${encodeURIComponent(`${POSITION_LABEL[a.pos as Position]} ${a.text.toLowerCase().includes("esquerr") ? "zurdo" : ""} ${team.category === "Juvenil" ? "sub-19" : team.category.toLowerCase()}${team.gender === "F" ? " femenina" : ""}`)}`} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent-ink hover:underline"><Sparkles className="size-3.5" /> Buscar</Link>}
                    </div>
                  ))}
                  {needs.length + analysis.length === 0 && <p className="text-[13px] text-muted">No se han detectado carencias.</p>}
                </div>
              </Card>
            ) : null}
            <Card>
              <CardHeader title={`Plantilla (${entries.length})`} subtitle="Datos de demostración" />
              <div className="space-y-5">
                {(["POR", "DEF", "MIG", "ATK"] as const).map((g) => {
                  const list = entries.filter((e) => POSITION_GROUP[e.position] === g);
                  return (
                    <div key={g}>
                      <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-subtle">{GROUP_LABEL[g]} · {list.length}</p>
                      <div className="divide-y divide-line rounded-xl border border-line">
                        {list.map((e) => (
                          <div key={e.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                            <span className="w-6 text-right font-extrabold tabular text-subtle">{e.shirt}</span>
                            <div className="min-w-0 flex-1">
                              {e.player_id ? <Link href={`/club/jugadores/${e.player_id}`} className="font-semibold hover:underline">{e.name}</Link> : <span className="font-semibold">{e.name}</span>}
                              <span className="ml-1.5 text-muted">· {POSITION_LABEL[e.position]} · {FOOT_LABEL[e.foot]?.toLowerCase()} · {e.birth_year}</span>
                            </div>
                            {e.player_id && <Badge tone="accent">En ScoutUp</Badge>}
                            <Badge tone={e.status === "titular" ? "dark" : e.status === "baixa" ? "warn" : "neutral"}>{ROSTER_STATUS_LABEL[e.status]}</Badge>
                            <span className="flex w-12 items-center justify-end gap-1 font-bold tabular">{e.rating?.toFixed(1)}{e.trend > 0 ? <TrendingUp className="size-3.5 text-accent-600" /> : e.trend < 0 ? <TrendingDown className="size-3.5 text-danger" /> : <Minus className="size-3.5 text-subtle" />}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <CardHeader title="Evolución entre temporadas" />
              <div className="grid grid-cols-3 gap-2">
                {hist.map((h) => (
                  <Link key={h.s.id} href={query("s", h.s.id)} className={cn("rounded-xl border p-3 transition", h.s.id === season.id ? "border-ink" : "border-line hover:border-line-strong")}>
                    <p className="text-[12px] font-semibold text-muted">{h.s.label}</p>
                    <p className="mt-1 text-[20px] font-extrabold tabular">{h.n}</p>
                    <p className="text-[11.5px] text-muted">jugadores · mitjana {h.r ? h.r.toFixed(1) : "—"}</p>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

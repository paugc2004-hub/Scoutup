import Link from "next/link";
import { Info, Trophy, Users, Shirt, Target } from "lucide-react";
import { can } from "@/server/services/access";
import { requireClubStaff } from "@/server/auth/session";
import { all, get, parseJson } from "@/server/db/client";
import { scopedTeams } from "@/server/services/club";
import { currentSeason, seasons } from "@/server/services/players";
import { competitionProvider } from "@/server/competition/provider";
import { Badge, Card, CardHeader, PageHeader, cn } from "@/components/ui";
import { GENDER_LABEL, POSITION_LABEL } from "@/lib/domain";
import type { Position } from "@/lib/domain";

export const metadata = { title: "Equipos y competición" };

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const u = await requireClubStaff();
  const sp = await searchParams;
  const teams = scopedTeams(u);
  const season = currentSeason();
  const provider = competitionProvider();
  const team = teams.find((t) => t.id === sp.team) ?? teams.find((t) => t.id === u.team_id) ?? teams.find((t) => t.name === "Juvenil A") ?? teams[0];
  const cards = teams.map((t) => {
    const comp = provider.competitionForTeam(t.id, season.id);
    const st = comp ? provider.standings(comp.id).find((s) => s.team_id === t.id) : null;
    const ts = get<{ coach_name: string | null }>("SELECT coach_name FROM team_seasons WHERE team_id = ? AND season_id = ?", t.id, season.id);
    const n = get<{ n: number }>("SELECT COUNT(*) AS n FROM roster_entries r JOIN team_seasons ts ON ts.id = r.team_season_id WHERE ts.team_id = ? AND ts.season_id = ?", t.id, season.id)?.n ?? 0;
    return { t, comp, st, coach: ts?.coach_name, n };
  });
  const sel = cards.find((c) => c.t.id === team.id)!;
  const standings = sel.comp ? provider.standings(sel.comp.id) : [];
  const ts = get<{ coach_name: string | null; coordinator_name: string | null; delegate_name: string | null; staff: string | null; objectives: string | null; needs: string | null }>("SELECT * FROM team_seasons WHERE team_id = ? AND season_id = ?", team.id, season.id);
  const staff = parseJson<{ role: string; name: string }[]>(ts?.staff, []);
  const needs = parseJson<{ position: string; text: string; priority: string }[]>(ts?.needs, []);
  const history = seasons().filter((s) => !s.is_current).reverse().map((s) => {
    const c = provider.competitionForTeam(team.id, s.id);
    const r = c ? provider.standings(c.id).find((x) => x.team_id === team.id) : null;
    return { s, c, r };
  }).filter((h) => h.c);
  const offers = all<{ id: string; title: string }>("SELECT id, title FROM offers WHERE team_id = ? AND status = 'oberta'", team.id);

  return (
    <div>
      <PageHeader eyebrow="Estructura deportiva" title="Equipos y competición" subtitle={`Temporada ${season.label}. ${!can.allTeams(u) ? "Como entrenador ves tu equipo." : `${teams.length} equipos en el club.`}`} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.t.id} href={`/club/equips?team=${c.t.id}`} className={cn("rounded-2xl border bg-surface p-4 shadow-card transition hover:border-line-strong", c.t.id === team.id ? "border-ink ring-1 ring-ink" : "border-line")}>
            <div className="flex items-center justify-between"><p className="text-[15px] font-bold">{c.t.name}</p>{c.t.is_first_team ? <Badge tone="dark">Primer equipo</Badge> : null}</div>
            <p className="mt-0.5 text-[12.5px] text-muted">{c.t.category} · {GENDER_LABEL[c.t.gender]}</p>
            <p className="mt-3 truncate text-[12.5px] font-semibold">{c.comp?.name ?? "Sin competición"}</p>
            <div className="mt-2 flex items-center gap-3 text-[12px] text-muted">
              {c.st && <span className="inline-flex items-center gap-1"><Trophy className="size-3.5" /> {c.st.pos}a · {c.st.points} pts</span>}
              <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {c.n}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title={sel.comp?.name ?? "Clasificación"} subtitle={`${season.label} · jornada ${standings[0]?.played ?? 0}`} icon={<Trophy className="size-4" />} action={<Badge tone="warn">Datos ficticios</Badge>} />
          {standings.length ? (
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead><tr className="border-b border-line text-[11.5px] font-bold uppercase tracking-wider text-subtle"><th className="py-2 text-left">#</th><th className="py-2 text-left">Equipo</th>{["PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"].map((h) => <th key={h} className="px-2 py-2 text-right">{h}</th>)}</tr></thead>
                <tbody>
                  {standings.map((s) => (
                    <tr key={s.pos} className={cn("border-b border-line last:border-0", s.team_id === team.id && "bg-accent-soft font-bold", s.club_id && s.team_id !== team.id && "")}>
                      <td className="py-2 pr-2 tabular text-subtle">{s.pos}</td>
                      <td className="py-2">{s.team_name}{s.club_id && s.team_id !== team.id ? <span className="ml-1.5 text-[10.5px] font-semibold text-accent-ink">· a ScoutUp</span> : null}</td>
                      {[s.played, s.won, s.drawn, s.lost, s.gf, s.ga, s.gf - s.ga, s.points].map((v, i) => <td key={i} className={cn("px-2 py-2 text-right tabular", i === 7 && "font-extrabold")}>{i === 6 && v > 0 ? `+${v}` : v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-[13px] text-muted">Este equipo no tiene competición asignada.</p>}
          <div className="mt-4 flex gap-2.5 rounded-xl border border-dashed border-line-strong p-3.5 text-[12.5px] leading-relaxed text-muted">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>Fuente: <strong className="text-ink-2">{provider.label}</strong>. La aplicación lee estos datos a través de un <code className="rounded bg-sunken px-1">CompetitionDataProvider</code>. En el futuro, si se acordara con la FCF, un proveedor oficial podría sustituirlo sin cambiar el resto de la aplicación (pendiente de validación FCF, legal y técnica).</span>
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Cuerpo técnico" icon={<Shirt className="size-4" />} />
            <dl className="space-y-2 text-[13px]">
              {[["Entrenador", ts?.coach_name], ["Coordinación", ts?.coordinator_name], ["Delegado", ts?.delegate_name], ...staff.map((s) => [s.role, s.name])].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className="flex justify-between border-b border-line pb-2 last:border-0"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Objetivos y necesidades" icon={<Target className="size-4" />} />
            {ts?.objectives && <p className="text-[13px] leading-relaxed text-ink-2">{ts.objectives}</p>}
            <div className="mt-3 space-y-2">
              {needs.map((n, i) => <div key={i} className="rounded-xl bg-bg p-2.5 text-[12.5px]"><Badge tone={n.priority === "alta" ? "danger" : "warn"}>{POSITION_LABEL[n.position as Position]}</Badge> <span className="ml-1">{n.text}</span></div>)}
              {offers.map((o) => <Link key={o.id} href={`/club/oportunitats/${o.id}`} className="block rounded-xl border border-line p-2.5 text-[12.5px] font-semibold hover:border-line-strong">Oportunitat oberta: {o.title} →</Link>)}
            </div>
            <Link href={`/club/plantilla?team=${team.id}`} className="mt-3 inline-block text-[12.5px] font-semibold text-accent-ink hover:underline">Ver la plantilla →</Link>
          </Card>
          {history.length > 0 && (
            <Card>
              <CardHeader title="Historial" />
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.s.id} className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-[13px]">
                    <span><span className="font-semibold">{h.s.label}</span> <span className="text-muted">· {h.c!.name}</span></span>
                    <span className="font-bold tabular">{h.r ? `${h.r.pos}a · ${h.r.points} pts` : "—"}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

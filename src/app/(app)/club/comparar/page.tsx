import Link from "next/link";
import { Columns3, Sparkles, X } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { all } from "@/server/db/client";
import { can, clubCanSee, clubRelations } from "@/server/services/access";
import { club as getClub } from "@/server/services/club";
import { clubOffers, toMatchOffer } from "@/server/services/offers";
import { playerCtx, playerRow, presentPlayer, toMatchPlayer } from "@/server/services/players";
import { compareSummary } from "@/server/services/intelligence";
import { computeMatch } from "@/lib/matching";
import type { MatchResult } from "@/lib/matching";
import { ATTR_LABEL, ATTRS, FOOT_LABEL, AVAILABILITY_LABEL } from "@/lib/domain";
import { Avatar, Card, EmptyState, MatchRing, PageHeader, Radar, VerificationBadge, cn, matchColor } from "@/components/ui";
import { OfferSelector } from "@/components/club/player-actions";
import { CompareToggle } from "@/components/club/compare-tray";

export const metadata = { title: "Comparar jugadores" };
const COLORS = ["#00b85f", "#2563eb", "#f59e0b"];

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string; offer?: string }> }) {
  const u = await requireClubStaff();
  const sp = await searchParams;
  const club = getClub(u.club_id);
  const rel = clubRelations(u.club_id);
  const ctx = playerCtx();
  const ids = (sp.ids ?? "").split(",").filter(Boolean).slice(0, 3);
  const rows = ids.map((id) => playerRow(id)).filter((p) => p && clubCanSee(p, club, rel).visible) as NonNullable<ReturnType<typeof playerRow>>[];
  const players = rows.map((r) => presentPlayer(r, ctx, { ownClub: r.club_id === u.club_id }));

  if (players.length < 2) {
    const pipe = all<{ player_id: string; first_name: string; last_name: string; avatar_hue: number }>("SELECT pe.player_id, p.first_name, p.last_name, p.avatar_hue FROM pipeline_entries pe JOIN players p ON p.id = pe.player_id WHERE pe.club_id = ? ORDER BY pe.updated_at DESC LIMIT 9", u.club_id);
    return (
      <div>
        <PageHeader eyebrow="Decidir" title="Comparar jugadores" subtitle="Elige hasta 3 jugadores con el botón «Comparar» (en la búsqueda, en las oportunidades o en el perfil) y compáralos cara a cara." />
        <EmptyState icon={<Columns3 className="size-5" />} title="Selecciona al menos dos jugadores" text="Usa el botón + de los resultados o añádelos desde tu pipeline:" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pipe.map((p) => (
            <div key={p.player_id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <Avatar initials={(p.first_name[0] + p.last_name[0]).toUpperCase()} hue={p.avatar_hue} size={34} />
              <Link href={`/club/jugadors/${p.player_id}`} className="min-w-0 flex-1 truncate text-[13.5px] font-semibold hover:underline">{p.first_name} {p.last_name}</Link>
              <CompareToggle id={p.player_id} name={`${p.first_name} ${p.last_name}`} initials={(p.first_name[0] + p.last_name[0]).toUpperCase()} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const offers = clubOffers(u.club_id).filter((o) => o.status === "oberta" && o.gender === rows[0].gender && (can.allTeams(u) || o.team_id === u.team_id));
  const avg = (o: (typeof offers)[number]) => rows.reduce((a, r) => a + computeMatch(toMatchPlayer(r, ctx.prev.get(r.id), ctx.career.get(r.id) ?? 0), toMatchOffer(o), ctx.now).score, 0);
  const offer = offers.find((o) => o.id === sp.offer) ?? [...offers].sort((a, b) => avg(b) - avg(a))[0];
  const matches: (MatchResult | null)[] = rows.map((r) => (offer ? computeMatch(toMatchPlayer(r, ctx.prev.get(r.id), ctx.career.get(r.id) ?? 0), toMatchOffer(offer), ctx.now) : null));
  const scores = Object.fromEntries(players.map((p, i) => [p.id, matches[i]?.score ?? 0]));
  const summary = compareSummary(players, offer ? scores : undefined);
  const best = (vals: number[], higher = true) => {
    const m = higher ? Math.max(...vals) : Math.min(...vals);
    return vals.map((v) => v === m && vals.filter((x) => x === m).length < vals.length);
  };
  const Row = ({ label, vals, fmt, higher = true }: { label: string; vals: number[]; fmt?: (v: number) => string; higher?: boolean }) => {
    const b = best(vals, higher);
    return (
      <tr className="border-b border-line last:border-0">
        <td className="py-2.5 pr-3 text-[13px] text-muted">{label}</td>
        {vals.map((v, i) => <td key={i} className={cn("px-3 py-2.5 text-center text-[13.5px] font-semibold tabular", b[i] && "text-accent-ink")}>{b[i] && <span className="mr-1 inline-block size-1.5 rounded-full bg-accent-600 align-middle" />}{fmt ? fmt(v) : v}</td>)}
      </tr>
    );
  };
  const TextRow = ({ label, vals }: { label: string; vals: string[] }) => (
    <tr className="border-b border-line last:border-0"><td className="py-2.5 pr-3 text-[13px] text-muted">{label}</td>{vals.map((v, i) => <td key={i} className="px-3 py-2.5 text-center text-[13px] font-semibold">{v}</td>)}</tr>
  );
  const idsParam = (skip: string) => ids.filter((x) => x !== skip).join(",");

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Decidir" title="Comparar jugadores" subtitle="Radar, estadísticas y compatibilidad cara a cara." actions={offer ? <div className="w-72"><OfferSelector offers={offers.map((o) => ({ id: o.id, title: o.title, score: Math.max(...rows.map((r) => computeMatch(toMatchPlayer(r, ctx.prev.get(r.id), ctx.career.get(r.id) ?? 0), toMatchOffer(o), ctx.now).score)) }))} value={offer.id} /></div> : undefined} />

      <div className={cn("grid gap-3", players.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {players.map((p, i) => (
          <Card key={p.id} className="relative animate-rise">
            <span className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: COLORS[i] }} />
            <Link href={`/club/comparar?ids=${idsParam(p.id)}${offer ? `&offer=${offer.id}` : ""}`} className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-subtle hover:bg-sunken hover:text-ink" aria-label={`Quitar a ${p.name}`}><X className="size-4" /></Link>
            <div className="flex items-center gap-3">
              <Avatar initials={p.initials} hue={p.hue} size={48} />
              <div className="min-w-0 flex-1">
                <Link href={`/club/jugadors/${p.id}${offer ? `?offer=${offer.id}` : ""}`} className="block truncate text-[15px] font-bold hover:underline">{p.name}</Link>
                <p className="truncate text-[12.5px] text-muted">{p.position_label} · {p.age} años · {p.club_name}</p>
                <div className="mt-1"><VerificationBadge status={p.verification} /></div>
              </div>
              {matches[i] && <MatchRing score={matches[i]!.score} size={54} stroke={5} />}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card>
          <p className="mb-2 text-[14px] font-bold">Perfil de atributos</p>
          <div className="flex justify-center"><Radar series={players.map((p, i) => ({ name: p.name, color: COLORS[i], values: p.radar }))} size={320} /></div>
          <div className="mt-2 flex flex-wrap justify-center gap-3">{players.map((p, i) => <span key={p.id} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold"><span className="size-2.5 rounded-full" style={{ background: COLORS[i] }} />{p.first_name}</span>)}</div>
          {summary.length > 0 && (
            <div className="mt-5 rounded-xl bg-bg p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-accent-ink"><Sparkles className="size-3.5" /> Lectura rápida</p>
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-2">{summary.map((l) => <li key={l}>· {l}</li>)}</ul>
            </div>
          )}
        </Card>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b-2 border-ink text-[12px] font-bold uppercase tracking-wider text-subtle">
                <th className="py-2 pr-3 text-left">Dato</th>
                {players.map((p, i) => <th key={p.id} className="px-3 py-2 text-center" style={{ color: COLORS[i] }}>{p.first_name}</th>)}
              </tr>
            </thead>
            <tbody>
              {offer && matches[0] && (
                <>
                  <tr><td colSpan={players.length + 1} className="pb-1 pt-3 text-[11.5px] font-bold uppercase tracking-wider text-subtle">Compatibilitat · {offer.title}</td></tr>
                  <Row label="Total" vals={matches.map((m) => m!.score)} fmt={(v) => `${v}%`} />
                  {matches[0].factors.map((f, fi) => (
                    <tr key={f.key} className="border-b border-line">
                      <td className="py-2 pr-3 text-[13px] text-muted">{f.label} <span className="text-subtle">/{f.weight}</span></td>
                      {matches.map((m, i) => {
                        const s = m!.factors[fi].score;
                        return (
                          <td key={i} className="px-3 py-2">
                            <div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full" style={{ width: `${(s / f.weight) * 100}%`, background: matchColor((s / f.weight) * 100) }} /></div><span className="w-8 text-right text-[12.5px] font-bold tabular">{Math.round(s * 10) / 10}</span></div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              )}
              <tr><td colSpan={players.length + 1} className="pb-1 pt-5 text-[11.5px] font-bold uppercase tracking-wider text-subtle">Perfil</td></tr>
              <TextRow label="Categoría y nivel" vals={players.map((p) => `${p.category} · ${p.level_label}`)} />
              <TextRow label="Pie" vals={players.map((p) => FOOT_LABEL[p.foot])} />
              <Row label="Altura (cm)" vals={players.map((p) => p.height ?? 0)} fmt={(v) => (v ? String(v) : "—")} />
              <Row label="Edad" vals={players.map((p) => p.age)} higher={false} />
              <TextRow label="Ubicación" vals={players.map((p) => p.location)} />
              <TextRow label="Disponibilidad" vals={players.map((p) => AVAILABILITY_LABEL[p.availability])} />
              <tr><td colSpan={players.length + 1} className="pb-1 pt-5 text-[11.5px] font-bold uppercase tracking-wider text-subtle">Temporada {ctx.prevSeason.label}</td></tr>
              <Row label="Convocatorias" vals={players.map((p) => p.prev?.callups ?? 0)} />
              <Row label="Partidos" vals={players.map((p) => p.prev?.matches ?? 0)} />
              <Row label="Titularidades" vals={players.map((p) => p.prev?.starts ?? 0)} />
              <Row label="Minutos" vals={players.map((p) => p.prev?.minutes ?? 0)} fmt={(v) => v.toLocaleString("es-ES")} />
              <Row label="Goles" vals={players.map((p) => p.prev?.goals ?? 0)} />
              <Row label="Asistencias" vals={players.map((p) => p.prev?.assists ?? 0)} />
              <Row label="Tarjetas" vals={players.map((p) => (p.prev?.yellow ?? 0) + (p.prev?.red ?? 0))} higher={false} />
              <tr><td colSpan={players.length + 1} className="pb-1 pt-5 text-[11.5px] font-bold uppercase tracking-wider text-subtle">Atributos (1–10)</td></tr>
              {ATTRS.map((k) => <Row key={k} label={ATTR_LABEL[k]} vals={players.map((p) => p.attrs[k] ?? 0)} />)}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

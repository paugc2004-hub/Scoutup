import Link from "next/link";
import { Plus, Megaphone, Users, Inbox, CalendarDays, MapPin, FlaskConical } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { club as getClub } from "@/server/services/club";
import { clubOffers, offerStats, rankCandidates, toMatchOffer } from "@/server/services/offers";
import { playerCtx } from "@/server/services/players";
import { Avatar, Badge, EmptyState, LinkButton, PageHeader, cn } from "@/components/ui";
import { POSITION_LABEL, levelLabel, traitLabel } from "@/lib/domain";
import type { Position } from "@/lib/domain";
import { fmtDate, fmtRelative } from "@/lib/time";

export const metadata = { title: "Ofertes" };

export default async function OffersPage() {
  const u = await requireClubStaff();
  const club = getClub(u.club_id);
  const offers = clubOffers(u.club_id).filter((o) => u.role === "director" || o.team_id === u.team_id);
  const stats = offerStats(offers.map((o) => o.id));
  const ctx = playerCtx();
  const rows = offers.map((o) => {
    const cands = o.status === "oberta" ? rankCandidates(toMatchOffer(o), club, { ctx, minScore: 70 }) : [];
    return { o, s: stats.get(o.id) ?? { total: 0, nous: 0 }, cands };
  });
  const open = rows.filter((r) => r.o.status === "oberta");
  const closed = rows.filter((r) => r.o.status !== "oberta");

  const OfferCard = ({ r }: { r: (typeof rows)[number] }) => {
    const o = r.o;
    return (
      <Link href={`/club/ofertes/${o.id}`} className={cn("group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop", o.status !== "oberta" && "opacity-70")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="dark">{o.team_name}</Badge>
            {o.kind === "prova" ? <Badge tone="violet"><FlaskConical className="size-3" /> Jornada de proves</Badge> : <Badge>Incorporació</Badge>}
            {o.status !== "oberta" && <Badge tone={o.status === "pausada" ? "warn" : "neutral"}>{o.status === "pausada" ? "Pausada" : "Tancada"}</Badge>}
          </div>
          {r.s.nous > 0 && <Badge tone="accent">{r.s.nous} {r.s.nous === 1 ? "nova" : "noves"}</Badge>}
        </div>
        <h3 className="mt-3 text-[17px] font-extrabold tracking-tight group-hover:underline">{o.title}</h3>
        <p className="mt-1 text-[13px] text-muted">{POSITION_LABEL[o.position as Position]} · nascuts {o.birth_year_min}–{o.birth_year_max} · mínim {levelLabel(o.level_min)}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {JSON.parse(o.traits ?? "[]").map((t: string) => <span key={t} className="rounded-md bg-sunken px-2 py-0.5 text-[11.5px] font-semibold text-ink-2">{traitLabel(t)}</span>)}
          {o.foot !== "indiferent" && <span className="rounded-md bg-sunken px-2 py-0.5 text-[11.5px] font-semibold text-ink-2">Peu {o.foot}</span>}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
          <div><p className="text-[20px] font-extrabold tabular">{r.cands.length}</p><p className="text-[11.5px] text-muted">≥70% compatibles</p></div>
          <div><p className="text-[20px] font-extrabold tabular">{r.s.total}</p><p className="text-[11.5px] text-muted">sol·licituds</p></div>
          <div className="flex flex-col items-center justify-center">
            <div className="flex -space-x-2">{r.cands.slice(0, 3).map((c) => <Avatar key={c.player.id} initials={c.player.initials} hue={c.player.hue} size={28} className="ring-2 ring-surface" />)}</div>
            <p className="mt-1 text-[11.5px] text-muted">millors</p>
          </div>
        </div>
        <p className="mt-4 flex items-center gap-3 text-[12px] text-subtle">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{o.zone_city} · {o.max_km} km</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{o.kind === "prova" && o.trial_date ? `Prova ${fmtDate(o.trial_date, { short: true })}` : `Publicada ${fmtRelative(o.created_at)}`}</span>
        </p>
      </Link>
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Captació"
        title="Ofertes"
        subtitle={u.role === "director" ? "Publica necessitats concretes i ScoutUp t'ordena els candidats per compatibilitat." : "Ofertes del teu equip. Només la direcció esportiva en pot publicar de noves."}
        actions={u.role === "director" ? <LinkButton href="/club/ofertes/nova" variant="primary" icon={<Plus className="size-4" />}>Nova oferta</LinkButton> : undefined}
      />
      <div className="mb-6 grid grid-cols-3 gap-3 md:max-w-xl">
        <div className="rounded-2xl border border-line bg-surface p-3.5"><Megaphone className="size-4 text-subtle" /><p className="mt-2 text-[22px] font-extrabold tabular">{open.length}</p><p className="text-[12px] text-muted">Obertes</p></div>
        <div className="rounded-2xl border border-line bg-surface p-3.5"><Inbox className="size-4 text-subtle" /><p className="mt-2 text-[22px] font-extrabold tabular">{rows.reduce((a, r) => a + r.s.nous, 0)}</p><p className="text-[12px] text-muted">Sol·licituds noves</p></div>
        <div className="rounded-2xl border border-line bg-surface p-3.5"><Users className="size-4 text-subtle" /><p className="mt-2 text-[22px] font-extrabold tabular">{new Set(open.flatMap((r) => r.cands.map((c) => c.player.id))).size}</p><p className="text-[12px] text-muted">Perfils ≥70%</p></div>
      </div>
      {open.length === 0 ? (
        <EmptyState icon={<Megaphone className="size-5" />} title="No hi ha ofertes obertes" text="Crea'n una per començar a rebre candidats compatibles." action={u.role === "director" ? <LinkButton href="/club/ofertes/nova" variant="primary">Nova oferta</LinkButton> : undefined} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{open.map((r) => <OfferCard key={r.o.id} r={r} />)}</div>
      )}
      {closed.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-[13px] font-bold uppercase tracking-[0.1em] text-subtle">Pausades i tancades</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{closed.map((r) => <OfferCard key={r.o.id} r={r} />)}</div>
        </>
      )}
    </div>
  );
}

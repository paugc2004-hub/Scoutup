import Link from "next/link";
import { Search, MapPin, Video, ChevronLeft, ChevronRight } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { all } from "@/server/db/client";
import { clubCanSee, clubRelations } from "@/server/services/access";
import { club as getClub } from "@/server/services/club";
import { clubOffers, offerRow, toMatchOffer } from "@/server/services/offers";
import { allPlayerRows, playerCtx, presentPlayer, secondaryOf, toMatchPlayer } from "@/server/services/players";
import { computeMatch } from "@/lib/matching";
import { distanceKm, placeByCity } from "@/lib/geo";
import { FOOT_LABEL, ageAt } from "@/lib/domain";
import type { Stage } from "@/lib/domain";
import { Avatar, AvailabilityBadge, Badge, EmptyState, MatchRing, PageHeader, StageBadge, VerificationBadge, btnClass, cn } from "@/components/ui";
import { SearchFilters, SortSelect } from "@/components/club/search-filters";
import { QuickPipeline, FactorStrip } from "@/components/club/candidates-list";
import { CompareToggle } from "@/components/club/compare-tray";
import { fmtRelative } from "@/lib/time";

export const metadata = { title: "Cercar jugadors" };
const PAGE = 24;

type SP = Record<string, string | undefined>;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const u = await requireClubStaff();
  const sp = await searchParams;
  const club = getClub(u.club_id);
  const rel = clubRelations(u.club_id);
  const ctx = playerCtx();
  const offers = clubOffers(u.club_id).filter((o) => o.status === "oberta" && (u.role === "director" || o.team_id === u.team_id));
  const offer = sp.offer ? offerRow(sp.offer) : null;
  const om = offer && offer.club_id === u.club_id ? toMatchOffer(offer) : null;
  const stages = new Map(all<{ player_id: string; stage: Stage }>("SELECT player_id, stage FROM pipeline_entries WHERE club_id = ?", u.club_id).map((r) => [r.player_id, r.stage]));
  const center = sp.city ? placeByCity(sp.city) : null;
  const km = Number(sp.km ?? 30);

  let hiddenMinors = 0;
  const rows = allPlayerRows().filter((p) => {
    if (p.club_id === u.club_id) return false;
    const v = clubCanSee(p, club, rel);
    if (!v.visible) {
      if (v.reason?.includes("Menor")) hiddenMinors++;
      return false;
    }
    const age = ageAt(p.birth_date);
    if (sp.q) {
      const q = norm(sp.q);
      const hay = norm(`${p.first_name} ${p.last_name} ${p.city} ${p.comarca} ${p.club_name ?? ""} ${p.primary_position}`);
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    if (sp.pos && p.primary_position !== sp.pos && !(sp.sec === "1" && secondaryOf(p).includes(sp.pos as never))) return false;
    if (sp.cat && p.category !== sp.cat) return false;
    if (sp.g && p.gender !== sp.g) return false;
    if (sp.amin && age < Number(sp.amin)) return false;
    if (sp.amax && age > Number(sp.amax)) return false;
    if (sp.foot && p.foot !== sp.foot) return false;
    if (sp.lvl && p.division_rank > Number(sp.lvl)) return false;
    if (sp.hmin && (!p.height_cm || p.height_cm < Number(sp.hmin))) return false;
    if (center && distanceKm(p.lat, p.lng, center.lat, center.lng) > km) return false;
    if (sp.comarca && p.comarca !== sp.comarca) return false;
    if (sp.disp === "actius" && p.availability === "no_disponible") return false;
    if (sp.disp && sp.disp !== "actius" && p.availability !== sp.disp) return false;
    if (sp.ver === "1" && p.verification !== "verified") return false;
    if (sp.video === "1" && !(ctx.videos.get(p.id) ?? 0)) return false;
    if (sp.lliure === "1" && p.club_id) return false;
    if (sp.minmin && (ctx.prev.get(p.id)?.minutes ?? 0) < Number(sp.minmin)) return false;
    if (om && p.gender !== om.gender) return false;
    return true;
  });

  const items = rows.map((p) => {
    const view = presentPlayer(p, ctx);
    const m = om ? computeMatch(toMatchPlayer(p, ctx.prev.get(p.id), ctx.career.get(p.id) ?? 0), om, ctx.now) : null;
    return { p: view, m, raw: p, km: center ? distanceKm(p.lat, p.lng, center.lat, center.lng) : null };
  });
  const sort = sp.sort ?? (om ? "match" : "recent");
  items.sort((a, b) => {
    if (sort === "match" && a.m && b.m) return b.m.score - a.m.score;
    if (sort === "minuts") return (b.p.prev?.minutes ?? 0) - (a.p.prev?.minutes ?? 0);
    if (sort === "gols") return (b.p.prev?.goals ?? 0) - (a.p.prev?.goals ?? 0);
    if (sort === "edat") return a.p.age - b.p.age;
    if (sort === "nom") return a.p.name.localeCompare(b.p.name, "ca");
    return b.p.updated_at.localeCompare(a.p.updated_at);
  });
  const page = Math.max(1, Number(sp.page ?? 1));
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const shown = items.slice((page - 1) * PAGE, page * PAGE);
  const pageHref = (n: number) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    p.set("page", String(n));
    return `/club/cercar?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader eyebrow="Descobrir" title="Cercar jugadors" subtitle="Filtra per posició, edat, nivell, zona, disponibilitat i dades. Tria una oferta per ordenar per compatibilitat." actions={<Link href="/club/intelligence" className={btnClass("secondary")}>Prova la cerca en llenguatge natural</Link>} />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <SearchFilters offers={offers.map((o) => ({ id: o.id, title: o.title }))} />
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13.5px] text-muted"><strong className="text-ink">{items.length}</strong> jugadors{om && offer ? <> · compatibilitat amb <strong className="text-ink">«{offer.title}»</strong></> : null}</p>
            <div className="flex items-center gap-2"><span className="text-[12.5px] text-muted">Ordenar</span><SortSelect hasOffer={!!om} /></div>
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={<Search className="size-5" />} title="Cap jugador amb aquests filtres" text="Amplia la zona, treu algun filtre o prova ScoutUp Intelligence." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {shown.map(({ p, m, km: dist }, i) => (
                <div key={p.id} className="group relative flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop" style={{ animation: `rise .35s ${Math.min(i, 12) * 0.025}s both` }}>
                  <Link href={`/club/jugadors/${p.id}${om ? `?offer=${sp.offer}` : ""}`} className="absolute inset-0 z-0 rounded-2xl" aria-label={`Veure el perfil de ${p.name}`} />
                  <div className="pointer-events-none relative flex items-start gap-3">
                    <Avatar initials={p.initials} hue={p.hue} size={46} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5"><p className="truncate text-[14.5px] font-bold group-hover:underline">{p.name}</p><VerificationBadge status={p.verification} compact /></div>
                      <p className="truncate text-[12.5px] text-muted">{p.position_label} · {p.age} anys{p.minor ? " · menor" : ""}</p>
                      <p className="truncate text-[12.5px] text-muted">{p.club_name}{p.team_name ? ` · ${p.team_name}` : ""}</p>
                    </div>
                    {m ? <MatchRing score={m.score} size={46} stroke={4.5} /> : null}
                  </div>
                  <div className="pointer-events-none relative mt-3 flex flex-wrap gap-1.5">
                    <Badge>{p.category} · {p.level_label}</Badge>
                    <Badge>Peu {FOOT_LABEL[p.foot].toLowerCase()}</Badge>
                    {p.height && <Badge>{p.height} cm</Badge>}
                    {p.has_video && <Badge tone="info"><Video className="size-3" /> Vídeo</Badge>}
                  </div>
                  {p.prev && (
                    <div className="pointer-events-none relative mt-3 grid grid-cols-4 gap-1.5 text-center">
                      {[["PJ", p.prev.matches], ["Min", p.prev.minutes], ["Gols", p.prev.goals], ["Tit.", p.prev.starts]].map(([k, v]) => (
                        <div key={k as string} className="rounded-lg bg-sunken py-1.5"><p className="text-[13.5px] font-bold tabular">{typeof v === "number" && v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}</p><p className="text-[10.5px] text-muted">{k}</p></div>
                      ))}
                    </div>
                  )}
                  {m && <div className="pointer-events-none relative mt-3"><FactorStrip factors={m.factors} /></div>}
                  <div className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="flex items-center gap-1 truncate text-[12px] text-subtle"><MapPin className="size-3.5 shrink-0" />{p.location}{dist !== null ? ` · ${Math.round(dist)} km` : ""}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <CompareToggle id={p.id} name={p.name} initials={p.initials} compact />
                      {stages.get(p.id) ? <StageBadge stage={stages.get(p.id)!} /> : <QuickPipeline playerId={p.id} name={p.name} offerId={om ? sp.offer : null} teamId={offer?.team_id ?? null} />}
                    </div>
                  </div>
                  <div className="pointer-events-none relative mt-2 flex items-center justify-between text-[11.5px] text-subtle">
                    <AvailabilityBadge value={p.availability} />
                    <span>Actualitzat {fmtRelative(p.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Link href={pageHref(Math.max(1, page - 1))} className={cn(btnClass("secondary", "sm"), page === 1 && "pointer-events-none opacity-40")}><ChevronLeft className="size-4" /> Anterior</Link>
              <span className="text-[13px] text-muted tabular">Pàgina {page} de {pages}</span>
              <Link href={pageHref(Math.min(pages, page + 1))} className={cn(btnClass("secondary", "sm"), page === pages && "pointer-events-none opacity-40")}>Següent <ChevronRight className="size-4" /></Link>
            </div>
          )}
          {hiddenMinors > 0 && <p className="mt-6 text-center text-[12px] text-subtle">{hiddenMinors} perfils de menors no es mostren perquè encara no tenen el consentiment del tutor legal.</p>}
        </div>
      </div>
    </div>
  );
}

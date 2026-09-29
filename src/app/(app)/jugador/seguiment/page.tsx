import Link from "next/link";
import { Route, Eye, Star, MessageSquare } from "lucide-react";
import { requirePlayer } from "@/server/auth/session";
import { all } from "@/server/db/client";
import { applicationsOf, clubsInterested } from "@/server/services/player-home";
import { requestsForPlayer } from "@/server/services/messages";
import { Badge, Card, ClubCrest, EmptyState, MatchRing, PageHeader, cn } from "@/components/ui";
import { ClientTabs } from "@/components/club/player-actions";
import { RequestCard } from "@/components/player/request-card";
import { APP_STATUS_LABEL, CONTACT_STATUS_LABEL } from "@/lib/domain";
import type { AppStatus } from "@/lib/domain";
import { fmtDate, fmtRelative } from "@/lib/time";

export const metadata = { title: "Seguiment" };
const FLOW: AppStatus[] = ["enviada", "vista", "contacte", "prova", "en_proces", "acceptat"];

export default async function TrackingPage() {
  const u = await requirePlayer();
  const apps = applicationsOf(u.player_id);
  const reqs = requestsForPlayer(u.player_id);
  const interested = clubsInterested(u.player_id);
  const favOffers = all<{ id: string; title: string; club_name: string; initials: string; color: string; status: string }>("SELECT o.id, o.title, c.name AS club_name, c.initials, c.color_primary AS color, o.status FROM favorites f JOIN offers o ON o.id = f.target_id JOIN clubs c ON c.id = o.club_id WHERE f.user_id = ? AND f.target_type = 'offer' ORDER BY f.created_at DESC", u.id);
  const favClubs = all<{ id: string; name: string; initials: string; color_primary: string; city: string }>("SELECT c.id, c.name, c.initials, c.color_primary, c.city FROM favorites f JOIN clubs c ON c.id = f.target_id WHERE f.user_id = ? AND f.target_type = 'club' ORDER BY f.created_at DESC", u.id);

  return (
    <div>
      <PageHeader eyebrow="Els teus processos" title="Seguiment" subtitle="L'estat de cada sol·licitud, els contactes dels clubs i qui s'ha interessat pel teu perfil." />
      <Card>
        <ClientTabs
          tabs={[
            {
              key: "sollicituds", label: "Sol·licituds", count: apps.length, content: apps.length === 0 ? <EmptyState icon={<Route className="size-5" />} title="Encara no t'has inscrit a cap oportunitat" text="Quan premis «M'interessa», podràs seguir aquí cada pas del procés." /> : (
                <div className="space-y-3">
                  {apps.map((a) => {
                    const idx = a.status === "rebutjat" || a.status === "tancat" ? -1 : FLOW.indexOf(a.status);
                    return (
                      <Link key={a.id} href={`/jugador/oportunitats/${a.offer_id}`} className="block rounded-2xl border border-line p-4 transition hover:border-line-strong">
                        <div className="flex flex-wrap items-center gap-3">
                          <ClubCrest initials={a.initials} color={a.color} size={40} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[14.5px] font-bold">{a.title}</p>
                            <p className="text-[12.5px] text-muted">{a.club_name}{a.team_name ? ` · ${a.team_name}` : ""} · enviada el {fmtDate(a.created_at, { short: true })}</p>
                          </div>
                          {a.match_score !== null && <MatchRing score={a.match_score} size={42} stroke={4} />}
                          <Badge tone={a.status === "rebutjat" ? "danger" : a.status === "prova" ? "violet" : a.status === "tancat" ? "neutral" : "accent"}>{APP_STATUS_LABEL[a.status]}</Badge>
                        </div>
                        {idx >= 0 && (
                          <div className="mt-4 grid grid-cols-6 gap-1.5">
                            {FLOW.map((s, i) => (
                              <div key={s}>
                                <div className={cn("h-1.5 rounded-full", i <= idx ? "bg-accent-600" : "bg-sunken")} />
                                <p className={cn("mt-1.5 hidden text-[10.5px] font-semibold md:block", i <= idx ? "text-ink" : "text-subtle")}>{APP_STATUS_LABEL[s]}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-[11.5px] text-subtle">Última actualització {fmtRelative(a.updated_at)}</p>
                      </Link>
                    );
                  })}
                </div>
              ),
            },
            {
              key: "contactes", label: "Contactes de clubs", count: reqs.length, content: reqs.length === 0 ? <EmptyState icon={<MessageSquare className="size-5" />} title="Cap club t'ha contactat encara" /> : (
                <div className="space-y-3">
                  {reqs.filter((r) => r.status === "pendent").map((r) => <RequestCard key={r.id} r={r} />)}
                  {reqs.filter((r) => r.status !== "pendent").map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-4">
                      <ClubCrest initials={r.club_initials} color={r.club_color} size={36} />
                      <div className="min-w-0 flex-1"><p className="text-[14px] font-bold">{r.club_name}</p><p className="truncate text-[12.5px] text-muted">{r.message}</p></div>
                      <Badge tone={r.status === "acceptada" ? "accent" : r.status === "rebutjada" ? "danger" : r.status === "pendent_tutor" ? "violet" : "neutral"}>{CONTACT_STATUS_LABEL[r.status]}</Badge>
                      {r.conversation_id && <Link href={`/jugador/missatges?c=${r.conversation_id}`} className="text-[12.5px] font-semibold text-accent-ink hover:underline">Obrir conversa</Link>}
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: "interes", label: "Clubs interessats", count: interested.length, content: interested.length === 0 ? <EmptyState icon={<Eye className="size-5" />} title="Encara cap club ha vist el teu perfil" text="Completa el perfil i afegeix un vídeo per aparèixer més amunt a les cerques." /> : (
                <div className="grid gap-3 md:grid-cols-2">
                  {interested.map((c) => (
                    <Link key={c.club_id} href={`/jugador/clubs/${c.club_id}`} className="flex items-center gap-3 rounded-2xl border border-line p-4 transition hover:border-line-strong">
                      <ClubCrest initials={c.initials} color={c.color} size={42} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold">{c.club_name}</p>
                        <p className="text-[12.5px] text-muted">{c.city} · {c.views ? `${c.views} ${c.views === 1 ? "visita" : "visites"} al perfil` : "sense visites recents"}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">{c.following && <Badge tone="accent">T'està seguint</Badge>}{c.saved && <Badge tone="info">T'ha desat</Badge>}</div>
                      </div>
                      <span className="text-[11.5px] text-subtle">{fmtRelative(c.since)}</span>
                    </Link>
                  ))}
                  <p className="text-[12px] text-subtle md:col-span-2">Per privacitat dels clubs, no mostrem notes ni valoracions internes: només que hi ha interès.</p>
                </div>
              ),
            },
            {
              key: "desats", label: "Desats", count: favOffers.length + favClubs.length, content: favOffers.length + favClubs.length === 0 ? <EmptyState icon={<Star className="size-5" />} title="No tens res desat" /> : (
                <div className="grid gap-3 md:grid-cols-2">
                  {favOffers.map((o) => <Link key={o.id} href={`/jugador/oportunitats/${o.id}`} className="flex items-center gap-3 rounded-2xl border border-line p-4 hover:border-line-strong"><ClubCrest initials={o.initials} color={o.color} size={36} /><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-bold">{o.title}</p><p className="text-[12.5px] text-muted">{o.club_name}</p></div><Badge>{o.status === "oberta" ? "Oberta" : "Tancada"}</Badge></Link>)}
                  {favClubs.map((c) => <Link key={c.id} href={`/jugador/clubs/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-line p-4 hover:border-line-strong"><ClubCrest initials={c.initials} color={c.color_primary} size={36} /><div><p className="text-[14px] font-bold">{c.name}</p><p className="text-[12.5px] text-muted">Club · {c.city}</p></div></Link>)}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

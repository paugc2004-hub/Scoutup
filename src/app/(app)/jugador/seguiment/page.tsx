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

export const metadata = { title: "Seguimiento" };
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
      <PageHeader eyebrow="Tus procesos" title="Seguiment" subtitle="El estado de cada solicitud, los contactos de los clubes y quién se ha interesado por tu perfil." />
      <Card>
        <ClientTabs
          tabs={[
            {
              key: "sollicituds", label: "Solicitudes", count: apps.length, content: apps.length === 0 ? <EmptyState icon={<Route className="size-5" />} title="Todavía no te has inscrito a ninguna oportunidad" text="Cuando pulses «Me interesa», podrás seguir aquí cada paso del proceso." /> : (
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
              key: "contactes", label: "Contactos de clubes", count: reqs.length, content: reqs.length === 0 ? <EmptyState icon={<MessageSquare className="size-5" />} title="Ningún club te ha contactado todavía" /> : (
                <div className="space-y-3">
                  {reqs.filter((r) => r.status === "pendent").map((r) => <RequestCard key={r.id} r={r} />)}
                  {reqs.filter((r) => r.status !== "pendent").map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-4">
                      <ClubCrest initials={r.club_initials} color={r.club_color} size={36} />
                      <div className="min-w-0 flex-1"><p className="text-[14px] font-bold">{r.club_name}</p><p className="truncate text-[12.5px] text-muted">{r.message}</p></div>
                      <Badge tone={r.status === "acceptada" ? "accent" : r.status === "rebutjada" ? "danger" : r.status === "pendent_tutor" ? "violet" : "neutral"}>{CONTACT_STATUS_LABEL[r.status]}</Badge>
                      {r.conversation_id && <Link href={`/jugador/missatges?c=${r.conversation_id}`} className="text-[12.5px] font-semibold text-accent-ink hover:underline">Abrir conversación</Link>}
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: "interes", label: "Clubes interesados", count: interested.length, content: interested.length === 0 ? <EmptyState icon={<Eye className="size-5" />} title="Todavía ningún club ha visto tu perfil" text="Completa el perfil y añade un vídeo para aparecer más arriba en las búsquedas." /> : (
                <div className="grid gap-3 md:grid-cols-2">
                  {interested.map((c) => (
                    <Link key={c.club_id} href={`/jugador/clubs/${c.club_id}`} className="flex items-center gap-3 rounded-2xl border border-line p-4 transition hover:border-line-strong">
                      <ClubCrest initials={c.initials} color={c.color} size={42} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold">{c.club_name}</p>
                        <p className="text-[12.5px] text-muted">{c.city} · {c.views ? `${c.views} ${c.views === 1 ? "visita" : "visitas"} al perfil` : "sin visitas recientes"}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">{c.following && <Badge tone="accent">Te está siguiendo</Badge>}{c.saved && <Badge tone="info">Te ha guardado</Badge>}</div>
                      </div>
                      <span className="text-[11.5px] text-subtle">{fmtRelative(c.since)}</span>
                    </Link>
                  ))}
                  <p className="text-[12px] text-subtle md:col-span-2">Por privacidad de los clubes, no mostramos notas ni valoraciones internas: solo que hay interés.</p>
                </div>
              ),
            },
            {
              key: "desats", label: "Guardados", count: favOffers.length + favClubs.length, content: favOffers.length + favClubs.length === 0 ? <EmptyState icon={<Star className="size-5" />} title="No tienes nada guardado" /> : (
                <div className="grid gap-3 md:grid-cols-2">
                  {favOffers.map((o) => <Link key={o.id} href={`/jugador/oportunitats/${o.id}`} className="flex items-center gap-3 rounded-2xl border border-line p-4 hover:border-line-strong"><ClubCrest initials={o.initials} color={o.color} size={36} /><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-bold">{o.title}</p><p className="text-[12.5px] text-muted">{o.club_name}</p></div><Badge>{o.status === "oberta" ? "Abierta" : "Cerrada"}</Badge></Link>)}
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

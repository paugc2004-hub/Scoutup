import { requirePlayer } from "@/server/auth/session";
import { playerEvents } from "@/server/services/player-home";
import { PageHeader } from "@/components/ui";
import { CalendarView } from "@/components/calendar";
import { dayKey } from "@/lib/time";
import type { EventKind } from "@/lib/domain";

export const metadata = { title: "Calendari" };

export default async function PlayerCalendar({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const u = await requirePlayer();
  const sp = await searchParams;
  const today = dayKey(new Date());
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const events = playerEvents(u.player_id, new Date(Date.UTC(y, m - 1, 1) - 2 * 86400000).toISOString(), new Date(Date.UTC(y, m, 1) + 2 * 86400000).toISOString()).map((e) => ({
    id: e.id, kind: e.kind, title: e.title, starts_at: e.starts_at, ends_at: e.ends_at, location: e.location, notes: e.notes, team: null, related: null, relatedId: null, canDelete: true,
  }));
  const kinds: EventKind[] = ["partit", "entrenament", "prova", "reunio", "trucada", "recordatori"];
  return (
    <div>
      <PageHeader eyebrow="Agenda" title="El meu calendari" subtitle="Proves, trucades i reunions amb clubs apareixen automàticament. Afegeix-hi els teus partits, entrenaments i recordatoris." />
      <CalendarView events={events} month={month} basePath="/jugador/calendari" canCreate kinds={kinds} todayKey={today} />
    </div>
  );
}

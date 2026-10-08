import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { all } from "@/server/db/client";
import { EmptyState, PageHeader, cn } from "@/components/ui";
import { ActionButton } from "@/components/client/kit";
import { fmtDateTime, fmtRelative } from "@/lib/time";

export const metadata = { title: "Notificaciones" };

export default async function NotificationsPage() {
  const u = await requireUser();
  const items = all<{ id: string; kind: string; title: string; body: string | null; link: string | null; created_at: string; read_at: string | null }>("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", u.id);
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notificaciones" subtitle={unread ? `${unread} sin leer` : "Estás al día"} actions={unread ? <ActionButton url="/api/notifications/read" body={{}} ok="Todas marcadas como leídas" size="sm">Marcarlas todas como leídas</ActionButton> : undefined} />
      {items.length === 0 ? <EmptyState icon={<Bell className="size-5" />} title="No tienes notificaciones" /> : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {items.map((n) => {
            const inner = (
              <div className={cn("flex gap-3 px-5 py-4 transition hover:bg-bg", !n.read_at && "bg-accent-soft/35")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-accent-600")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[14px] leading-snug", !n.read_at ? "font-bold" : "font-semibold")}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-[13px] text-muted">{n.body}</p>}
                  <p className="mt-1 text-[11.5px] text-subtle" title={fmtDateTime(n.created_at)}>{fmtRelative(n.created_at)}</p>
                </div>
              </div>
            );
            return n.link ? <Link key={n.id} href={n.link} className="block">{inner}</Link> : <div key={n.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}

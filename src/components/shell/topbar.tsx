"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, BookOpenCheck, ChevronDown, Search, Sparkles, UserRound, Target, CalendarClock, MessageSquare, Heart, Settings2, Megaphone } from "lucide-react";
import { Avatar, cn } from "@/components/ui";
import { fmtRelative } from "@/lib/time";

type Notif = { id: string; kind: string; title: string; body: string | null; link: string | null; created_at: string; read_at: string | null };

const KIND_ICON: Record<string, React.ReactNode> = {
  match: <Target className="size-4" />,
  contact: <UserRound className="size-4" />,
  application: <Megaphone className="size-4" />,
  event: <CalendarClock className="size-4" />,
  message: <MessageSquare className="size-4" />,
  interest: <Heart className="size-4" />,
  profile: <Sparkles className="size-4" />,
  system: <Settings2 className="size-4" />,
};

function useOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && cb();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
}

export function NotificationBell({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[] | null>(null);
  const [count, setCount] = useState(unread);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useOutside(ref, () => setOpen(false));
  useEffect(() => setCount(unread), [unread]);
  const load = async () => {
    const r = await fetch("/api/notifications");
    if (r.ok) setItems((await r.json()).items);
  };
  const toggle = () => {
    setOpen((o) => !o);
    if (!open) load();
  };
  const readAll = async () => {
    await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setCount(0);
    setItems((x) => x?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? null);
    router.refresh();
  };
  const openOne = async (n: Notif) => {
    if (!n.read_at) {
      await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
      setCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
    router.refresh();
  };
  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative grid size-9 place-items-center rounded-xl text-ink-2 transition hover:bg-sunken" aria-label={`Notificaciones${count ? ` (${count} sin leer)` : ""}`}>
        <Bell className="size-[19px]" />
        {count > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white tabular ring-2 ring-surface">{count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[14px] font-bold">Notificaciones</p>
            <button onClick={readAll} className="text-[12.5px] font-semibold text-accent-ink hover:underline">Marcarlas todas como leídas</button>
          </div>
          <div className="scroll-thin max-h-[420px] overflow-y-auto">
            {items === null && <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>}
            {items?.length === 0 && <p className="px-4 py-10 text-center text-[13px] text-muted">No tienes notificaciones.</p>}
            {items?.map((n) => (
              <button key={n.id} onClick={() => openOne(n)} className={cn("flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-bg", !n.read_at && "bg-accent-soft/40")}>
                <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", !n.read_at ? "bg-accent-soft text-accent-ink" : "bg-sunken text-subtle")}>{KIND_ICON[n.kind] ?? <Bell className="size-4" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-snug text-ink">{n.title}</span>
                  {n.body && <span className="mt-0.5 block truncate text-[12.5px] text-muted">{n.body}</span>}
                  <span className="mt-1 block text-[11.5px] text-subtle">{fmtRelative(n.created_at)}</span>
                </span>
                {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-accent-600" />}
              </button>
            ))}
          </div>
          <Link href="/notificacions" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-[13px] font-semibold text-ink hover:bg-bg">
            Ver todas las notificaciones
          </Link>
        </div>
      )}
    </div>
  );
}

export function UserMenu({ name, title, hue, email }: { name: string; title: string | null; hue: number; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/entrar";
  };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-sunken">
        <Avatar initials={initials} hue={hue} size={32} />
        <span className="hidden text-left md:block">
          <span className="block max-w-[160px] truncate text-[13px] font-bold leading-tight">{name}</span>
          <span className="block max-w-[160px] truncate text-[11.5px] leading-tight text-muted">{title}</span>
        </span>
        <ChevronDown className="hidden size-4 text-subtle md:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop animate-pop">
          <div className="px-3 py-2.5">
            <p className="truncate text-[13.5px] font-bold">{name}</p>
            <p className="truncate text-[12px] text-muted">{email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link href="/demo" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium hover:bg-sunken">
            <BookOpenCheck className="size-4 text-subtle" /> Guía de la demo y cambio de rol
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium text-danger hover:bg-danger-soft">
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export function TopSearch({ action, placeholder }: { action: string; placeholder: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`${action}?q=${encodeURIComponent(q)}`);
      }}
      className="relative hidden w-full max-w-md md:block"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-[13.5px] placeholder:text-subtle focus:border-accent-600 focus:bg-surface focus:outline-none focus:shadow-glow" />
    </form>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Sparkles, Search, Megaphone, KanbanSquare, MessagesSquare, CalendarDays, Binoculars, Shirt, Trophy,
  Building2, Settings, Columns3, Compass, Landmark, Route, UserRound, ShieldCheck, Bell, Menu, X, Users,
} from "lucide-react";
import { cn } from "@/components/ui";

const ICONS = {
  dashboard: LayoutDashboard, sparkles: Sparkles, search: Search, megaphone: Megaphone, kanban: KanbanSquare, messages: MessagesSquare,
  calendar: CalendarDays, binoculars: Binoculars, shirt: Shirt, trophy: Trophy, building: Building2, settings: Settings, compare: Columns3,
  compass: Compass, landmark: Landmark, route: Route, user: UserRound, shield: ShieldCheck, bell: Bell, users: Users,
};
export type NavIcon = keyof typeof ICONS;
export type NavItem = { href: string; label: string; icon: NavIcon; badge?: number; exact?: boolean; section?: string; mobile?: boolean };

function isActive(path: string, it: NavItem) {
  return it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/");
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const path = usePathname();
  let lastSection: string | undefined;
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        const active = isActive(path, it);
        const header = it.section && it.section !== lastSection ? it.section : null;
        lastSection = it.section ?? lastSection;
        return (
          <div key={it.href}>
            {header && <p className="mb-1.5 mt-5 px-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-night-muted">{header}</p>}
            <Link
              href={it.href}
              onClick={onNavigate}
              className={cn(
                "group flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium transition",
                active ? "bg-night-3 text-white" : "text-night-text hover:bg-night-2 hover:text-white",
              )}
            >
              <Icon className={cn("size-[17px] shrink-0", active ? "text-accent" : "text-night-muted group-hover:text-night-text")} strokeWidth={2} />
              <span className="truncate">{it.label}</span>
              {!!it.badge && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-night tabular">{it.badge}</span>}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ items, header, footer }: { items: NavItem[]; header: ReactNode; footer?: ReactNode }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-night-line bg-night lg:flex">
      <div className="px-4 pb-2 pt-5">{header}</div>
      <div className="scroll-thin flex-1 overflow-y-auto px-3 pb-4">
        <NavList items={items} />
      </div>
      {footer && <div className="border-t border-night-line p-3">{footer}</div>}
    </aside>
  );
}

export function MobileNav({ items, header, footer }: { items: NavItem[]; header: ReactNode; footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <button onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-lg text-ink hover:bg-sunken lg:hidden" aria-label="Obrir menú">
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-night/60 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-night shadow-pop animate-rise">
            <div className="flex items-center justify-between px-4 pb-2 pt-5">
              {header}
              <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-night-text hover:bg-night-2" aria-label="Tancar menú">
                <X className="size-4" />
              </button>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-3 pb-4">
              <NavList items={items} onNavigate={() => setOpen(false)} />
            </div>
            {footer && <div className="border-t border-night-line p-3">{footer}</div>}
          </div>
        </div>
      )}
    </>
  );
}

/** Barra inferior per a mòbil (experiència del jugador). */
export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const shown = items.filter((i) => i.mobile).slice(0, 5);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${shown.length}, 1fr)` }}>
      {shown.map((it) => {
        const Icon = ICONS[it.icon];
        const active = isActive(path, it);
        return (
          <Link key={it.href} href={it.href} className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold", active ? "text-ink" : "text-subtle")}>
            <Icon className={cn("size-5", active && "text-accent-ink")} />
            {it.label.split(" ")[0]}
            {!!it.badge && <span className="absolute right-[calc(50%-18px)] top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-night">{it.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { Sidebar, MobileNav, BottomNav } from "@/components/shell/sidebar";
import type { NavItem } from "@/components/shell/sidebar";
import { NotificationBell, UserMenu, TopSearch } from "@/components/shell/topbar";
import { DemoGuide } from "@/components/shell/demo-guide";
import { ClubCrest } from "@/components/ui";
import type { SessionUser } from "@/server/auth/session";
import { get } from "@/server/db/client";

export function Logo({ dark = true, className }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className ?? ""}`} aria-label="ScoutUp — inici">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#00E87A" />
        <path d="M9 19.5c0 2.3 2.4 3.8 6.6 3.8 4.4 0 7.2-1.8 7.2-5 0-2.9-2.2-4-6.1-4.7-2.6-.5-3.4-.9-3.4-1.8 0-.9 1-1.5 2.7-1.5 1.8 0 2.9.7 3.2 1.9h3.4c-.3-3-2.9-4.9-6.6-4.9-4 0-6.5 1.9-6.5 4.8 0 2.8 2.1 4 6 4.7 2.7.5 3.5.9 3.5 1.9 0 1-1.1 1.7-3.1 1.7-2.1 0-3.4-.8-3.6-2.1H9Z" fill="#0B0D13" />
      </svg>
      <span className={`text-[17px] font-extrabold tracking-[-0.03em] ${dark ? "text-white" : "text-ink"}`}>
        Scout<span className="text-accent-600">Up</span>
      </span>
    </Link>
  );
}

export function AppShell({ user, items, children, search, bottomNav, clubId }: { user: SessionUser; items: NavItem[]; children: ReactNode; search?: { action: string; placeholder: string }; bottomNav?: boolean; clubId?: string | null }) {
  const unread = get<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL", user.id)?.n ?? 0;
  const club = clubId ? get<{ name: string; initials: string; color_primary: string; verified: number }>("SELECT name, initials, color_primary, verified FROM clubs WHERE id = ?", clubId) : null;
  const header = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="rounded-md border border-night-line px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-night-muted">Demo</span>
      </div>
      {club && (
        <div className="flex items-center gap-2.5 rounded-xl border border-night-line bg-night-2 p-2.5">
          <ClubCrest initials={club.initials} color={club.color_primary} size={34} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-white">{club.name}</p>
            <p className="truncate text-[11.5px] text-night-muted">{user.role === "director" ? "Direcció esportiva · accés complet" : `${user.title ?? "Entrenador"} · accés d'equip`}</p>
          </div>
        </div>
      )}
    </div>
  );
  const footer = (
    <div className="rounded-xl bg-night-2 p-3">
      <p className="text-[11.5px] leading-relaxed text-night-muted">Totes les dades són <span className="font-semibold text-night-text">fictícies</span>. Cap connexió amb la FCF ni amb fonts externes.</p>
    </div>
  );
  return (
    <div className="min-h-dvh">
      <Sidebar items={items} header={header} footer={footer} />
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md md:px-6">
          <MobileNav items={items} header={<Logo />} footer={footer} />
          <div className="lg:hidden">
            <Logo dark={false} />
          </div>
          {search && <TopSearch action={search.action} placeholder={search.placeholder} />}
          <div className="ml-auto flex items-center gap-1.5">
            <Link href="/demo" className="mr-1 hidden items-center gap-1.5 rounded-full border border-[#fde68a] bg-warn-soft px-2.5 py-1 text-[11.5px] font-bold text-warn sm:inline-flex" title="Aquesta és una demo amb dades fictícies">
              <span className="size-1.5 rounded-full bg-warn" /> Mode demo
            </Link>
            <NotificationBell unread={unread} />
            <UserMenu name={user.name} title={user.title} hue={user.avatar_hue} email={user.email} />
          </div>
        </header>
        <main className={`mx-auto w-full max-w-[1320px] px-4 py-6 md:px-8 md:py-8 ${bottomNav ? "pb-24 lg:pb-8" : ""}`}>{children}</main>
      </div>
      {bottomNav && <BottomNav items={items} />}
      <DemoGuide role={user.role} />
    </div>
  );
}

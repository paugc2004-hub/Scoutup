import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/server/auth/session";
import { navFor } from "@/server/nav";

export const dynamic = "force-dynamic";

export default async function NotifLayout({ children }: { children: ReactNode }) {
  const u = await requireUser();
  const nav = navFor(u);
  return <AppShell user={u} items={nav.items} clubId={u.club_id} search={nav.search} bottomNav={nav.bottomNav}>{children}</AppShell>;
}

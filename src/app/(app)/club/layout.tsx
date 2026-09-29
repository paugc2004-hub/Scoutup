import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { CompareTray } from "@/components/club/compare-tray";
import { requireClubStaff } from "@/server/auth/session";
import { navFor } from "@/server/nav";

export const dynamic = "force-dynamic";

export default async function ClubLayout({ children }: { children: ReactNode }) {
  const u = await requireClubStaff();
  const nav = navFor(u);
  return (
    <AppShell user={u} items={nav.items} clubId={u.club_id} search={nav.search}>
      {children}
      <CompareTray />
    </AppShell>
  );
}

import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { requirePlayer } from "@/server/auth/session";
import { navFor } from "@/server/nav";

export const dynamic = "force-dynamic";

export default async function PlayerLayout({ children }: { children: ReactNode }) {
  const u = await requirePlayer();
  const nav = navFor(u);
  return <AppShell user={u} items={nav.items} bottomNav>{children}</AppShell>;
}

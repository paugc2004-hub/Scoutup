import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/server/auth/session";
import { navFor } from "@/server/nav";

export const dynamic = "force-dynamic";

export default async function TutorLayout({ children }: { children: ReactNode }) {
  const u = await requireUser(["guardian"]);
  return <AppShell user={u} items={navFor(u).items}>{children}</AppShell>;
}

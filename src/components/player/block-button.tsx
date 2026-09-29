"use client";
import type { ReactNode } from "react";
import { ActionButton } from "@/components/client/kit";

export function BlockButton({ clubId, blocked, icon }: { clubId: string; blocked: boolean; icon?: ReactNode }) {
  return blocked ? (
    <ActionButton url="/api/blocks" body={{ clubId, blocked: false }} ok="Club desbloquejat" size="sm" variant="secondary" icon={icon}>Desbloquejar</ActionButton>
  ) : (
    <ActionButton url="/api/blocks" body={{ clubId, blocked: true }} ok="Club bloquejat" okSub="No podrà veure el teu perfil ni contactar-te." size="sm" variant="ghost" icon={icon} confirm="Si bloqueges aquest club, no podrà veure el teu perfil ni enviar-te sol·licituds. Ho pots desfer quan vulguis.">Bloquejar</ActionButton>
  );
}

"use client";
import type { ReactNode } from "react";
import { ActionButton } from "@/components/client/kit";

export function BlockButton({ clubId, blocked, icon }: { clubId: string; blocked: boolean; icon?: ReactNode }) {
  return blocked ? (
    <ActionButton url="/api/blocks" body={{ clubId, blocked: false }} ok="Club desbloqueado" size="sm" variant="secondary" icon={icon}>Desbloquear</ActionButton>
  ) : (
    <ActionButton url="/api/blocks" body={{ clubId, blocked: true }} ok="Club bloqueado" okSub="No podrá ver tu perfil ni contactarte." size="sm" variant="ghost" icon={icon} confirm="Si bloqueas a este club, no podrá ver tu perfil ni enviarte solicitudes. Puedes deshacerlo cuando quieras.">Bloquear</ActionButton>
  );
}

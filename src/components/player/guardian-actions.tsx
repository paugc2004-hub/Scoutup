"use client";
import { useState } from "react";
import { Check, X, ShieldOff } from "lucide-react";
import { ActionButton, Chip, Toggle, useApi } from "@/components/client/kit";

export function GuardianDecision({ id }: { id: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton url={`/api/contacts/${id}`} body={{ action: "accept" }} ok="Contacto autorizado" okSub="Se ha abierto la conversación. Podrás leerla en cualquier momento." variant="dark" size="sm" icon={<Check className="size-3.5" />}>Autorizar</ActionButton>
      <ActionButton url={`/api/contacts/${id}`} body={{ action: "reject" }} ok="Contacto denegado" variant="ghost" size="sm" icon={<X className="size-3.5" />}>Denegar</ActionButton>
    </div>
  );
}

export function ConsentToggle({ consent }: { consent: boolean }) {
  const [on, setOn] = useState(consent);
  const { call } = useApi();
  return <Toggle checked={on} onChange={async (v) => { const d = await call("/api/guardian/consent", { body: { consent: v }, ok: v ? "Perfil visible para clubes verificados" : "Perfil oculto para todos los clubes" }); if (d) setOn(v); }} label="Permitir que los clubes verificados vean el perfil" hint="Si lo desactivas, el perfil desaparece de todas las búsquedas al instante." />;
}

export function GuardianPrivacy({ profile, contact, showStats }: { profile: string; contact: string; showStats: boolean }) {
  const [p, setP] = useState({ profile, contact, showStats });
  const { call } = useApi();
  const save = async (next: typeof p) => { setP(next); await call("/api/guardian/privacy", { body: next, ok: "Preferencias guardadas" }); };
  return (
    <div className="space-y-4">
      <div><p className="mb-2 text-[12.5px] font-semibold">Visibilidad del perfil</p><div className="flex flex-wrap gap-2">{[["verificats", "Clubes verificados"], ["contactats", "Solo clubes autorizados"], ["ocult", "Oculto"]].map(([k, l]) => <Chip key={k} active={p.profile === k} onClick={() => save({ ...p, profile: k })}>{l}</Chip>)}</div></div>
      <div><p className="mb-2 text-[12.5px] font-semibold">Solicitudes de contacto</p><div className="flex flex-wrap gap-2">{[["verificats", "De clubes verificados (con mi autorización)"], ["ningu", "Ninguno"]].map(([k, l]) => <Chip key={k} active={p.contact === k} onClick={() => save({ ...p, contact: k })}>{l}</Chip>)}</div></div>
      <Toggle checked={p.showStats} onChange={(v) => save({ ...p, showStats: v })} label="Mostrar estadísticas" />
    </div>
  );
}

export function RevokeButton({ clubId, clubName }: { clubId: string; clubName: string }) {
  const { pending } = useApi();
  return <ActionButton url="/api/guardian/revoke" body={{ clubId }} ok={`Autorización revocada a ${clubName}`} okSub="La conversación se cierra y el club ya no puede ver el perfil." variant="danger" size="sm" icon={<ShieldOff className="size-3.5" />} confirm={`¿Revocar la autorización a ${clubName}? El club no podrá volver a ver el perfil ni escribir.`}>{pending ? "…" : "Revocar"}</ActionButton>;
}

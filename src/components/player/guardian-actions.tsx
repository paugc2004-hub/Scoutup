"use client";
import { useState } from "react";
import { Check, X, ShieldOff } from "lucide-react";
import { ActionButton, Chip, Toggle, useApi } from "@/components/client/kit";

export function GuardianDecision({ id }: { id: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton url={`/api/contacts/${id}`} body={{ action: "accept" }} ok="Contacte autoritzat" okSub="S'ha obert la conversa. Podràs llegir-la en qualsevol moment." variant="dark" size="sm" icon={<Check className="size-3.5" />}>Autoritzar</ActionButton>
      <ActionButton url={`/api/contacts/${id}`} body={{ action: "reject" }} ok="Contacte denegat" variant="ghost" size="sm" icon={<X className="size-3.5" />}>Denegar</ActionButton>
    </div>
  );
}

export function ConsentToggle({ consent }: { consent: boolean }) {
  const [on, setOn] = useState(consent);
  const { call } = useApi();
  return <Toggle checked={on} onChange={async (v) => { const d = await call("/api/guardian/consent", { body: { consent: v }, ok: v ? "Perfil visible per a clubs verificats" : "Perfil ocult per a tots els clubs" }); if (d) setOn(v); }} label="Permetre que clubs verificats vegin el perfil" hint="Si ho desactives, el perfil desapareix de totes les cerques a l'instant." />;
}

export function GuardianPrivacy({ profile, contact, showStats }: { profile: string; contact: string; showStats: boolean }) {
  const [p, setP] = useState({ profile, contact, showStats });
  const { call } = useApi();
  const save = async (next: typeof p) => { setP(next); await call("/api/guardian/privacy", { body: next, ok: "Preferències guardades" }); };
  return (
    <div className="space-y-4">
      <div><p className="mb-2 text-[12.5px] font-semibold">Visibilitat del perfil</p><div className="flex flex-wrap gap-2">{[["verificats", "Clubs verificats"], ["contactats", "Només clubs autoritzats"], ["ocult", "Ocult"]].map(([k, l]) => <Chip key={k} active={p.profile === k} onClick={() => save({ ...p, profile: k })}>{l}</Chip>)}</div></div>
      <div><p className="mb-2 text-[12.5px] font-semibold">Sol·licituds de contacte</p><div className="flex flex-wrap gap-2">{[["verificats", "De clubs verificats (amb la meva autorització)"], ["ningu", "Cap"]].map(([k, l]) => <Chip key={k} active={p.contact === k} onClick={() => save({ ...p, contact: k })}>{l}</Chip>)}</div></div>
      <Toggle checked={p.showStats} onChange={(v) => save({ ...p, showStats: v })} label="Mostrar estadístiques" />
    </div>
  );
}

export function RevokeButton({ clubId, clubName }: { clubId: string; clubName: string }) {
  const { pending } = useApi();
  return <ActionButton url="/api/guardian/revoke" body={{ clubId }} ok={`Autorització revocada a ${clubName}`} okSub="La conversa es tanca i el club ja no pot veure el perfil." variant="danger" size="sm" icon={<ShieldOff className="size-3.5" />} confirm={`Revocar l'autorització a ${clubName}? El club no podrà tornar a veure el perfil ni escriure.`}>{pending ? "…" : "Revocar"}</ActionButton>;
}

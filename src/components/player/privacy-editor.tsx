"use client";
import { useState } from "react";
import { Button, useApi } from "@/components/client/kit";
import { PrivacyFields } from "@/components/player/profile-wizard";
import type { Privacy } from "@/lib/domain";

export function PrivacyEditor({ initial, minor }: { initial: Privacy; minor: boolean }) {
  const [p, setP] = useState(initial);
  const { call, pending } = useApi();
  const dirty = JSON.stringify(p) !== JSON.stringify(initial);
  return (
    <div>
      <PrivacyFields privacy={p} minor={minor} onChange={setP} />
      <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
        {dirty && <span className="text-[12.5px] text-muted">Tienes cambios sin guardar</span>}
        <Button variant="dark" loading={pending} disabled={!dirty} onClick={() => call("/api/me/privacy", { method: "PATCH", body: { privacy: p }, ok: "Privacidad actualizada", okSub: "Se aplica al instante a todas las búsquedas." })}>Guardar</Button>
      </div>
    </div>
  );
}

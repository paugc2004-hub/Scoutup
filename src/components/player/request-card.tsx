"use client";
import { useRouter } from "next/navigation";
import { Check, X, ShieldCheck } from "lucide-react";
import { Button, useApi } from "@/components/client/kit";
import { ClubCrest } from "@/components/ui";
import { fmtRelative } from "@/lib/time";

export function RequestCard({ r, compact }: { r: { id: string; club_name: string; club_initials: string; club_color: string; club_verified: number; club_city: string; message: string; created_at: string; team_name: string | null; from_name: string }; compact?: boolean }) {
  const { call, pending } = useApi();
  const router = useRouter();
  return (
    <div className="rounded-2xl border border-accent-soft-2 bg-accent-soft/40 p-4">
      <div className="flex items-start gap-3">
        <ClubCrest initials={r.club_initials} color={r.club_color} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold">{r.club_name} vol parlar amb tu {r.club_verified ? <ShieldCheck className="inline size-4 text-accent-ink" aria-label="Club verificado" /> : null}</p>
          <p className="text-[12px] text-muted">{r.from_name}{r.team_name ? ` · ${r.team_name}` : ""} · {r.club_city} · {fmtRelative(r.created_at)}</p>
          {!compact && <p className="mt-2 rounded-xl bg-surface p-3 text-[13.5px] leading-relaxed">{r.message}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="dark" size="sm" loading={pending} icon={<Check className="size-3.5" />} onClick={async () => { const d = await call<{ conversationId: string }>(`/api/contacts/${r.id}`, { body: { action: "accept" }, ok: "Solicitud aceptada", okSub: "Se ha abierto una conversación con el club." }); if (d?.conversationId) router.push(`/jugador/missatges?c=${d.conversationId}`); }}>Aceptar y abrir conversación</Button>
        <Button variant="ghost" size="sm" loading={pending} icon={<X className="size-3.5" />} onClick={() => call(`/api/contacts/${r.id}`, { body: { action: "reject" }, ok: "Solicitud rechazada", okSub: "El club no podrá escribirte." })}>Ahora no</Button>
        <span className="ml-auto text-[11.5px] text-subtle">Hasta que aceptes, el club no puede escribirte.</span>
      </div>
    </div>
  );
}

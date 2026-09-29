"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Chip, Modal, Textarea, useApi } from "@/components/client/kit";

const REASONS = ["Informació falsa o enganyosa", "Demana dades personals fora de ScoutUp", "Comportament inadequat", "Suplantació d'un club", "Altres"];

export function ReportButton({ targetType, targetId, label = "Denunciar", icon }: { targetType: "club" | "offer" | "message" | "player"; targetId: string; label?: string; icon?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const { call, pending } = useApi();
  return (
    <>
      <Button size="sm" variant="ghost" icon={icon} onClick={() => setOpen(true)} className="!text-muted">{label}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Denunciar" subtitle="L'equip de moderació revisarà el cas. A la demo, la revisió és simulada." size="sm"
        footer={<><Button onClick={() => setOpen(false)}>Cancel·lar</Button><Button variant="danger" loading={pending} onClick={async () => { const d = await call("/api/reports", { body: { target_type: targetType, target_id: targetId, reason, details }, ok: "Denúncia enviada", okSub: "Gràcies: la revisarem." }); if (d) setOpen(false); }}>Enviar denúncia</Button></>}>
        <div className="flex flex-wrap gap-2">{REASONS.map((r) => <Chip key={r} active={reason === r} onClick={() => setReason(r)}>{r}</Chip>)}</div>
        <Textarea className="mt-4" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Explica breument què ha passat (opcional)" />
      </Modal>
    </>
  );
}

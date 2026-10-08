"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Chip, Modal, Textarea, useApi } from "@/components/client/kit";

const REASONS = ["Información falsa o engañosa", "Pide datos personales fuera de ScoutUp", "Comportamiento inadecuado", "Suplantación de un club", "Otros"];

export function ReportButton({ targetType, targetId, label = "Denunciar", icon }: { targetType: "club" | "offer" | "message" | "player"; targetId: string; label?: string; icon?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const { call, pending } = useApi();
  return (
    <>
      <Button size="sm" variant="ghost" icon={icon} onClick={() => setOpen(true)} className="!text-muted">{label}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Denunciar" subtitle="El equipo de moderación revisará el caso. En la demo, la revisión es simulada." size="sm"
        footer={<><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="danger" loading={pending} onClick={async () => { const d = await call("/api/reports", { body: { target_type: targetType, target_id: targetId, reason, details }, ok: "Denuncia enviada", okSub: "Gracias: la revisaremos." }); if (d) setOpen(false); }}>Enviar denuncia</Button></>}>
        <div className="flex flex-wrap gap-2">{REASONS.map((r) => <Chip key={r} active={reason === r} onClick={() => setReason(r)}>{r}</Chip>)}</div>
        <Textarea className="mt-4" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Explica brevemente qué ha pasado (opcional)" />
      </Modal>
    </>
  );
}

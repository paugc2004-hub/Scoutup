"use client";
import { useState } from "react";
import { PenLine } from "lucide-react";
import { Button, Field, Input, Modal, Textarea, useApi } from "@/components/client/kit";

type Fields = { description: string; history: string; philosophy: string; values_text: string; objectives: string; sporting_model: string; website: string; instagram: string; email: string; phone: string; office_hours: string; color_primary: string };

export function ClubEditButton({ initial }: { initial: Fields }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(initial);
  const { call, pending } = useApi();
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <>
      <Button variant="dark" icon={<PenLine className="size-4" />} onClick={() => setOpen(true)}>Editar perfil</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar el perfil del club" subtitle="Esta información la ven los jugadores cuando descubren el club." size="xl"
        footer={<><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="dark" loading={pending} onClick={async () => { const d = await call("/api/club", { method: "PATCH", body: f, ok: "Perfil del club actualizado" }); if (d) setOpen(false); }}>Guardar cambios</Button></>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Descripción" className="md:col-span-2"><Textarea rows={3} value={f.description} onChange={set("description")} /></Field>
          <Field label="Historia"><Textarea rows={4} value={f.history} onChange={set("history")} /></Field>
          <Field label="Filosofía"><Textarea rows={4} value={f.philosophy} onChange={set("philosophy")} /></Field>
          <Field label="Modelo deportivo"><Textarea rows={3} value={f.sporting_model} onChange={set("sporting_model")} /></Field>
          <Field label="Objetivos"><Textarea rows={3} value={f.objectives} onChange={set("objectives")} /></Field>
          <Field label="Valores" hint="Separados por «·»" className="md:col-span-2"><Input value={f.values_text} onChange={set("values_text")} /></Field>
          <Field label="Web"><Input value={f.website} onChange={set("website")} /></Field>
          <Field label="Instagram"><Input value={f.instagram} onChange={set("instagram")} /></Field>
          <Field label="Correo"><Input value={f.email} onChange={set("email")} /></Field>
          <Field label="Teléfono"><Input value={f.phone} onChange={set("phone")} /></Field>
          <Field label="Horario de oficina"><Input value={f.office_hours} onChange={set("office_hours")} /></Field>
          <Field label="Color principal"><div className="flex items-center gap-2"><input type="color" value={f.color_primary} onChange={set("color_primary")} className="h-10 w-14 rounded-lg border border-line" /><Input value={f.color_primary} onChange={set("color_primary")} /></div></Field>
        </div>
      </Modal>
    </>
  );
}

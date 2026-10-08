"use client";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { Button, Field, Input, Modal, Select, useApi } from "@/components/client/kit";
import { CLUB_ROLES, CLUB_ROLE_LABEL } from "@/lib/permissions";
import type { ClubRole } from "@/lib/permissions";

export type StaffItem = { id: string; name: string; email: string; role: ClubRole; status: "active" | "disabled"; title: string | null; team_id: string | null; team_name: string | null; avatar_hue: number; lastAccess: string };
type Team = { id: string; name: string };

const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/** Lista de usuarios del club. Si `editable`, la dirección puede cambiar rol, equipo y estado (el servidor lo vuelve a validar). */
export function StaffManager({ staff, teams, meId, editable }: { staff: StaffItem[]; teams: Team[]; meId: string; editable: boolean }) {
  const { call, pending } = useApi();
  const [busyId, setBusyId] = useState<string | null>(null);
  const save = async (s: StaffItem, patch: Partial<Pick<StaffItem, "role" | "team_id" | "status">>) => {
    setBusyId(s.id);
    const role = patch.role ?? s.role;
    const body = { ...patch, ...(role === "coach" && !(patch.team_id ?? s.team_id) ? { team_id: teams[0]?.id ?? null } : {}) };
    await call(`/api/club/users/${s.id}`, { method: "PATCH", body, ok: "Permisos actualizados", okSub: "Se han cerrado las sesiones abiertas de este usuario." });
    setBusyId(null);
  };
  return (
    <div className="divide-y divide-line">
      {staff.map((s) => {
        const me = s.id === meId;
        const disabled = !editable || me || (pending && busyId === s.id);
        return (
          <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
            <Avatar initials={initials(s.name)} hue={s.avatar_hue} size={38} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold">
                {s.name} {me && <span className="font-normal text-muted">(tú)</span>} {s.status === "disabled" && <Badge tone="danger">Desactivado</Badge>}
              </p>
              <p className="truncate text-[12px] text-muted">{s.email} · {s.lastAccess}</p>
            </div>
            {editable && !me ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <label className="sr-only" htmlFor={`role-${s.id}`}>Rol de {s.name}</label>
                <div className="w-40">
                  <Select id={`role-${s.id}`} value={s.role} disabled={disabled} onChange={(e) => save(s, { role: e.target.value as ClubRole })} className="h-9 text-[13px]">
                    {CLUB_ROLES.map((r) => <option key={r} value={r}>{CLUB_ROLE_LABEL[r]}</option>)}
                  </Select>
                </div>
                {s.role === "coach" && (
                  <>
                    <label className="sr-only" htmlFor={`team-${s.id}`}>Equipo de {s.name}</label>
                    <div className="w-36">
                      <Select id={`team-${s.id}`} value={s.team_id ?? ""} disabled={disabled} onChange={(e) => save(s, { team_id: e.target.value })} className="h-9 text-[13px]">
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                    </div>
                  </>
                )}
                <Button size="sm" variant={s.status === "active" ? "ghost" : "secondary"} disabled={disabled} onClick={() => save(s, { status: s.status === "active" ? "disabled" : "active" })}>
                  {s.status === "active" ? "Desactivar" : "Reactivar"}
                </Button>
              </div>
            ) : (
              <Badge tone={s.role === "director" ? "dark" : s.role === "coordinator" ? "violet" : "info"}>
                {s.role === "coach" ? `Entrenador · ${s.team_name ?? "sin equipo"}` : CLUB_ROLE_LABEL[s.role]}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function InviteStaffButton({ teams }: { teams: Team[] }) {
  const { call, pending } = useApi();
  const [open, setOpen] = useState(false);
  const [d, setD] = useState({ name: "", email: "", role: "coach" as ClubRole, team_id: teams[0]?.id ?? "" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await call("/api/club/users", { body: { ...d, team_id: d.role === "coach" ? d.team_id : null }, ok: "Usuario añadido", okSub: "Invitación pendiente: el envío de correos no está implementado en la demo." });
    if (r) {
      setOpen(false);
      setD({ name: "", email: "", role: "coach", team_id: teams[0]?.id ?? "" });
    }
  };
  return (
    <>
      <Button size="sm" icon={<UserPlus className="size-3.5" />} onClick={() => setOpen(true)}>Invitar usuario</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Invitar a un usuario del club" subtitle="Tendrá acceso según el rol que elijas. Puedes cambiarlo cuando quieras.">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre y apellidos"><Input required minLength={3} maxLength={80} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <Field label="Correo electrónico"><Input type="email" required maxLength={254} value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rol">
              <Select value={d.role} onChange={(e) => setD({ ...d, role: e.target.value as ClubRole })}>
                {CLUB_ROLES.map((r) => <option key={r} value={r}>{CLUB_ROLE_LABEL[r]}</option>)}
              </Select>
            </Field>
            {d.role === "coach" && (
              <Field label="Equipo">
                <Select value={d.team_id} onChange={(e) => setD({ ...d, team_id: e.target.value })}>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
          <p className="rounded-xl bg-sunken px-3 py-2 text-[12px] text-muted">El envío del correo de invitación está <strong>pendiente de definir</strong>. En la demo, el usuario se crea pero no puede iniciar sesión.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="dark" loading={pending}>Añadir usuario</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

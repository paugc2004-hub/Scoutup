import { Check, X, ShieldCheck, Database, KeyRound, ScrollText } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { can } from "@/server/services/access";
import { club as getClub, clubTeams, staffUsers } from "@/server/services/club";
import { clubAudit } from "@/server/services/users";
import { competitionProvider } from "@/server/competition/provider";
import { Badge, Card, CardHeader, EmptyState, PageHeader, cn } from "@/components/ui";
import { ResetDemoButton } from "@/components/client/demo-login";
import { InviteStaffButton, StaffManager } from "@/components/club/staff-manager";
import { CLUB_ROLES, CLUB_ROLE_LABEL, PERMISSIONS, PERMISSION_LABEL, ROLE_PERMISSIONS, ROLE_SCOPE } from "@/lib/permissions";
import { fmtRelative } from "@/lib/time";

export const metadata = { title: "Usuarios y permisos" };

const ACTION_LABEL: Record<string, string> = {
  "auth.login": "Inicio de sesión",
  "users.update": "Cambio de rol o estado",
  "users.invite": "Usuario invitado",
  "club.edit": "Perfil del club editado",
  "club.register": "Club registrado",
  "contact.request": "Solicitud de contacto",
  "opportunity.create": "Oportunidad creada",
  "opportunity.status": "Estado de oportunidad",
  "demo.reset": "Datos de demo restaurados",
  "pipeline.add": "Intento de añadir al pipeline",
  "pipeline.interaction": "Intento de registrar interacción",
  "note.add": "Intento de crear una nota",
  "evaluation.save": "Intento de evaluar",
  "report.create": "Intento de crear un informe",
  "player.save": "Intento de guardar un jugador",
  "player.access": "Intento de acceso a un jugador",
  "event.create": "Intento de crear un evento",
};
const actionLabel = (a: string) => ACTION_LABEL[a] ?? (a.startsWith("permission.") ? "Acción no permitida para el rol" : a.replace(/\./g, " · "));

export default async function SettingsPage() {
  const u = await requireClubStaff();
  const club = getClub(u.club_id);
  const manage = can.manageUsers(u);
  const staff = staffUsers(u.club_id).map((s) => ({ ...s, lastAccess: s.last_login_at ? `Último acceso ${fmtRelative(s.last_login_at)}` : s.is_demo_login ? "Usuario de demo" : "Invitación pendiente" }));
  const teams = clubTeams(u.club_id).map((t) => ({ id: t.id, name: t.name }));
  const auditRows = can.viewAudit(u) ? clubAudit(u, 25) : [];
  const provider = competitionProvider();
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={club.name} title={manage ? "Usuarios y permisos" : "Permisos"} subtitle="Cada rol ve y hace solo lo que le corresponde. Las comprobaciones se hacen en el servidor, no solo en la interfaz." />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Usuarios del club" subtitle={`${staff.length} personas · ${manage ? "puedes cambiar roles, equipos y acceso" : "solo la dirección deportiva puede modificarlos"}`} action={manage ? <InviteStaffButton teams={teams} /> : undefined} />
            <StaffManager staff={staff} teams={teams} meId={u.id} editable={manage} />
          </Card>
          <Card>
            <CardHeader title="Matriz de permisos" subtitle="Generada a partir del mismo RBAC que aplica el servidor." icon={<KeyRound className="size-4" />} />
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <caption className="sr-only">Permisos por rol</caption>
                <thead>
                  <tr className="border-b border-line text-left text-[11.5px] font-bold uppercase tracking-wider text-subtle">
                    <th scope="col" className="py-2">Acción</th>
                    {CLUB_ROLES.map((r) => <th key={r} scope="col" className="py-2 text-center">{CLUB_ROLE_LABEL[r]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((p) => (
                    <tr key={p} className="border-b border-line last:border-0">
                      <th scope="row" className="py-2.5 pr-3 text-left font-normal">{PERMISSION_LABEL[p]}</th>
                      {CLUB_ROLES.map((r) => {
                        const ok = ROLE_PERMISSIONS[r].has(p);
                        return (
                          <td key={r} className="py-2.5 text-center">
                            {ok ? <Check className="mx-auto size-4 text-accent-600" aria-label="Sí" /> : <X className="mx-auto size-4 text-danger" aria-label="No" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="py-2.5 pr-3 text-left font-semibold">Equipos visibles</th>
                    {CLUB_ROLES.map((r) => <td key={r} className="py-2.5 text-center text-[12px] text-muted">{ROLE_SCOPE[r] === "club" ? "Todos" : "Solo el suyo"}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
          {can.viewAudit(u) && (
            <Card>
              <CardHeader title="Registro de auditoría" subtitle="Acciones sensibles e intentos no permitidos. Sin contraseñas ni contenido privado." icon={<ScrollText className="size-4" />} />
              {auditRows.length === 0 ? (
                <EmptyState title="Sin actividad registrada" text="Aquí aparecerán los cambios de permisos, las ediciones del club y los intentos bloqueados." />
              ) : (
                <ol className="divide-y divide-line">
                  {auditRows.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 py-2.5 text-[13px]">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.result === "ok" ? "bg-accent" : "bg-danger")} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p><span className="font-semibold">{actionLabel(a.action)}</span>{a.detail ? <span className="text-muted"> · {a.detail}</span> : null}</p>
                        <p className="text-[11.5px] text-subtle">{a.actor_name ?? "Sistema"} · {fmtRelative(a.created_at)}</p>
                      </div>
                      {a.result !== "ok" && <Badge tone="danger">{a.result === "denied" ? "Denegado" : "Error"}</Badge>}
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Verificación del club" icon={<ShieldCheck className="size-4" />} />
            {club.verified ? <Badge tone="accent">Club verificado (simulado en la demo)</Badge> : <Badge tone="warn">Pendiente de verificación</Badge>}
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Solo los clubes verificados pueden contactar jugadores y ver perfiles limitados a «clubes verificados». En la demo, la verificación es una marca ficticia y no representa ninguna validación oficial.</p>
          </Card>
          <Card>
            <CardHeader title="Fuente de datos de competición" icon={<Database className="size-4" />} />
            <p className="text-[13px] font-semibold">{provider.label}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">Proveedor activo: <code className="rounded bg-sunken px-1">MockCompetitionProvider</code>. <code className="rounded bg-sunken px-1">FCFCompetitionProvider</code> existe solo como esqueleto, sin conexión, scraping ni API. Cualquier uso de datos oficiales requiere validación FCF, legal y técnica.</p>
          </Card>
          {can.resetDemo(u) && (
            <Card>
              <CardHeader title="Datos de la demo" subtitle="Vuelve al estado inicial (borra todos los cambios hechos)." />
              <ResetDemoButton />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

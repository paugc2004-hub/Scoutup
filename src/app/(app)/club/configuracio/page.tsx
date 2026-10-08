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

export const metadata = { title: "Usuaris i permisos" };

const ACTION_LABEL: Record<string, string> = {
  "auth.login": "Inici de sessió",
  "users.update": "Canvi de rol o estat",
  "users.invite": "Usuari convidat",
  "club.edit": "Perfil del club editat",
  "club.register": "Club registrat",
  "contact.request": "Sol·licitud de contacte",
  "opportunity.create": "Oportunitat creada",
  "opportunity.status": "Estat d'oportunitat",
  "demo.reset": "Dades de demo restaurades",
  "pipeline.add": "Intent d'afegir al pipeline",
  "pipeline.interaction": "Intent de registrar interacció",
  "note.add": "Intent de crear una nota",
  "evaluation.save": "Intent d'avaluar",
  "report.create": "Intent de crear un informe",
  "player.save": "Intent de guardar un jugador",
  "player.access": "Intent d'accés a un jugador",
  "event.create": "Intent de crear un esdeveniment",
};
const actionLabel = (a: string) => ACTION_LABEL[a] ?? (a.startsWith("permission.") ? "Acció no permesa pel rol" : a.replace(/\./g, " · "));

export default async function SettingsPage() {
  const u = await requireClubStaff();
  const club = getClub(u.club_id);
  const manage = can.manageUsers(u);
  const staff = staffUsers(u.club_id).map((s) => ({ ...s, lastAccess: s.last_login_at ? `Últim accés ${fmtRelative(s.last_login_at)}` : s.is_demo_login ? "Usuari de demo" : "Invitació pendent" }));
  const teams = clubTeams(u.club_id).map((t) => ({ id: t.id, name: t.name }));
  const auditRows = can.viewAudit(u) ? clubAudit(u, 25) : [];
  const provider = competitionProvider();
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={club.name} title={manage ? "Usuaris i permisos" : "Permisos"} subtitle="Cada rol veu i fa només el que li correspon. Les comprovacions es fan al servidor, no només a la interfície." />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Usuaris del club" subtitle={`${staff.length} persones · ${manage ? "pots canviar rols, equips i accés" : "només la direcció esportiva els pot modificar"}`} action={manage ? <InviteStaffButton teams={teams} /> : undefined} />
            <StaffManager staff={staff} teams={teams} meId={u.id} editable={manage} />
          </Card>
          <Card>
            <CardHeader title="Matriu de permisos" subtitle="Generada a partir del mateix RBAC que aplica el servidor." icon={<KeyRound className="size-4" />} />
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <caption className="sr-only">Permisos per rol</caption>
                <thead>
                  <tr className="border-b border-line text-left text-[11.5px] font-bold uppercase tracking-wider text-subtle">
                    <th scope="col" className="py-2">Acció</th>
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
                    <th scope="row" className="py-2.5 pr-3 text-left font-semibold">Equips visibles</th>
                    {CLUB_ROLES.map((r) => <td key={r} className="py-2.5 text-center text-[12px] text-muted">{ROLE_SCOPE[r] === "club" ? "Tots" : "Només el seu"}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
          {can.viewAudit(u) && (
            <Card>
              <CardHeader title="Registre d'auditoria" subtitle="Accions sensibles i intents no permesos. Sense contrasenyes ni contingut privat." icon={<ScrollText className="size-4" />} />
              {auditRows.length === 0 ? (
                <EmptyState title="Sense activitat registrada" text="Aquí apareixeran els canvis de permisos, les edicions del club i els intents bloquejats." />
              ) : (
                <ol className="divide-y divide-line">
                  {auditRows.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 py-2.5 text-[13px]">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.result === "ok" ? "bg-accent" : "bg-danger")} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p><span className="font-semibold">{actionLabel(a.action)}</span>{a.detail ? <span className="text-muted"> · {a.detail}</span> : null}</p>
                        <p className="text-[11.5px] text-subtle">{a.actor_name ?? "Sistema"} · {fmtRelative(a.created_at)}</p>
                      </div>
                      {a.result !== "ok" && <Badge tone="danger">{a.result === "denied" ? "Denegat" : "Error"}</Badge>}
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Verificació del club" icon={<ShieldCheck className="size-4" />} />
            {club.verified ? <Badge tone="accent">Club verificat (simulat a la demo)</Badge> : <Badge tone="warn">Pendent de verificació</Badge>}
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Només els clubs verificats poden contactar jugadors i veure perfils limitats a «clubs verificats». A la demo, la verificació és una marca fictícia i no representa cap validació oficial.</p>
          </Card>
          <Card>
            <CardHeader title="Font de dades de competició" icon={<Database className="size-4" />} />
            <p className="text-[13px] font-semibold">{provider.label}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">Proveïdor actiu: <code className="rounded bg-sunken px-1">MockCompetitionProvider</code>. <code className="rounded bg-sunken px-1">FCFCompetitionProvider</code> existeix només com a esquelet, sense connexió, scraping ni API. Qualsevol ús de dades oficials requereix validació FCF, legal i tècnica.</p>
          </Card>
          {can.resetDemo(u) && (
            <Card>
              <CardHeader title="Dades de la demo" subtitle="Torna a l'estat inicial (esborra tots els canvis fets)." />
              <ResetDemoButton />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

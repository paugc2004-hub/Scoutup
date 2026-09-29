import { Check, X, ShieldCheck, Database, UserPlus, KeyRound } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { club as getClub, staffUsers } from "@/server/services/club";
import { competitionProvider } from "@/server/competition/provider";
import { Avatar, Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { ResetDemoButton } from "@/components/client/demo-login";
import { fmtRelative } from "@/lib/time";

export const metadata = { title: "Usuaris i permisos" };

const MATRIX: [string, boolean, string][] = [
  ["Veure el tauler, cercar jugadors i ScoutUp Intelligence", true, "Tot"],
  ["Crear, pausar i tancar ofertes", false, "No"],
  ["Gestionar candidatures de les ofertes", true, "Només del seu equip"],
  ["Pipeline: afegir i moure jugadors", true, "Només del seu equip"],
  ["Contactar jugadors i conversar", true, "Només del seu equip"],
  ["Avaluacions i notes privades", true, "Les del seu equip i les pròpies"],
  ["Calendari", true, "El seu equip i els actes de club"],
  ["Plantilla, equips i competició", true, "Només el seu equip"],
  ["Editar el perfil del club", false, "No"],
  ["Gestionar usuaris i restaurar la demo", false, "No"],
];

export default async function SettingsPage() {
  const u = await requireClubStaff();
  const club = getClub(u.club_id);
  const staff = staffUsers(u.club_id);
  const provider = competitionProvider();
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={club.name} title={u.role === "director" ? "Usuaris i permisos" : "Permisos"} subtitle="Cada rol veu i fa només el que li correspon. Les comprovacions es fan al servidor, no només a la interfície." />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Usuaris del club" subtitle={`${staff.length} persones`} action={u.role === "director" ? <span title="Properament" className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-xl border border-dashed border-line-strong px-3 text-[12.5px] font-semibold text-subtle"><UserPlus className="size-3.5" /> Convidar usuari <Badge tone="warn">Properament</Badge></span> : undefined} />
            <div className="divide-y divide-line">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-3">
                  <Avatar initials={s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")} hue={s.avatar_hue} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold">{s.name} {s.id === u.id && <span className="font-normal text-muted">(tu)</span>}</p>
                    <p className="truncate text-[12px] text-muted">{s.title} · {s.email}</p>
                  </div>
                  <Badge tone={s.role === "director" ? "dark" : "info"}>{s.role === "director" ? "Direcció · accés complet" : `Entrenador · ${s.team_name}`}</Badge>
                  <span className="hidden w-28 text-right text-[11.5px] text-subtle md:block">{s.last_login_at ? `Accés ${fmtRelative(s.last_login_at)}` : s.is_demo_login ? "Usuari de demo" : "Sense accés"}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Matriu de permisos" icon={<KeyRound className="size-4" />} />
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead><tr className="border-b border-line text-left text-[11.5px] font-bold uppercase tracking-wider text-subtle"><th className="py-2">Acció</th><th className="py-2 text-center">Direcció esportiva</th><th className="py-2 text-center">Entrenador</th></tr></thead>
                <tbody>
                  {MATRIX.map(([a, coach, note]) => (
                    <tr key={a} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-3">{a}</td>
                      <td className="py-2.5 text-center"><Check className="mx-auto size-4 text-accent-600" /></td>
                      <td className="py-2.5 text-center">{coach ? <span className="inline-flex items-center gap-1 text-[12px] text-ink-2"><Check className="size-4 text-accent-600" />{note !== "Tot" && <span className="text-muted">{note}</span>}</span> : <X className="mx-auto size-4 text-danger" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
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
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">Proveïdor actiu: <code className="rounded bg-sunken px-1">MockCompetitionProvider</code>. <code className="rounded bg-sunken px-1">FCFCompetitionProvider</code> existeix només com a esquelet, sense connexió, scraping ni API.</p>
          </Card>
          {u.role === "director" && (
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

import Link from "next/link";
import { Building2, ClipboardList, UserRound, ShieldCheck, ArrowRight, Database, PlugZap, Sparkles, Play } from "lucide-react";
import { Logo } from "@/components/shell/app-shell";
import { DemoLoginButton, ResetDemoButton } from "@/components/client/demo-login";
import { DEMO_FLOWS } from "@/lib/demo-flows";
import { get } from "@/server/db/client";
import { competitionProvider } from "@/server/competition/provider";
import { fmtRelative } from "@/lib/time";

export const metadata = { title: "Demo" };
export const dynamic = "force-dynamic";

const ROLES = [
  { role: "director" as const, icon: <Building2 className="size-5" />, title: "Club · Directora esportiva", who: "Marta Casanovas · CF Vallès Nord", text: "Accés complet: ofertes, cerca, pipeline, avaluacions, plantilla, calendari i configuració." },
  { role: "coach" as const, icon: <ClipboardList className="size-5" />, title: "Club · Entrenador", who: "Jordi Esteve · Juvenil A", text: "Mateixa eina, però limitada al seu equip: permisos per rol aplicats al servidor." },
  { role: "player" as const, icon: <UserRound className="size-5" />, title: "Jugador", who: "Pol Serra Batlle · 18 anys · central", text: "Perfil, oportunitats amb % d'encaix, M'interessa, seguiment, missatges i privacitat." },
  { role: "guardian" as const, icon: <ShieldCheck className="size-5" />, title: "Tutora legal", who: "Anna Font · mare d'en Nil (16 anys)", text: "Autoritza o denega els contactes dels clubs i controla la visibilitat del menor." },
];

export default async function DemoPage() {
  const seeded = get<{ value: string }>("SELECT value FROM meta WHERE key = 'seeded_at'")?.value;
  const provider = competitionProvider();
  const counts = Object.fromEntries(
    (["clubs", "teams", "players", "offers", "applications", "conversations", "events"] as const).map((t) => [t, get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)?.n ?? 0]),
  );
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 md:px-8">
          <Logo dark={false} />
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-muted hover:text-ink">Inici</Link>
            <Link href="/entrar" className="rounded-lg px-3 py-2 text-[13.5px] font-semibold text-ink hover:bg-sunken">Entrar</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
        <div className="animate-rise">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent-ink">Mode demo</p>
          <h1 className="mt-2 text-[34px] font-extrabold leading-tight tracking-[-0.025em] md:text-[42px]">Explora ScoutUp des de cada rol</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            Tot funciona de veritat: les accions es guarden a la base de dades local i es veuen des dels altres rols. Totes les dades són fictícies i es poden restaurar en qualsevol moment.
          </p>
        </div>

        <h2 className="mb-3 mt-10 text-[13px] font-bold uppercase tracking-[0.12em] text-subtle">Recorreguts guiats</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {DEMO_FLOWS.map((f, i) => (
            <div key={f.id} className={`flex flex-col rounded-2xl border p-5 shadow-card ${i === 0 ? "border-night bg-night text-white" : "border-line bg-surface"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-[16px] font-extrabold tracking-tight ${i === 0 ? "text-white" : ""}`}>{f.title}</p>
                  <p className={`mt-1 text-[13px] ${i === 0 ? "text-night-text" : "text-muted"}`}>{f.subtitle}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-bold ${i === 0 ? "bg-night-3 text-accent" : "bg-sunken text-ink-2"}`}>{f.minutes}</span>
              </div>
              <ol className={`mt-4 flex-1 space-y-1.5 text-[13px] ${i === 0 ? "text-night-text" : "text-ink-2"}`}>
                {f.steps.map((s, k) => (
                  <li key={k} className="flex gap-2.5">
                    <span className={`mt-px grid size-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${i === 0 ? "bg-night-3 text-white" : "bg-sunken text-ink-2"}`}>{k + 1}</span>
                    {s.title}
                  </li>
                ))}
              </ol>
              <DemoLoginButton role={f.steps[0].role} next={f.steps[0].href} guide={f.id} size="md" variant={i === 0 ? "primary" : "dark"} className="mt-5 self-start" icon={<Play className="size-4" />}>
                Començar recorregut
              </DemoLoginButton>
            </div>
          ))}
        </div>

        <h2 className="mb-3 mt-12 text-[13px] font-bold uppercase tracking-[0.12em] text-subtle">O entra lliurement</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r.role} className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-ink">{r.icon}</span>
              <p className="mt-4 text-[15px] font-bold">{r.title}</p>
              <p className="text-[12.5px] font-medium text-accent-ink">{r.who}</p>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{r.text}</p>
              <DemoLoginButton role={r.role} size="sm" variant="secondary" className="mt-4 self-start">Entrar <ArrowRight className="size-3.5" /></DemoLoginButton>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card lg:col-span-2">
            <div className="flex items-center gap-2.5"><Database className="size-5 text-subtle" /><p className="text-[15px] font-bold">Dades de la demo</p></div>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-7">
              {Object.entries({ Clubs: counts.clubs, Equips: counts.teams, Jugadors: counts.players, Ofertes: counts.offers, Candidatures: counts.applications, Converses: counts.conversations, Esdeveniments: counts.events }).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-sunken p-3">
                  <p className="text-[20px] font-extrabold tabular">{v}</p>
                  <p className="text-[11.5px] text-muted">{k}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
              Clubs, jugadors, competicions, classificacions i estadístiques són inventats. Els municipis són reals només com a referència geogràfica. Cap indicador «Verificat» representa una verificació oficial.
              {seeded && <> Dades carregades {fmtRelative(seeded)}.</>}
            </p>
            <ResetDemoButton className="mt-4" />
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center gap-2.5"><PlugZap className="size-5 text-subtle" /><p className="text-[15px] font-bold">Font de dades de competició</p></div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              L'aplicació llegeix tota la informació competitiva a través d'un <code className="rounded bg-sunken px-1 text-[12px]">CompetitionDataProvider</code>.
            </p>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex items-center justify-between rounded-xl border border-accent-soft-2 bg-accent-soft px-3 py-2"><span className="font-semibold">MockCompetitionProvider</span><span className="text-[11.5px] font-bold text-accent-ink">ACTIU</span></div>
              <div className="flex items-center justify-between rounded-xl border border-dashed border-line-strong px-3 py-2 text-muted"><span className="font-semibold">FCFCompetitionProvider</span><span className="text-[11.5px] font-bold">NO IMPLEMENTAT</span></div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-subtle">{provider.label}. Sense connexió, scraping ni API de la FCF.</p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-accent-ink" />
          <p className="text-[13px] leading-relaxed text-muted">
            <strong className="text-ink">ScoutUp Intelligence</strong> és un motor determinista i local: interpreta la petició, la converteix en criteris i reutilitza el càlcul de compatibilitat. No depèn de cap servei d'IA extern.
          </p>
        </div>
      </div>
    </div>
  );
}

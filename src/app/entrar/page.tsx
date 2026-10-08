import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, UserRound, ClipboardList, ShieldCheck, Network } from "lucide-react";
import { Logo } from "@/components/shell/app-shell";
import { LoginForm } from "@/components/client/login-form";
import { DemoLoginButton } from "@/components/client/demo-login";
import { currentUser, homeFor } from "@/server/auth/session";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const me = await currentUser();
  if (me) redirect(homeFor(me));
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-night p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -bottom-40 -left-40 size-[520px] rounded-full bg-accent/20 blur-[120px]" />
        <Logo />
        <div className="relative">
          <p className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em]">Connectant talent,<br />clubs i oportunitats.</p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-night-text">Entra amb un dels usuaris de demo per veure ScoutUp des de cada rol. Totes les dades són fictícies.</p>
        </div>
        <p className="relative text-[12px] text-night-muted">Demo sense connexió amb cap federació ni font externa.</p>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px] animate-rise">
          <div className="mb-8 lg:hidden"><Logo dark={false} /></div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Entrar a ScoutUp</h1>
          <p className="mt-1 text-[14px] text-muted">
            No tens compte? <Link href="/registre" className="font-semibold text-accent-ink hover:underline">Crea'n un</Link>
          </p>

          <div className="mt-7 rounded-2xl border border-line bg-surface p-4 shadow-card">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-subtle">Entrar com a demo</p>
            <div className="grid gap-2">
              <DemoLoginButton role="director" size="md" variant="dark" className="w-full justify-start" icon={<Building2 className="size-4" />}>
                Club · Directora esportiva <span className="ml-auto text-[11.5px] font-medium text-night-muted">director@scoutup.demo</span>
              </DemoLoginButton>
              <DemoLoginButton role="coordinator" size="md" variant="secondary" className="w-full justify-start" icon={<Network className="size-4" />}>
                Club · Coordinació <span className="ml-auto text-[11.5px] font-medium text-subtle">coordinacio@scoutup.demo</span>
              </DemoLoginButton>
              <DemoLoginButton role="coach" size="md" variant="secondary" className="w-full justify-start" icon={<ClipboardList className="size-4" />}>
                Entrenador · Juvenil A <span className="ml-auto text-[11.5px] font-medium text-subtle">coach@scoutup.demo</span>
              </DemoLoginButton>
              <DemoLoginButton role="clubB" size="md" variant="secondary" className="w-full justify-start" icon={<Building2 className="size-4" />}>
                Club B · FC Mediterrani <span className="ml-auto text-[11.5px] font-medium text-subtle">club-b@scoutup.demo</span>
              </DemoLoginButton>
              <DemoLoginButton role="player" size="md" variant="secondary" className="w-full justify-start" icon={<UserRound className="size-4" />}>
                Jugador · Pol Serra <span className="ml-auto text-[11.5px] font-medium text-subtle">player@scoutup.demo</span>
              </DemoLoginButton>
              <DemoLoginButton role="guardian" size="md" variant="secondary" className="w-full justify-start" icon={<ShieldCheck className="size-4" />}>
                Tutora legal · Anna Font <span className="ml-auto text-[11.5px] font-medium text-subtle">tutor@scoutup.demo</span>
              </DemoLoginButton>
            </div>
            <p className="mt-3 text-[12px] text-subtle">Contrasenya de tots els usuaris de demo: <code className="rounded bg-sunken px-1.5 py-0.5 font-semibold text-ink">demo</code></p>
          </div>

          <div className="my-6 flex items-center gap-3 text-[12px] text-subtle"><span className="h-px flex-1 bg-line" /> o amb correu <span className="h-px flex-1 bg-line" /></div>
          <LoginForm />
          <p className="mt-8 text-center text-[12.5px] text-subtle"><Link href="/" className="hover:text-ink">← Tornar a l'inici</Link> · <Link href="/demo" className="hover:text-ink">Guia de la demo</Link></p>
        </div>
      </div>
    </div>
  );
}

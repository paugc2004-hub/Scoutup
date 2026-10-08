import Link from "next/link";
import { ArrowRight, Building2, UserRound, Sparkles, ShieldCheck, Target, MessagesSquare, KanbanSquare, Compass, Lock, CheckCircle2, Eye } from "lucide-react";
import { Logo } from "@/components/shell/app-shell";
import { DemoLoginButton } from "@/components/client/demo-login";
import { MatchRing, Avatar, Badge, btnClass, matchColor } from "@/components/ui";
import { playerRow, playerCtx, presentPlayer, toMatchPlayer } from "@/server/services/players";
import { offerRow, toMatchOffer } from "@/server/services/offers";
import { computeMatch } from "@/lib/matching";
import { get } from "@/server/db/client";
import { currentUser, homeFor } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const me = await currentUser();
  const ctx = playerCtx();
  const pr = playerRow("p_biel");
  const of = offerRow("o_vn_central");
  const hero = pr && of ? { p: presentPlayer(pr, ctx), m: computeMatch(toMatchPlayer(pr, ctx.prev.get(pr.id), ctx.career.get(pr.id) ?? 0), toMatchOffer(of), ctx.now), o: of } : null;
  const counts = {
    clubs: get<{ n: number }>("SELECT COUNT(*) AS n FROM clubs")?.n ?? 0,
    players: get<{ n: number }>("SELECT COUNT(*) AS n FROM players")?.n ?? 0,
    offers: get<{ n: number }>("SELECT COUNT(*) AS n FROM offers WHERE status = 'oberta'")?.n ?? 0,
  };

  return (
    <div className="min-h-dvh bg-bg">
      {/* HERO */}
      <section className="relative overflow-hidden bg-night text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
        <div className="pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full bg-accent/20 blur-[140px]" />
        <header className="relative mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 md:px-8">
          <Logo />
          <nav className="flex items-center gap-2">
            <a href="#com-funciona" className="hidden rounded-lg px-3 py-2 text-[13.5px] font-medium text-night-text hover:text-white md:block">Cómo funciona</a>
            <Link href="/demo" className="hidden rounded-lg px-3 py-2 text-[13.5px] font-medium text-night-text hover:text-white md:block">Demo guiada</Link>
            {me ? (
              <Link href={homeFor(me)} className={btnClass("primary", "sm")}>Ir a mi espacio <ArrowRight className="size-3.5" /></Link>
            ) : (
              <Link href="/entrar" className="inline-flex h-8 items-center rounded-xl border border-night-line px-3 text-[12.5px] font-semibold text-white hover:bg-night-2">Entrar</Link>
            )}
          </nav>
        </header>

        <div className="relative mx-auto grid max-w-[1200px] gap-12 px-5 pb-20 pt-10 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-16">
          <div className="animate-rise">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-night-line bg-night-2 px-3 py-1 text-[12px] font-semibold text-night-text">
              <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" /> Demo interactiva · datos ficticios
            </p>
            <h1 className="text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] md:text-[64px]">
              <span className="text-accent">SCOUTUP</span>
              <br />
              Conectando talento, clubes y oportunidades.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-night-text">
              El software con el que los clubes de fútbol base encuentran el jugador que necesitan, entienden <span className="font-semibold text-white">por qué</span> encaja, organizan el proceso con su equipo y contactan de forma segura.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <DemoLoginButton role="director" icon={<Building2 className="size-4" />}>Entrar como club</DemoLoginButton>
              <DemoLoginButton role="player" variant="secondary" icon={<UserRound className="size-4" />} className="!border-night-line !bg-night-2 !text-white hover:!bg-night-3">Entrar como jugador</DemoLoginButton>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] font-semibold">
              <Link href="/demo" className="inline-flex items-center gap-1.5 text-white hover:text-accent"><Compass className="size-4" /> Explorar demo</Link>
              <Link href="/registre" className="inline-flex items-center gap-1.5 text-white hover:text-accent">Crear cuenta</Link>
              <a href="#com-funciona" className="inline-flex items-center gap-1.5 text-night-text hover:text-white">Ver cómo funciona <ArrowRight className="size-3.5" /></a>
            </div>
          </div>

          {/* Targeta de producte real (dades de la demo) */}
          {hero && (
            <div className="relative animate-rise [animation-delay:120ms]">
              <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-accent/25 to-transparent blur-2xl" />
              <div className="relative rounded-3xl border border-night-line bg-night-2 p-5 shadow-pop">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-night-muted">Oportunitat · {hero.o.club_name}</p>
                  <Badge tone="dark" className="!border-night-line !bg-night-3 !text-night-text">{hero.o.team_name}</Badge>
                </div>
                <p className="text-[19px] font-extrabold tracking-tight">{hero.o.title}</p>
                <div className="mt-4 flex items-center gap-4 rounded-2xl border border-night-line bg-night p-4">
                  <Avatar initials={hero.p.initials} hue={hero.p.hue} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">{hero.p.name}</p>
                    <p className="text-[12.5px] text-night-muted">{hero.p.position_label} · {hero.p.age} anys · {hero.p.club_name}</p>
                  </div>
                  <div className="rounded-full bg-white p-1"><MatchRing score={hero.m.score} size={58} /></div>
                </div>
                <div className="mt-4 space-y-2.5">
                  {hero.m.factors.map((f) => (
                    <div key={f.key} className="grid grid-cols-[120px_1fr_44px] items-center gap-3 text-[12.5px]">
                      <span className="text-night-text">{f.label}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-night-3"><div className="bar-anim h-full rounded-full" style={{ width: `${(f.score / f.weight) * 100}%`, background: matchColor((f.score / f.weight) * 100) }} /></div>
                      <span className="text-right font-bold tabular text-white">{Math.round(f.score)}/{f.weight}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-2 border-t border-night-line pt-4 text-[12.5px] text-night-text">
                  <Sparkles className="size-4 text-accent" /> Compatibilidad explicable: el club siempre ve el porqué.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* XIFRES DEMO */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-[1200px] grid-cols-3 divide-x divide-line px-5 md:px-8">
          {[
            [counts.clubs, "clubes ficticios"],
            [counts.players, "jugadores ficticios"],
            [counts.offers, "oportunidades abiertas"],
          ].map(([n, l]) => (
            <div key={l as string} className="py-6 text-center">
              <p className="text-[28px] font-extrabold tracking-tight tabular md:text-[34px]">{n}</p>
              <p className="text-[12.5px] font-medium text-muted">{l} a la demo</p>
            </div>
          ))}
        </div>
      </section>

      {/* COM FUNCIONA */}
      <section id="com-funciona" className="mx-auto max-w-[1200px] scroll-mt-10 px-5 py-20 md:px-8">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent-ink">Cómo funciona</p>
        <h2 className="mt-2 max-w-2xl text-[32px] font-extrabold leading-tight tracking-[-0.025em] md:text-[40px]">De la necesidad del club al contacto, en cuatro pasos.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            { icon: <Target className="size-5" />, t: "El club define la necesidad", d: "Una oportunidad con posición, categoría, nivel, zona y características. O una petición en lenguaje natural." },
            { icon: <Sparkles className="size-5" />, t: "ScoutUp calcula el encaje", d: "Siete factores ponderados y explicables. Sin cajas negras: cada porcentaje tiene su porqué." },
            { icon: <KanbanSquare className="size-5" />, t: "El club evalúa y decide", d: "Pipeline, comparador, evaluaciones por áreas, notas privadas e informes de observación." },
            { icon: <MessagesSquare className="size-5" />, t: "Contacto seguro", d: "El jugador (o su tutor, si es menor) decide si acepta. Mensajería interna y moderada." },
          ].map((s, i) => (
            <div key={s.t} className="relative rounded-2xl border border-line bg-surface p-5 shadow-card">
              <span className="absolute right-5 top-5 text-[12px] font-bold tabular text-subtle">0{i + 1}</span>
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-ink">{s.icon}</span>
              <p className="mt-4 text-[15.5px] font-bold">{s.t}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PER A CLUBS / JUGADORS */}
      <section className="mx-auto grid max-w-[1200px] gap-5 px-5 pb-20 md:px-8 lg:grid-cols-2">
        <div className="rounded-3xl bg-night p-7 text-white md:p-9">
          <Building2 className="size-6 text-accent" />
          <h3 className="mt-4 text-[26px] font-extrabold tracking-tight">ScoutUp Club</h3>
          <ul className="mt-5 space-y-3 text-[14.5px] text-night-text">
            {["Búsqueda avanzada y ScoutUp Intelligence", "Oportunidades con candidatos ordenados por compatibilidad", "Pipeline de captación con nueve etapas", "Comparador, evaluaciones y notas privadas", "Plantilla visual, equipos y calendario", "Permisos por rol: dirección, coordinación y entrenadores"].map((x) => (
              <li key={x} className="flex gap-2.5"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />{x}</li>
            ))}
          </ul>
          <DemoLoginButton role="director" size="md" className="mt-7">Probar como club <ArrowRight className="size-4" /></DemoLoginButton>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-7 shadow-card md:p-9">
          <UserRound className="size-6 text-accent-ink" />
          <h3 className="mt-4 text-[26px] font-extrabold tracking-tight">ScoutUp Player (el otro lado)</h3>
          <ul className="mt-5 space-y-3 text-[14.5px] text-muted">
            {["Perfil deportivo completo, en 8 pasos", "Oportunidades con tu % de encaje", "Me interesa: solicitud en un clic", "Clubes interesados y seguimiento de cada proceso", "Mensajes, calendario y recordatorios", "Controles de privacidad campo a campo"].map((x) => (
              <li key={x} className="flex gap-2.5"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-ink" />{x}</li>
            ))}
          </ul>
          <DemoLoginButton role="player" size="md" variant="dark" className="mt-7">Probar como jugador <ArrowRight className="size-4" /></DemoLoginButton>
        </div>
      </section>

      {/* SEGURETAT */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-14 md:px-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent-ink">Protección desde el diseño</p>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight">Trabajamos en un entorno donde hay menores.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { i: <Lock className="size-4" />, t: "Consentimiento del tutor", d: "Un menor es invisible para los clubes hasta que el tutor da su consentimiento." },
              { i: <ShieldCheck className="size-4" />, t: "Clubes verificados", d: "Un club no verificado no puede contactar a nadie." },
              { i: <Eye className="size-4" />, t: "Privacidad campo a campo", d: "El jugador decide quién ve el perfil, los vídeos y los datos." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-line p-4">
                <span className="grid size-8 place-items-center rounded-lg bg-violet-soft text-violet">{x.i}</span>
                <p className="mt-3 text-[14px] font-bold">{x.t}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-[1200px] px-5 py-10 text-[12.5px] leading-relaxed text-muted md:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <Logo dark={false} />
          <p className="max-w-2xl">
            Demo de producto. Todos los clubes, jugadores, competiciones, clasificaciones y estadísticas son <strong className="text-ink">ficticis</strong>. La demo no se conecta con la Federació Catalana de Futbol ni con ninguna fuente externa, y ningún indicador de «verificado» representa una verificación oficial.
          </p>
        </div>
      </footer>
    </div>
  );
}

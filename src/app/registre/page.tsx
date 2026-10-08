import Link from "next/link";
import { Logo } from "@/components/shell/app-shell";
import { RegisterForm } from "@/components/client/register-form";

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ tipus?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 md:px-8">
        <Logo dark={false} />
        <Link href="/entrar" className="text-[13.5px] font-semibold text-ink hover:underline">Ya tengo cuenta</Link>
      </header>
      <div className="mx-auto max-w-[560px] px-5 pb-16 pt-6 animate-rise">
        <h1 className="text-[30px] font-extrabold tracking-tight">Crear cuenta</h1>
        <p className="mt-1.5 text-[14.5px] text-muted">Jugadores y clubes usan la misma plataforma con experiencias diferentes.</p>
        <div className="mt-7">
          <RegisterForm initialType={sp.tipus === "club" ? "club" : "player"} />
        </div>
      </div>
    </div>
  );
}

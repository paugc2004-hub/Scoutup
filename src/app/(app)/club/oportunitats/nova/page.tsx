import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { can } from "@/server/services/access";
import { requireClubStaff } from "@/server/auth/session";
import { club as getClub, clubTeams } from "@/server/services/club";
import { EmptyState, PageHeader } from "@/components/ui";
import { OfferForm } from "@/components/club/offer-form";

export const metadata = { title: "Nueva oportunidad" };

export default async function NewOfferPage({ searchParams }: { searchParams: Promise<{ team?: string; position?: string }> }) {
  const u = await requireClubStaff();
  const sp = await searchParams;
  if (!can.manageOffers(u)) {
    return <div className="mx-auto max-w-lg pt-10"><EmptyState icon={<Lock className="size-5" />} title="Solo dirección y coordinación pueden publicar oportunidades" text="Como entrenador puedes ver las oportunidades de tu equipo y gestionar sus candidatos." action={<Link href="/club/oportunitats" className="text-[13px] font-semibold text-accent-ink hover:underline">Volver a oportunidades</Link>} /></div>;
  }
  const club = getClub(u.club_id);
  const teams = clubTeams(u.club_id).map((t) => ({ id: t.id, name: t.name, category: t.category, gender: t.gender }));
  return (
    <div>
      <Link href="/club/oportunitats" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Oportunidades</Link>
      <PageHeader eyebrow="Nueva oportunidad" title="¿Qué necesita el equipo?" subtitle="Define el perfil y mira en tiempo real cuántos jugadores encajan antes de publicar." />
      <OfferForm teams={teams} clubCity={club.city} initial={{ team: sp.team, position: sp.position }} />
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { requireClubStaff } from "@/server/auth/session";
import { club as getClub, clubTeams } from "@/server/services/club";
import { EmptyState, PageHeader } from "@/components/ui";
import { OfferForm } from "@/components/club/offer-form";

export const metadata = { title: "Nova oferta" };

export default async function NewOfferPage({ searchParams }: { searchParams: Promise<{ team?: string; position?: string }> }) {
  const u = await requireClubStaff();
  const sp = await searchParams;
  if (u.role !== "director") {
    return <div className="mx-auto max-w-lg pt-10"><EmptyState icon={<Lock className="size-5" />} title="Només la direcció esportiva pot publicar ofertes" text="Com a entrenador pots veure les ofertes del teu equip i gestionar-ne els candidats." action={<Link href="/club/ofertes" className="text-[13px] font-semibold text-accent-ink hover:underline">Tornar a ofertes</Link>} /></div>;
  }
  const club = getClub(u.club_id);
  const teams = clubTeams(u.club_id).map((t) => ({ id: t.id, name: t.name, category: t.category, gender: t.gender }));
  return (
    <div>
      <Link href="/club/ofertes" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Ofertes</Link>
      <PageHeader eyebrow="Nova oferta" title="Què necessita l'equip?" subtitle="Defineix el perfil i mira en temps real quants jugadors hi encaixen abans de publicar." />
      <OfferForm teams={teams} clubCity={club.city} initial={{ team: sp.team, position: sp.position }} />
    </div>
  );
}

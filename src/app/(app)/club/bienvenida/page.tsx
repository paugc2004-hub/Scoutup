import { redirect } from "next/navigation";
import { requireClubStaff } from "@/server/auth/session";
import { can } from "@/server/services/access";
import { club as getClub } from "@/server/services/club";
import { TEAM_PRESETS, onboardingStatus } from "@/server/services/onboarding";
import { PageHeader } from "@/components/ui";
import { OnboardingWizard } from "@/components/club/onboarding-wizard";

export const metadata = { title: "Bienvenida" };

export default async function OnboardingPage() {
  const u = await requireClubStaff();
  if (!can.editClub(u)) redirect("/club");
  const club = getClub(u.club_id);
  const status = onboardingStatus(u.club_id);
  return (
    <div>
      <PageHeader eyebrow="Configuración inicial" title="Primeros pasos" subtitle={status.done ? "Tu club ya está configurado. Puedes crear otra necesidad desde aquí." : "Lo mínimo para empezar a encontrar jugadores. Sin formularios largos."} />
      <OnboardingWizard clubName={club.name} city={club.city} verified={!!club.verified} presets={TEAM_PRESETS.map((t) => ({ key: t.key, name: t.name }))} />
    </div>
  );
}

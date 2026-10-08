import { can } from "@/server/services/access";
import { requireClubStaff } from "@/server/auth/session";
import { club as getClub } from "@/server/services/club";
import { ClubProfileView } from "@/components/club-profile";
import { ClubEditButton } from "@/components/club/club-edit";
import { Badge } from "@/components/ui";

export const metadata = { title: "Perfil del club" };

export default async function ClubProfilePage() {
  const u = await requireClubStaff();
  const c = getClub(u.club_id);
  const actions = can.editClub(u) ? (
    <ClubEditButton initial={{ description: c.description ?? "", history: c.history ?? "", philosophy: c.philosophy ?? "", values_text: c.values_text ?? "", objectives: c.objectives ?? "", sporting_model: c.sporting_model ?? "", website: c.website ?? "", instagram: c.instagram ?? "", email: c.email ?? "", phone: c.phone ?? "", office_hours: c.office_hours ?? "", color_primary: c.color_primary }} />
  ) : <Badge>Només lectura</Badge>;
  return <ClubProfileView club={c} actions={actions} offerHref={(id) => `/club/oportunitats/${id}`} />;
}

import { requireClubStaff } from "@/server/auth/session";
import { ClubInbox } from "./inbox";

export const metadata = { title: "Mensajes" };

export default async function ClubMessages() {
  const u = await requireClubStaff();
  return <ClubInbox u={u} />;
}

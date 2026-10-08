import { requireClubStaff } from "@/server/auth/session";
import { ClubInbox } from "../inbox";

export const metadata = { title: "Conversación" };

export default async function ClubConversation({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireClubStaff();
  const { id } = await params;
  return <ClubInbox u={u} activeId={id} />;
}

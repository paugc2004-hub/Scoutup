import { api, apiUser } from "@/server/api";
import { markConversationRead } from "@/server/services/actions";

type Ctx = { params: Promise<{ id: string }> };
export const POST = api<Ctx>(async (_req, { params }) => {
  const u = await apiUser();
  const { id } = await params;
  markConversationRead(u, id);
  return { ok: true };
});

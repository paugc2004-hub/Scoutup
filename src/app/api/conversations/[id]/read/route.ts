import { api, apiUser } from "@/server/api";
import { markConversationRead } from "@/server/services/actions";
import { zId } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };
export const POST = api<Ctx>(async (_req, { params }) => {
  const u = await apiUser();
  markConversationRead(u, zId.parse((await params).id));
  return { ok: true };
});

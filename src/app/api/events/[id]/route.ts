import { api, apiUser } from "@/server/api";
import { deleteEvent } from "@/server/services/actions";
import { zId } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };
export const DELETE = api<Ctx>(async (_req, { params }) => {
  const u = await apiUser();
  deleteEvent(u, zId.parse((await params).id));
  return { ok: true };
});

import { api, apiUser } from "@/server/api";
import { deleteEvent } from "@/server/services/actions";

type Ctx = { params: Promise<{ id: string }> };
export const DELETE = api<Ctx>(async (_req, { params }) => {
  const u = await apiUser();
  const { id } = await params;
  deleteEvent(u, id);
  return { ok: true };
});

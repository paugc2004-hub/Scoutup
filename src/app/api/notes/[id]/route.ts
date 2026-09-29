import { api, apiStaff } from "@/server/api";
import { deleteNote } from "@/server/services/actions";

type Ctx = { params: Promise<{ id: string }> };
export const DELETE = api<Ctx>(async (_req, { params }) => {
  const u = await apiStaff();
  const { id } = await params;
  deleteNote(u, id);
  return { ok: true };
});

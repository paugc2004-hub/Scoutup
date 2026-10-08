import { api, apiStaff } from "@/server/api";
import { deleteNote } from "@/server/services/actions";
import { zId } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };
export const DELETE = api<Ctx>(async (_req, { params }) => {
  const u = await apiStaff("evaluations.write");
  deleteNote(u, zId.parse((await params).id));
  return { ok: true };
});

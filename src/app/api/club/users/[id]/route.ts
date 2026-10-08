import { api, apiStaff, body, rateLimit } from "@/server/api";
import { StaffPatch, updateStaffUser } from "@/server/services/users";
import { zId } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };
export const PATCH = api<Ctx>(async (req, { params }) => {
  const u = await apiStaff("users.manage");
  rateLimit("write", u.id);
  const id = zId.parse((await params).id);
  return updateStaffUser(u, id, StaffPatch.parse(await body(req)));
});

import { api, apiStaff, body, rateLimit } from "@/server/api";
import { StaffInvite, inviteStaffUser } from "@/server/services/users";

export const POST = api(async (req) => {
  const u = await apiStaff("users.manage");
  rateLimit("write", u.id);
  return { ok: true, ...inviteStaffUser(u, StaffInvite.parse(await body(req))) };
});

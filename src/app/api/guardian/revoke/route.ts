import { z } from "zod";
import { api, apiUser, body } from "@/server/api";
import { zId } from "@/server/validation";
import { revokeClub } from "@/server/services/player-actions";

const S = z.object({ clubId: zId });
export const POST = api(async (req) => {
  const u = await apiUser(["guardian"]);
  revokeClub(u, S.parse(await body(req)).clubId);
  return { ok: true };
});

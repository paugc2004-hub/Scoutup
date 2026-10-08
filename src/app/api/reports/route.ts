import { z } from "zod";
import { api, apiUser, body, rateLimit } from "@/server/api";
import { reportTarget } from "@/server/services/actions";
import { zId, zText } from "@/server/validation";

const S = z.object({ target_type: z.enum(["club", "player", "message", "offer"]), target_id: zId, reason: zText(80, 3), details: zText(1500).nullish() });
export const POST = api(async (req) => {
  const u = await apiUser();
  rateLimit("write", u.id);
  const d = S.parse(await body(req));
  reportTarget(u, d);
  return { ok: true };
});

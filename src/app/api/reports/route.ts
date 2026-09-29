import { z } from "zod";
import { api, apiUser, body } from "@/server/api";
import { reportTarget } from "@/server/services/actions";

const S = z.object({ target_type: z.enum(["club", "player", "message", "offer"]), target_id: z.string(), reason: z.string().min(3), details: z.string().max(1500).nullish() });
export const POST = api(async (req) => {
  const u = await apiUser();
  const d = S.parse(await body(req));
  reportTarget(u, d);
  return { ok: true };
});

import { z } from "zod";
import { api, apiUser, body } from "@/server/api";
import { guardianPrivacy } from "@/server/services/player-actions";

const S = z.object({ profile: z.enum(["verificats", "contactats", "ocult"]).optional(), videos: z.enum(["verificats", "contactats"]).optional(), contact: z.enum(["verificats", "ningu"]).optional(), showStats: z.boolean().optional(), showHeight: z.boolean().optional() });
export const POST = api(async (req) => {
  const u = await apiUser(["guardian"]);
  guardianPrivacy(u, S.parse(await body(req)));
  return { ok: true };
});

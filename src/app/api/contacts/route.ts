import { z } from "zod";
import { api, apiStaff, body, rateLimit } from "@/server/api";
import { sendContactRequest } from "@/server/services/actions";
import { zId, zText } from "@/server/validation";

const S = z.object({ playerId: zId, reason: z.enum(["oferta", "prova", "seguiment", "informacio"]), message: zText(1200, 10), teamId: zId.nullish() });
export const POST = api(async (req) => {
  const u = await apiStaff("contact.send");
  rateLimit("contact", u.id);
  const d = S.parse(await body(req));
  return { ok: true, ...sendContactRequest(u, d.playerId, { reason: d.reason, message: d.message, teamId: d.teamId }) };
});

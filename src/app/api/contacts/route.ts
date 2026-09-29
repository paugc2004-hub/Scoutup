import { z } from "zod";
import { api, apiStaff, body } from "@/server/api";
import { sendContactRequest } from "@/server/services/actions";

const S = z.object({ playerId: z.string(), reason: z.enum(["oferta", "prova", "seguiment", "informacio"]), message: z.string().trim().min(10, "escriu un missatge una mica més llarg").max(1200), teamId: z.string().nullish() });
export const POST = api(async (req) => {
  const u = await apiStaff();
  const d = S.parse(await body(req));
  return { ok: true, ...sendContactRequest(u, d.playerId, { reason: d.reason, message: d.message, teamId: d.teamId }) };
});

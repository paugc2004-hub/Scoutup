import { z } from "zod";
import { api, apiUser, body } from "@/server/api";
import { setGuardianConsent } from "@/server/services/player-actions";

const S = z.object({ consent: z.boolean() });
export const POST = api(async (req) => {
  const u = await apiUser(["guardian"]);
  setGuardianConsent(u, S.parse(await body(req)).consent);
  return { ok: true };
});

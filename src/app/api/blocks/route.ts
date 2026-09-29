import { z } from "zod";
import { api, apiPlayer, body } from "@/server/api";
import { blockClub } from "@/server/services/actions";

const S = z.object({ clubId: z.string(), blocked: z.boolean() });
export const POST = api(async (req) => {
  const u = await apiPlayer();
  const d = S.parse(await body(req));
  blockClub(u, d.clubId, d.blocked);
  return { ok: true };
});

import { z } from "zod";
import { api, apiUser, body, rateLimit } from "@/server/api";
import { toggleFavorite } from "@/server/services/actions";
import { zId } from "@/server/validation";

const S = z.object({ type: z.enum(["player", "offer", "club"]), id: zId });
export const POST = api(async (req) => {
  const u = await apiUser();
  rateLimit("write", u.id);
  const d = S.parse(await body(req));
  return { ok: true, favorite: toggleFavorite(u, d.type, d.id) };
});

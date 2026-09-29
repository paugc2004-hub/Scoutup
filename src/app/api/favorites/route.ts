import { z } from "zod";
import { api, apiUser, body } from "@/server/api";
import { toggleFavorite } from "@/server/services/actions";

const S = z.object({ type: z.enum(["player", "offer", "club"]), id: z.string() });
export const POST = api(async (req) => {
  const u = await apiUser();
  const d = S.parse(await body(req));
  return { ok: true, favorite: toggleFavorite(u, d.type, d.id) };
});

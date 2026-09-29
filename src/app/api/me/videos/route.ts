import { z } from "zod";
import { api, apiPlayer, body } from "@/server/api";
import { addVideo } from "@/server/services/player-actions";

const S = z.object({ title: z.string().trim().min(3).max(90), kind: z.enum(["highlights", "partit", "entrenament"]), duration_s: z.number().int().min(10).max(7200) });
export const POST = api(async (req) => {
  const u = await apiPlayer();
  return { ok: true, completeness: addVideo(u, S.parse(await body(req))) };
});

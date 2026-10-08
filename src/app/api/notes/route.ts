import { z } from "zod";
import { api, apiStaff, body, rateLimit } from "@/server/api";
import { addNote } from "@/server/services/actions";
import { zId, zText } from "@/server/validation";

const S = z.object({ playerId: zId, body: zText(1500, 1) });
export const POST = api(async (req) => {
  const u = await apiStaff("evaluations.write");
  rateLimit("write", u.id);
  const d = S.parse(await body(req));
  addNote(u, d.playerId, d.body);
  return { ok: true };
});

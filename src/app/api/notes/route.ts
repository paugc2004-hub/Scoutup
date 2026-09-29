import { z } from "zod";
import { api, apiStaff, body } from "@/server/api";
import { addNote } from "@/server/services/actions";

const S = z.object({ playerId: z.string(), body: z.string().trim().min(1).max(1500) });
export const POST = api(async (req) => {
  const u = await apiStaff();
  const d = S.parse(await body(req));
  addNote(u, d.playerId, d.body);
  return { ok: true };
});

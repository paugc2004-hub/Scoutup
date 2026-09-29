import { z } from "zod";
import { api, apiUser, body } from "@/server/api";
import { createEvent } from "@/server/services/actions";
import { EVENT_KINDS } from "@/lib/domain";

const S = z.object({ kind: z.enum(EVENT_KINDS), title: z.string().trim().min(2), starts_at: z.string(), duration: z.number().int().min(15).max(600).default(60), team_id: z.string().nullish(), related_player_id: z.string().nullish(), location: z.string().nullish(), notes: z.string().nullish(), conversation_id: z.string().nullish() });
export const POST = api(async (req) => {
  const u = await apiUser();
  const d = S.parse(await body(req));
  return { ok: true, ...createEvent(u, d) };
});

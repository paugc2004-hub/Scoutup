import { z } from "zod";
import { api, apiStaff, body, rateLimit } from "@/server/api";
import { logInteraction } from "@/server/services/actions";
import { zId, zText } from "@/server/validation";

const KIND = { trucada: "Trucada", reunio: "Reunió", partit: "Vist en un partit", familia: "Parlat amb la família", entrenador: "Parlat amb l'entrenador", altre: "Interacció" } as const;
const S = z.object({ playerId: zId, kind: z.enum(Object.keys(KIND) as [keyof typeof KIND, ...(keyof typeof KIND)[]]).default("altre"), text: zText(600, 2) });
export const POST = api(async (req) => {
  const u = await apiStaff("pipeline.manage");
  rateLimit("write", u.id);
  const d = S.parse(await body(req));
  logInteraction(u, d.playerId, `${KIND[d.kind]}: ${d.text}`);
  return { ok: true };
});

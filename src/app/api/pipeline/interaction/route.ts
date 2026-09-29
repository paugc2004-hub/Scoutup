import { z } from "zod";
import { api, apiStaff, body } from "@/server/api";
import { logInteraction } from "@/server/services/actions";

const S = z.object({ playerId: z.string(), kind: z.string().default("altre"), text: z.string().trim().min(2) });
const KIND: Record<string, string> = { trucada: "Trucada", reunio: "Reunió", partit: "Vist en un partit", familia: "Parlat amb la família", entrenador: "Parlat amb l'entrenador", altre: "Interacció" };
export const POST = api(async (req) => {
  const u = await apiStaff();
  const d = S.parse(await body(req));
  logInteraction(u, d.playerId, `${KIND[d.kind] ?? "Interacció"}: ${d.text}`);
  return { ok: true };
});

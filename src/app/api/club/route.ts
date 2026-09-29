import { z } from "zod";
import { api, apiStaff, ApiError, body } from "@/server/api";
import { update } from "@/server/db/client";
import { can } from "@/server/services/access";

const S = z.object({
  description: z.string().max(1500).optional(),
  history: z.string().max(2000).optional(),
  philosophy: z.string().max(1500).optional(),
  values_text: z.string().max(400).optional(),
  objectives: z.string().max(1500).optional(),
  sporting_model: z.string().max(1500).optional(),
  website: z.string().max(200).optional(),
  instagram: z.string().max(100).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  office_hours: z.string().max(200).optional(),
  color_primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const PATCH = api(async (req) => {
  const u = await apiStaff();
  if (!can.editClub(u)) throw new ApiError(403, "Només la direcció esportiva pot editar el perfil del club.");
  const d = S.parse(await body(req));
  update("clubs", u.club_id, d);
  return { ok: true };
});

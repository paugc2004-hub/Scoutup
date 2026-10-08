import { z } from "zod";
import { api, apiStaff, body } from "@/server/api";
import { update } from "@/server/db/client";
import { audit } from "@/server/security/audit";
import { zText } from "@/server/validation";

const url = zText(200).refine((v) => v === "" || /^https?:\/\/[^\s<>"]+$/i.test(v), "ha de començar per http:// o https://");
const S = z.object({
  description: zText(1500).optional(),
  history: zText(2000).optional(),
  philosophy: zText(1500).optional(),
  values_text: zText(400).optional(),
  objectives: zText(1500).optional(),
  sporting_model: zText(1500).optional(),
  website: url.optional(),
  instagram: zText(100).optional(),
  email: zText(200).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "correu no vàlid").optional(),
  phone: zText(40).refine((v) => /^[\d\s+().-]*$/.test(v), "telèfon no vàlid").optional(),
  office_hours: zText(200).optional(),
  color_primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).strict();

export const PATCH = api(async (req) => {
  const u = await apiStaff("club.edit");
  const d = S.parse(await body(req));
  update("clubs", u.club_id, d);
  audit({ actor: u, action: "club.edit", entity: { type: "club", id: u.club_id }, detail: Object.keys(d).join(", ") });
  return { ok: true };
});

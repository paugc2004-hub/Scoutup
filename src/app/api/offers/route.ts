import { api, apiStaff, body, rateLimit } from "@/server/api";
import { OfferInput, createOffer } from "@/server/services/offer-actions";

export const POST = api(async (req) => {
  const u = await apiStaff("opportunities.manage");
  rateLimit("write", u.id);
  const d = OfferInput.parse(await body(req));
  return { ok: true, ...createOffer(u, d) };
});

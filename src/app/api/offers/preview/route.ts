import { api, apiStaff, body, rateLimit } from "@/server/api";
import { OfferInput, previewOffer } from "@/server/services/offer-actions";

export const POST = api(async (req) => {
  const u = await apiStaff("opportunities.manage");
  rateLimit("search", u.id);
  const d = OfferInput.parse({ title: "Previsualització", ...(await body(req)) });
  return previewOffer(u, d);
});

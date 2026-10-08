import { api, apiStaff, body, rateLimit } from "@/server/api";
import { OnboardingInput, completeOnboarding } from "@/server/services/onboarding";

export const POST = api(async (req) => {
  const u = await apiStaff("club.edit");
  rateLimit("write", u.id);
  return { ok: true, ...completeOnboarding(u, OnboardingInput.parse(await body(req))) };
});

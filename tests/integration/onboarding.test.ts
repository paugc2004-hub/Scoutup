/** Onboarding de un club nuevo: equipos → primera necesidad → primera oportunidad → primeros jugadores. */
import { beforeAll, describe, expect, it } from "vitest";
import { db, get, insert, nowIso } from "@/server/db/client";
import { completeOnboarding, onboardingStatus } from "@/server/services/onboarding";
import { teamNeeds } from "@/server/services/club";
import type { Staff } from "@/server/api";
import { coach, statusOf } from "../helpers";

let newDirector: Staff;

beforeAll(() => {
  db();
  insert("clubs", { id: "club_nuevo", name: "CF Nuevo", short_name: "Nuevo", initials: "NU", color_primary: "#334155", color_secondary: "#e2e8f0", city: "Sabadell", comarca: "Vallès Occidental", province: "Barcelona", region: "Catalunya", lat: 41.5486, lng: 2.1074, tier: 3, verified: 1, created_at: nowIso() });
  insert("users", { id: "u_nuevo", email: "nuevo@club.example", password_hash: "!", name: "Dirección Nueva", role: "director", club_id: "club_nuevo", created_at: nowIso() });
  newDirector = { id: "u_nuevo", email: "nuevo@club.example", name: "Dirección Nueva", role: "director", title: null, club_id: "club_nuevo", team_id: null, player_id: null, avatar_hue: 1, is_demo_login: 0 };
});

describe("onboarding del club", () => {
  it("un club recién creado no está configurado", () => {
    expect(onboardingStatus("club_nuevo")).toEqual({ teams: 0, offers: 0, done: false });
  });

  it("crea equipos, la necesidad y la primera oportunidad, y devuelve jugadores compatibles", () => {
    const r = completeOnboarding(newDirector, { teams: ["cada", "juva"], need: { team: "cada", position: "LD", level_min: 3, foot: "indiferent", text: "Buscamos un lateral derecho para el Cadete A." } });
    expect(r.offerId).toMatch(/^o_/);
    expect(r.preview.total).toBeGreaterThan(0);
    expect(onboardingStatus("club_nuevo").done).toBe(true);
    expect(get<{ n: number }>("SELECT COUNT(*) AS n FROM teams WHERE club_id = 'club_nuevo'")!.n).toBe(2);
    expect(teamNeeds(newDirector)).toEqual([expect.objectContaining({ position: "LD", priority: "alta", team_name: "Cadete A" })]);
  });

  it("es idempotente con los equipos ya creados", () => {
    completeOnboarding(newDirector, { teams: ["cada"], need: { team: "cada", position: "DC", level_min: 3, foot: "indiferent", text: "Otra necesidad para el Cadete A." } });
    expect(get<{ n: number }>("SELECT COUNT(*) AS n FROM teams WHERE club_id = 'club_nuevo'")!.n).toBe(2);
  });

  it("un entrenador no puede configurar el club", () => {
    expect(statusOf(() => completeOnboarding(coach(), { teams: ["cada"], need: { team: "cada", position: "LD", level_min: 3, foot: "indiferent", text: "No permitido." } }))).toBe(403);
  });
});

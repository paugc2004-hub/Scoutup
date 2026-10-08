import { describe, expect, it } from "vitest";
import { WEIGHTS, computeMatch, matchTone } from "@/lib/matching";
import type { MatchOffer, MatchPlayer } from "@/lib/matching";

const now = new Date("2026-10-08T12:00:00Z");
const offer: MatchOffer = {
  position: "DC", accepts_secondary: true, gender: "M", birth_year_min: 2008, birth_year_max: 2010, level_min: 2,
  zone_city: "Sabadell", zone_lat: 41.5486, zone_lng: 2.1074, max_km: 30, foot: "esquerre", height_min: 180, traits: ["joc_aeri"], availability_req: "temporada",
};
const ideal: MatchPlayer = {
  primary_position: "DC", secondary_positions: [], birth_year: 2009, gender: "M", division_rank: 1, lat: 41.55, lng: 2.11, city: "Sabadell",
  availability: "obert", foot: "esquerre", height_cm: 186, attrs: { joc_aeri: 9 }, prev_minutes: 2400, prev_matches: 28, prev_starts: 25,
  career_seasons: 4, stats_verified: true,
};

describe("motor de compatibilitat", () => {
  it("els pesos sumen 100", () => {
    expect(Object.values(WEIGHTS).reduce((a, w) => a + w.weight, 0)).toBe(100);
  });

  it("un jugador ideal obté el 100% amb tots els factors explicats", () => {
    const m = computeMatch(ideal, offer, now);
    expect(m.score).toBe(100);
    expect(m.factors).toHaveLength(7);
    for (const f of m.factors) {
      expect(f.detail.length).toBeGreaterThan(5);
      expect(f.status).toBe("ok");
    }
    expect(m.gaps).toHaveLength(0);
  });

  it("la puntuació sempre és entre 0 i 100 i és determinista", () => {
    const worst: MatchPlayer = { ...ideal, primary_position: "POR", division_rank: 5, birth_year: 1995, lat: 40.4, lng: -3.7, availability: "no_disponible", foot: "dret", height_cm: 160, attrs: {}, prev_minutes: 0, prev_matches: 0, prev_starts: 0, career_seasons: 0, stats_verified: false };
    const a = computeMatch(worst, offer, now);
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThan(20);
    expect(computeMatch(worst, offer, now)).toEqual(a);
  });

  it("un altre gènere no és elegible (0%)", () => {
    const m = computeMatch({ ...ideal, gender: "F" }, offer, now);
    expect(m.eligible).toBe(false);
    expect(m.score).toBe(0);
  });

  it("la posició secundària puntua menys que la principal i s'explica", () => {
    const m = computeMatch({ ...ideal, primary_position: "MCD", secondary_positions: ["DC"] }, offer, now);
    const pos = m.factors.find((f) => f.key === "posicio")!;
    expect(pos.score).toBeLessThan(25);
    expect(pos.detail).toMatch(/secundaria/);
  });

  it("parla de compatibilitat, no de probabilitat de fitxatge", () => {
    expect(matchTone(87)).toBe("high");
    expect(matchTone(65)).toBe("mid");
    expect(matchTone(30)).toBe("low");
  });
});

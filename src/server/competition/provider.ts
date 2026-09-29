/**
 * Capa d'abstracció de dades de competició.
 *
 * Tota la informació competitiva (competicions, grups, classificacions) arriba a l'aplicació
 * a través d'un `CompetitionDataProvider`. Avui només existeix el `MockCompetitionProvider`,
 * que llegeix dades FICTÍCIES de la base de dades de demo.
 *
 * `FCFCompetitionProvider` és un esquelet buit: NO es connecta a la FCF, NO fa scraping i
 * NO fa servir cap API. Només mostra on s'hi podria connectar una font oficial en el futur,
 * si mai s'arribés a un acord amb les condicions que es definissin conjuntament.
 */
import { all, get } from "@/server/db/client";

export type Competition = { id: string; season_id: string; name: string; category: string; gender: string; division: string; level_rank: number; group_name: string; source: string };
export type Standing = { pos: number; team_name: string; club_id: string | null; team_id: string | null; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number };

export interface CompetitionDataProvider {
  readonly id: "mock" | "fcf";
  readonly label: string;
  readonly isOfficial: boolean;
  competitionForTeam(teamId: string, seasonId: string): Competition | null;
  standings(competitionId: string): Standing[];
  competitions(seasonId: string): Competition[];
}

export class MockCompetitionProvider implements CompetitionDataProvider {
  readonly id = "mock" as const;
  readonly label = "Dades de demostració (fictícies)";
  readonly isOfficial = false;
  competitionForTeam(teamId: string, seasonId: string): Competition | null {
    return get<Competition>("SELECT c.* FROM team_seasons ts JOIN competitions c ON c.id = ts.competition_id WHERE ts.team_id = ? AND ts.season_id = ?", teamId, seasonId) ?? null;
  }
  standings(competitionId: string): Standing[] {
    return all<Standing>("SELECT pos, team_name, club_id, team_id, played, won, drawn, lost, gf, ga, points FROM competition_standings WHERE competition_id = ? ORDER BY pos", competitionId);
  }
  competitions(seasonId: string): Competition[] {
    return all<Competition>("SELECT * FROM competitions WHERE season_id = ? ORDER BY level_rank, name", seasonId);
  }
}

/** Esquelet per a una futura integració oficial. Deliberadament no implementat. */
export class FCFCompetitionProvider implements CompetitionDataProvider {
  readonly id = "fcf" as const;
  readonly label = "Font oficial (no disponible: pendent de definir amb la FCF)";
  readonly isOfficial = true;
  private unavailable(): never {
    throw new Error("FCFCompetitionProvider no està implementat: no hi ha cap connexió ni acord amb la FCF.");
  }
  competitionForTeam(): Competition | null { return this.unavailable(); }
  standings(): Standing[] { return this.unavailable(); }
  competitions(): Competition[] { return this.unavailable(); }
}

/** La demo sempre fa servir el proveïdor mock, independentment de la configuració. */
export function competitionProvider(): CompetitionDataProvider {
  if (process.env.COMPETITION_PROVIDER === "fcf") {
    console.warn("[ScoutUp] COMPETITION_PROVIDER=fcf no està disponible a la demo. S'utilitzen dades de demostració.");
  }
  return new MockCompetitionProvider();
}

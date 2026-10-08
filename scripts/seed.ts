/**
 * Reinicia la base de dades de la demo i hi carrega les dades de demostració.
 *   npm run seed
 */
import { db, dbPath, resetDatabase } from "../src/server/db/client.ts";

const { ms } = resetDatabase(db());
const count = (t: string) => (db().prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
console.log(`\nScoutUp · base de dades de demo creada a ${dbPath()} (${ms} ms)\n`);
for (const t of ["clubs", "teams", "players", "offers", "applications", "pipeline_entries", "conversations", "messages", "events", "notifications", "evaluations", "scout_reports", "roster_entries", "competitions", "competition_standings"]) {
  console.log(`  ${t.padEnd(24)} ${count(t)}`);
}
console.log("\nUsuaris de demo (contrasenya: demo):");
console.log("  director@scoutup.demo     · Directora esportiva (CF Vallès Nord)");
console.log("  coordinacio@scoutup.demo  · Coordinador de futbol base (CF Vallès Nord)");
console.log("  coach@scoutup.demo        · Entrenador Juvenil A (CF Vallès Nord)");
console.log("  club-b@scoutup.demo       · Direcció del FC Mediterrani (Club B, per provar l'aïllament)");
console.log("  player@scoutup.demo       · Jugador (Pol Serra Batlle) — per simular respostes");
console.log("  tutor@scoutup.demo        · Tutora legal (Anna Font, mare d'en Nil)\n");

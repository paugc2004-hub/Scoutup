/**
 * Reinicia la base de datos de la demo y carga los datos de demostración.
 *   npm run seed
 */
import { db, dbPath, resetDatabase } from "../src/server/db/client.ts";

const { ms } = resetDatabase(db());
const count = (t: string) => (db().prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
console.log(`\nScoutUp · base de datos de demo creada en ${dbPath()} (${ms} ms)\n`);
for (const t of ["clubs", "teams", "players", "offers", "applications", "pipeline_entries", "conversations", "messages", "events", "notifications", "evaluations", "scout_reports", "roster_entries", "competitions", "competition_standings"]) {
  console.log(`  ${t.padEnd(24)} ${count(t)}`);
}
console.log("\nUsuarios de demo (contraseña: demo):");
console.log("  director@scoutup.demo     · Directora deportiva (CF Vallès Nord)");
console.log("  coordinacio@scoutup.demo  · Coordinador de fútbol base (CF Vallès Nord)");
console.log("  coach@scoutup.demo        · Entrenador Juvenil A (CF Vallès Nord)");
console.log("  club-b@scoutup.demo       · Dirección del FC Mediterrani (Club B, para probar el aislamiento)");
console.log("  player@scoutup.demo       · Jugador (Pol Serra Batlle) — para simular respuestas");
console.log("  tutor@scoutup.demo        · Tutora legal (Anna Font, madre de Nil)\n");

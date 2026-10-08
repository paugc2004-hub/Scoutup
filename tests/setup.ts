import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Cada procés de test fa servir la seva pròpia base de dades temporal (mai la de desenvolupament).
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scoutup-test-"));
process.env.SCOUTUP_DB = path.join(dir, "test.db");
process.env.SCOUTUP_LOG = "silent";

/**
 * Esquema SQLite de la demo de ScoutUp.
 *
 * Una sola font de veritat per a totes les taules. Les columnes JSON es guarden com a TEXT
 * i es llegeixen amb `parseJson` (src/server/db/client.ts). Totes les dates són ISO 8601.
 */
export const SCHEMA_VERSION = 3;

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('director','coach','player','guardian')),
  title TEXT,
  club_id TEXT,
  team_id TEXT,
  player_id TEXT,
  avatar_hue INTEGER DEFAULT 150,
  is_demo_login INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color_primary TEXT NOT NULL,
  color_secondary TEXT NOT NULL,
  founded INTEGER,
  city TEXT NOT NULL,
  comarca TEXT NOT NULL,
  province TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Espanya',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  website TEXT,
  instagram TEXT,
  email TEXT,
  phone TEXT,
  office_hours TEXT,
  languages TEXT,
  description TEXT,
  history TEXT,
  philosophy TEXT,
  values_text TEXT,
  objectives TEXT,
  sporting_model TEXT,
  facilities TEXT,
  tier INTEGER NOT NULL DEFAULT 3,
  verified INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  gender TEXT NOT NULL,
  division TEXT NOT NULL,
  level_rank INTEGER NOT NULL,
  group_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'mock'
);

CREATE TABLE IF NOT EXISTS competition_standings (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  club_id TEXT,
  team_id TEXT,
  pos INTEGER NOT NULL,
  played INTEGER NOT NULL,
  won INTEGER NOT NULL,
  drawn INTEGER NOT NULL,
  lost INTEGER NOT NULL,
  gf INTEGER NOT NULL,
  ga INTEGER NOT NULL,
  points INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'M',
  is_first_team INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS team_seasons (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id TEXT NOT NULL,
  competition_id TEXT,
  coach_name TEXT,
  coordinator_name TEXT,
  delegate_name TEXT,
  staff TEXT,
  objectives TEXT,
  needs TEXT,
  UNIQUE (team_id, season_id)
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'M',
  birth_date TEXT NOT NULL,
  nationality TEXT NOT NULL DEFAULT 'Espanyola',
  languages TEXT,
  city TEXT NOT NULL,
  comarca TEXT NOT NULL,
  province TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Espanya',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  primary_position TEXT NOT NULL,
  secondary_positions TEXT,
  foot TEXT NOT NULL DEFAULT 'dret',
  height_cm INTEGER,
  club_id TEXT,
  team_id TEXT,
  club_name_free TEXT,
  category TEXT NOT NULL,
  division_rank INTEGER NOT NULL DEFAULT 4,
  style TEXT,
  description TEXT,
  availability TEXT NOT NULL DEFAULT 'obert',
  available_from TEXT,
  contract_status TEXT NOT NULL DEFAULT 'amb_fitxa',
  attrs TEXT NOT NULL,
  avatar_hue INTEGER NOT NULL DEFAULT 150,
  verification TEXT NOT NULL DEFAULT 'self',
  guardian_user_id TEXT,
  guardian_email TEXT,
  guardian_consent INTEGER NOT NULL DEFAULT 0,
  preferences TEXT,
  privacy TEXT,
  completeness INTEGER NOT NULL DEFAULT 0,
  onboarding_done INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS player_career (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_label TEXT NOT NULL,
  club_name TEXT NOT NULL,
  club_id TEXT,
  team_name TEXT,
  category TEXT,
  division TEXT,
  role TEXT,
  verification TEXT NOT NULL DEFAULT 'self',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_experiences (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER
);

CREATE TABLE IF NOT EXISTS player_stats (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id TEXT NOT NULL,
  team_name TEXT,
  matches INTEGER NOT NULL DEFAULT 0,
  starts INTEGER NOT NULL DEFAULT 0,
  minutes INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  yellow INTEGER NOT NULL DEFAULT 0,
  red INTEGER NOT NULL DEFAULT 0,
  callups INTEGER NOT NULL DEFAULT 0,
  clean_sheets INTEGER NOT NULL DEFAULT 0,
  verification TEXT NOT NULL DEFAULT 'self',
  updated_at TEXT NOT NULL,
  UNIQUE (player_id, season_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_label TEXT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  duration_s INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  team_id TEXT,
  kind TEXT NOT NULL DEFAULT 'incorporacio',
  title TEXT NOT NULL,
  position TEXT NOT NULL,
  accepts_secondary INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'M',
  birth_year_min INTEGER NOT NULL,
  birth_year_max INTEGER NOT NULL,
  level_min INTEGER NOT NULL DEFAULT 4,
  zone_city TEXT NOT NULL,
  zone_lat REAL NOT NULL,
  zone_lng REAL NOT NULL,
  max_km INTEGER NOT NULL DEFAULT 30,
  foot TEXT NOT NULL DEFAULT 'indiferent',
  height_min INTEGER,
  traits TEXT,
  availability_req TEXT,
  description TEXT,
  restrictions TEXT,
  trial_date TEXT,
  status TEXT NOT NULL DEFAULT 'oberta',
  created_by TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  origin TEXT NOT NULL DEFAULT 'jugador',
  status TEXT NOT NULL,
  message TEXT,
  match_score INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (offer_id, player_id)
);

CREATE TABLE IF NOT EXISTS pipeline_entries (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  team_id TEXT,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  offer_id TEXT,
  stage TEXT NOT NULL,
  added_by TEXT,
  sort REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, player_id)
);

CREATE TABLE IF NOT EXISTS pipeline_activity (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  entry_id TEXT,
  user_id TEXT,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS contact_requests (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team_id TEXT,
  from_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  conversation_id TEXT,
  created_at TEXT NOT NULL,
  responded_at TEXT,
  guardian_decided_at TEXT
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team_id TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'activa',
  created_at TEXT NOT NULL,
  last_message_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id TEXT,
  sender_side TEXT NOT NULL,
  body TEXT NOT NULL,
  flagged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  read_by_club_at TEXT,
  read_by_player_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  created_at TEXT NOT NULL,
  read_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  club_id TEXT,
  team_id TEXT,
  player_id TEXT,
  owner_user_id TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  location TEXT,
  opponent TEXT,
  notes TEXT,
  related_player_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  team_id TEXT,
  scores TEXT NOT NULL,
  decision TEXT NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (club_id, player_id, author_user_id)
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  team_id TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scout_reports (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  team_id TEXT,
  player_id TEXT NOT NULL,
  match_title TEXT NOT NULL,
  match_date TEXT NOT NULL,
  competition TEXT,
  position_observed TEXT,
  rating INTEGER NOT NULL,
  observations TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  reminder_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roster_entries (
  id TEXT PRIMARY KEY,
  team_season_id TEXT NOT NULL REFERENCES team_seasons(id) ON DELETE CASCADE,
  player_id TEXT,
  external_name TEXT,
  shirt INTEGER,
  position TEXT NOT NULL,
  foot TEXT NOT NULL DEFAULT 'dret',
  status TEXT NOT NULL DEFAULT 'rotacio',
  rating REAL,
  trend INTEGER NOT NULL DEFAULT 0,
  birth_year INTEGER
);

CREATE TABLE IF NOT EXISTS profile_views (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  viewer_user_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (player_id, club_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'rebuda',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_players_club ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_offers_club ON offers(club_id);
CREATE INDEX IF NOT EXISTS idx_apps_offer ON applications(offer_id);
CREATE INDEX IF NOT EXISTS idx_apps_player ON applications(player_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_club ON pipeline_entries(club_id);
CREATE INDEX IF NOT EXISTS idx_msgs_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_events_club ON events(club_id);
CREATE INDEX IF NOT EXISTS idx_events_player ON events(player_id);
`;

export const TABLES_IN_DROP_ORDER = [
  "reports", "blocks", "profile_views", "roster_entries", "scout_reports", "notes", "evaluations",
  "events", "notifications", "messages", "conversations", "contact_requests", "favorites",
  "pipeline_activity", "pipeline_entries", "applications", "offers", "videos", "achievements",
  "player_stats", "player_experiences", "player_career", "players", "team_seasons", "teams",
  "competition_standings", "competitions", "clubs", "seasons", "sessions", "users", "meta",
];

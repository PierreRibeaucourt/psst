-- Un foyer : identifiant opaque + hash du jeton d'accès.
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Enregistrements chiffrés. seq croît à chaque écriture : c'est le curseur de synchro.
CREATE TABLE IF NOT EXISTS records (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id TEXT NOT NULL REFERENCES households(id),
  rid TEXT NOT NULL,
  blob TEXT NOT NULL,
  UNIQUE (household_id, rid)
);

CREATE INDEX IF NOT EXISTS records_by_household ON records (household_id, seq);

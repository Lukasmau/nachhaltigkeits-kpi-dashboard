import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datum TEXT NOT NULL,
    datenart TEXT NOT NULL,
    kategorie TEXT NOT NULL,
    wert REAL NOT NULL,
    einheit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kategorie TEXT NOT NULL UNIQUE,
    einheit TEXT NOT NULL,
    faktor_kg_co2e_pro_einheit REAL NOT NULL,
    quelle TEXT NOT NULL,
    stand TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS targets (
    kategorie TEXT NOT NULL,
    jahr INTEGER NOT NULL,
    ziel_kg_co2e REAL NOT NULL,
    PRIMARY KEY (kategorie, jahr)
);
"""


def verbindung(db_pfad: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_pfad)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_pfad: str) -> None:
    conn = verbindung(db_pfad)
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()

import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datum TEXT NOT NULL,
    datenart TEXT NOT NULL,
    kategorie TEXT NOT NULL,
    wert REAL NOT NULL,
    einheit TEXT NOT NULL,
    person TEXT
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
    # check_same_thread=False: FastAPI fuehrt synchrone Endpunkte und ihre
    # Depends()-Funktionen im selben Request manchmal in verschiedenen
    # Threadpool-Threads aus. Jede Anfrage bekommt trotzdem ihre eigene,
    # neue Verbindung (siehe api.py get_conn) - nie zwei Requests dieselbe.
    conn = sqlite3.connect(db_pfad, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_pfad: str) -> None:
    conn = verbindung(db_pfad)
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def messungen_mit_co2e(conn: sqlite3.Connection, jahr: int, monat: int) -> list[dict]:
    monat_text = f"{jahr:04d}-{monat:02d}"
    rows = conn.execute(
        """
        SELECT m.kategorie, m.wert * f.faktor_kg_co2e_pro_einheit AS co2e_kg
        FROM measurements m
        LEFT JOIN factors f ON f.kategorie = m.kategorie
        WHERE substr(m.datum, 1, 7) = ?
        """,
        (monat_text,),
    ).fetchall()
    return [dict(row) for row in rows]


def jahresziel_gesamt(conn: sqlite3.Connection, jahr: int) -> float | None:
    row = conn.execute(
        "SELECT SUM(ziel_kg_co2e) AS summe FROM targets WHERE jahr = ?",
        (jahr,),
    ).fetchone()
    return row["summe"]

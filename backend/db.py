import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datum TEXT NOT NULL,
    datenart TEXT NOT NULL,
    kategorie TEXT NOT NULL,
    wert REAL NOT NULL,
    einheit TEXT NOT NULL,
    person TEXT,
    quelle_datei TEXT
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
    # Migration fuer Datenbanken, die vor der quelle_datei-Spalte angelegt wurden
    # (CREATE TABLE IF NOT EXISTS legt keine fehlenden Spalten in bestehenden Tabellen an).
    spalten = [row["name"] for row in conn.execute("PRAGMA table_info(measurements)").fetchall()]
    if "quelle_datei" not in spalten:
        conn.execute("ALTER TABLE measurements ADD COLUMN quelle_datei TEXT")
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


def letzte_messungen(
    conn: sqlite3.Connection, limit: int = 5, datenart: str | None = None
) -> list[dict]:
    if datenart is None:
        rows = conn.execute(
            """
            SELECT datum, datenart, kategorie, wert, einheit, person, quelle_datei
            FROM measurements ORDER BY id DESC LIMIT ?
            """,
            (limit,),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT datum, datenart, kategorie, wert, einheit, person, quelle_datei
            FROM measurements WHERE datenart = ? ORDER BY id DESC LIMIT ?
            """,
            (datenart, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def messungen_mit_co2e_jahr(conn: sqlite3.Connection, jahr: int) -> list[dict]:
    rows = conn.execute(
        """
        SELECT m.kategorie, m.wert * f.faktor_kg_co2e_pro_einheit AS co2e_kg
        FROM measurements m
        LEFT JOIN factors f ON f.kategorie = m.kategorie
        WHERE substr(m.datum, 1, 4) = ?
        """,
        (f"{jahr:04d}",),
    ).fetchall()
    return [dict(row) for row in rows]


def jahresziel_gesamt(conn: sqlite3.Connection, jahr: int) -> float | None:
    row = conn.execute(
        "SELECT SUM(ziel_kg_co2e) AS summe FROM targets WHERE jahr = ?",
        (jahr,),
    ).fetchone()
    return row["summe"]


def setze_jahresziel(conn: sqlite3.Connection, jahr: int, ziel_kg_co2e: float) -> None:
    conn.execute(
        """
        INSERT INTO targets (kategorie, jahr, ziel_kg_co2e)
        VALUES ('Gesamt', ?, ?)
        ON CONFLICT(kategorie, jahr) DO UPDATE SET ziel_kg_co2e = excluded.ziel_kg_co2e
        """,
        (jahr, ziel_kg_co2e),
    )
    conn.commit()


def alle_messungen_roh(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """
        SELECT datum, datenart, kategorie, wert, einheit, person
        FROM measurements ORDER BY datum, id
        """
    ).fetchall()
    return [dict(row) for row in rows]


def fruehester_monat(conn: sqlite3.Connection) -> tuple[int, int] | None:
    row = conn.execute("SELECT MIN(datum) AS frueheste FROM measurements").fetchone()
    if row["frueheste"] is None:
        return None
    jahr, monat = row["frueheste"].split("-")[:2]
    return int(jahr), int(monat)


def alle_jahresziele(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT jahr, SUM(ziel_kg_co2e) AS ziel_kg_co2e FROM targets GROUP BY jahr ORDER BY jahr DESC"
    ).fetchall()
    return [dict(row) for row in rows]

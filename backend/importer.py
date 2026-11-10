import sqlite3
from datetime import date

import polars as pl

GUELTIGE_DATENARTEN = {"verbrauch", "fahrt"}


def gueltige_kategorien(conn: sqlite3.Connection) -> dict[str, str]:
    rows = conn.execute("SELECT kategorie, einheit FROM factors").fetchall()
    return {row["kategorie"]: row["einheit"] for row in rows}


def pruefe_zeile(zeile: dict, kategorien: dict[str, str]) -> list[dict]:
    fehler = []

    datum_text = zeile.get("datum") or ""
    try:
        date.fromisoformat(datum_text)
    except ValueError:
        fehler.append(
            {
                "spalte": "datum",
                "grund": f"'{datum_text}' ist kein gültiges Datum",
                "tipp": "erwartet JJJJ-MM-TT",
            }
        )

    wert_text = zeile.get("wert") or ""
    try:
        wert = float(wert_text)
    except ValueError:
        fehler.append(
            {
                "spalte": "wert",
                "grund": f"'{wert_text}' ist keine Zahl",
                "tipp": "Zahl mit Punkt als Dezimaltrennzeichen, z. B. 1250.5",
            }
        )
    else:
        if wert < 0:
            fehler.append(
                {
                    "spalte": "wert",
                    "grund": f"{wert_text} ist negativ",
                    "tipp": "Wert muss 0 oder größer sein",
                }
            )

    datenart = zeile.get("datenart") or ""
    if datenart not in GUELTIGE_DATENARTEN:
        fehler.append(
            {
                "spalte": "datenart",
                "grund": f"'{datenart}' ist keine bekannte Datenart",
                "tipp": "Erlaubt: verbrauch, fahrt",
            }
        )

    kategorie = zeile.get("kategorie") or ""
    erwartete_einheit = kategorien.get(kategorie)
    if erwartete_einheit is None:
        fehler.append(
            {
                "spalte": "kategorie",
                "grund": f"'{kategorie}' ist keine bekannte Kategorie",
                "tipp": f"Erlaubt: {', '.join(sorted(kategorien))}",
            }
        )
    else:
        einheit = zeile.get("einheit") or ""
        if einheit != erwartete_einheit:
            fehler.append(
                {
                    "spalte": "einheit",
                    "grund": f"'{einheit}' passt nicht zu {kategorie}",
                    "tipp": f"Erwartet: {erwartete_einheit}",
                }
            )

    return fehler


def pruefe_duplikat(conn: sqlite3.Connection, zeile: dict) -> str | None:
    datenart = zeile.get("datenart")
    kategorie = zeile.get("kategorie")
    datum = zeile.get("datum") or ""

    if datenart == "verbrauch":
        monat = datum[:7]
        vorhanden = conn.execute(
            """
            SELECT 1 FROM measurements
            WHERE datenart = 'verbrauch' AND kategorie = ? AND substr(datum, 1, 7) = ?
            """,
            (kategorie, monat),
        ).fetchone()
        if vorhanden:
            return f"{kategorie} für {monat} ist bereits vorhanden"

    elif datenart == "fahrt":
        person = zeile.get("person") or ""
        vorhanden = conn.execute(
            """
            SELECT 1 FROM measurements
            WHERE datenart = 'fahrt' AND kategorie = ? AND datum = ? AND person = ?
            """,
            (kategorie, datum, person),
        ).fetchone()
        if vorhanden:
            wer = person or "(ohne Namen)"
            return f"Fahrt von {wer} am {datum} für {kategorie} existiert bereits"

    return None


def importiere_csv(conn: sqlite3.Connection, csv_pfad: str, quelle_datei: str | None = None) -> dict:
    kategorien = gueltige_kategorien(conn)
    zeilen = pl.read_csv(csv_pfad, infer_schema_length=0).to_dicts()

    importiert = 0
    fehler = []
    warnungen = []

    for index, zeile in enumerate(zeilen):
        zeile_nr = index + 2  # Zeile 1 ist die Kopfzeile

        fachfehler = pruefe_zeile(zeile, kategorien)
        if fachfehler:
            for f in fachfehler:
                fehler.append({**f, "zeile": zeile_nr})
            continue

        duplikat_grund = pruefe_duplikat(conn, zeile)
        if duplikat_grund and zeile.get("datenart") == "verbrauch":
            fehler.append(
                {
                    "zeile": zeile_nr,
                    "spalte": "duplikat",
                    "grund": duplikat_grund,
                    "tipp": "Zeile übersprungen, bereits vorhandene Werte nicht erneut eintragen",
                }
            )
            continue

        if duplikat_grund and zeile.get("datenart") == "fahrt":
            warnungen.append({"zeile": zeile_nr, "grund": duplikat_grund})

        conn.execute(
            """
            INSERT INTO measurements (datum, datenart, kategorie, wert, einheit, person, quelle_datei)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                zeile["datum"],
                zeile["datenart"],
                zeile["kategorie"],
                float(zeile["wert"]),
                zeile["einheit"],
                zeile.get("person"),
                quelle_datei,
            ),
        )
        importiert += 1

    conn.commit()
    return {"importiert": importiert, "fehler": fehler, "warnungen": warnungen}

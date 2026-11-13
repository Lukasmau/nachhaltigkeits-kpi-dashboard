"""Leert nur die Tabelle `measurements` der SQLite-DB (Demo-Reset).

factors und targets (Jahresziel) bleiben unberuehrt.
Vorher wird automatisch eine Kopie der DB als *.backup-<zeit>.db angelegt.

Benutzung (im Projektordner):
    python reset_measurements.py              # sucht *.db / *.sqlite selbst
    python reset_measurements.py pfad/zur.db  # oder Pfad angeben
Backend vorher kurz stoppen, dann wieder starten.
"""
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path


def find_db():
    skip = {"node_modules", ".git", ".venv", "venv", "__pycache__"}
    found = [
        p for ext in ("*.db", "*.sqlite", "*.sqlite3")
        for p in Path(".").rglob(ext)
        if not (skip & set(p.parts)) and ".backup-" not in p.name
    ]
    return found


def main():
    if len(sys.argv) > 1:
        db = Path(sys.argv[1])
    else:
        found = find_db()
        if len(found) != 1:
            print("Gefunden:", [str(p) for p in found] or "nichts")
            print("Bitte Pfad angeben: python reset_measurements.py pfad/zur.db")
            sys.exit(1)
        db = found[0]

    if not db.exists():
        print(f"Datei nicht gefunden: {db}")
        sys.exit(1)

    con = sqlite3.connect(db)
    tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if "measurements" not in tables:
        print(f"Keine Tabelle 'measurements' in {db}. Tabellen: {sorted(tables)}")
        sys.exit(1)

    def count(t):
        return con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]

    print(f"DB: {db}")
    for t in ("measurements", "factors", "targets"):
        if t in tables:
            print(f"  vorher  {t}: {count(t)} Zeilen")
    con.close()

    backup = db.with_name(f"{db.stem}.backup-{datetime.now():%Y%m%d-%H%M%S}{db.suffix}")
    shutil.copy2(db, backup)
    print(f"Backup: {backup}")

    con = sqlite3.connect(db)
    with con:
        con.execute("DELETE FROM measurements")
    for t in ("measurements", "factors", "targets"):
        if t in tables:
            print(f"  nachher {t}: {con.execute(f'SELECT COUNT(*) FROM \"{t}\"').fetchone()[0]} Zeilen")
    con.close()
    print("Fertig. Zurueck: Backup-Datei auf den Original-Namen kopieren.")


if __name__ == "__main__":
    main()

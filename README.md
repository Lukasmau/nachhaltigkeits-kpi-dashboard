# Nachhaltigkeits-KPI-Dashboard

DVA-Seminar (THA Augsburg, Thema 24): zeigt CO₂e-Kennzahlen einer fiktiven Firma
(Strom, Erdgas, Dienstreisen) auf Basis von CSV-Importen. Details zu Konzept,
Datenmodell und Entscheidungen stehen in [CLAUDE.md](CLAUDE.md).

**Bewusst nicht enthalten:** CSRD/ESRS-Berichte, Live-Sensordaten, externe
Emissionsdatenbanken (siehe CLAUDE.md für die Begründung).

## Voraussetzungen

- Python 3.12 oder neuer
- Node.js 18 oder neuer

## Starten

Einmalig einrichten:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd frontend
npm install
cd ..
```

Danach reicht ein Doppelklick auf `start.bat` im Projekt-Hauptverzeichnis:
öffnet zwei Fenster, eins für Backend, eins für Frontend. Schließt man die
Fenster, laufen beide Server nicht mehr.

Von Hand (z. B. um die Ausgabe in einem Terminal zu sehen) geht es auch
einzeln:

```bash
# Backend, läuft unter http://localhost:8000
.venv\Scripts\activate
uvicorn backend.api:app --reload
```

Beim ersten Start wird `dashboard.db` automatisch angelegt und mit den
Emissionsfaktoren befüllt (siehe `backend/seed/faktoren.py`, Quelle und
Stand je Faktor in CLAUDE.md §5).

```bash
# Frontend, läuft unter http://localhost:5173, in einem zweiten Terminal
cd frontend
npm run dev
```

Vite leitet `/api`-Anfragen an das Backend auf Port 8000 weiter (siehe
`frontend/vite.config.ts`).

## Testdaten einspielen (optional)

Das Dashboard ist ohne Daten leer. Kleiner Testdatensatz (3 Monate) unter
`data/testdaten_minimal.csv`. Am einfachsten über die Import-Seite im
Frontend (Drag & Drop oder Datei wählen). Geht auch über die Backend-Doku:

1. <http://localhost:8000/docs> öffnen
2. Endpunkt `POST /api/import` aufklappen, "Try it out"
3. `data/testdaten_minimal.csv` als Datei hochladen, ausführen

Die Antwort zeigt, wie viele Zeilen importiert wurden und ob es Fehler oder
Warnungen gab (siehe `backend/importer.py` für die Prüfregeln).

## Beispieldaten für die Demo

Fiktive Firma, 24 Monate (Dezember 2024 bis November 2026), erzeugt mit
`python -m backend.seed.beispieldaten`:

- `data/beispieldaten_24_monate.csv`: gültige Daten für den Import
- `data/beispieldaten_fehler.csv`: absichtliche Fehler für den Import-Test

Mit `python reset_measurements.py` werden alle Messwerte gelöscht (Faktoren und
Jahresziel bleiben, vorher entsteht eine Sicherung `dashboard.backup-*.db`).

## Jahresziel setzen

Über die Jahresziel-Seite im Frontend (`GET`/`POST /api/jahresziel`,
ein Wert pro Jahr, siehe CLAUDE.md §4 zur Vereinfachung auf ein
Gesamtziel).

## Tests

```bash
pytest
```

## Projektstruktur

```
backend/
  core/       units.py, kpis.py – reine Python-Logik, keine Fremd-Importe
  db.py       SQLite-Schema und -Abfragen (nur SQL)
  importer.py CSV-Import mit Polars, Teil-Import, Fachprüfungen
  api.py      FastAPI-Endpunkte
  seed/       Emissionsfaktoren-Stammdaten
frontend/
  src/tokens.ts  Design-Tokens (Farben), einzige Quelle für CSS und ECharts
  src/components Dashboard-Komponenten
tests/        pytest, ein Testmodul je Backend-Modul
data/         Testdaten und UBA-Belegdateien für die Emissionsfaktoren
```

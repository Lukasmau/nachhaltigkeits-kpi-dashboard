# Nachhaltigkeits-KPI-Dashboard

DVA-Seminar (THA Augsburg, Thema 24): zeigt CO₂e-Kennzahlen einer fiktiven Firma
(Strom, Erdgas, Dienstreisen) auf Basis von CSV-Importen. Details zu Konzept,
Datenmodell und Entscheidungen stehen in [CLAUDE.md](CLAUDE.md).

**Bewusst nicht enthalten:** CSRD/ESRS-Berichte, Live-Sensordaten, externe
Emissionsdatenbanken (siehe CLAUDE.md für die Begründung).

## Voraussetzungen

- Python 3.12 oder neuer
- Node.js 18 oder neuer

## Backend starten

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.api:app --reload
```

Läuft unter <http://localhost:8000>. Beim ersten Start wird `dashboard.db`
automatisch angelegt und mit den Emissionsfaktoren befüllt (siehe
`backend/seed/faktoren.py`, Quelle und Stand je Faktor in CLAUDE.md §5).

## Frontend starten

In einem zweiten Terminal, bei laufendem Backend:

```bash
cd frontend
npm install
npm run dev
```

Läuft unter <http://localhost:5173> (Vite leitet `/api`-Anfragen an das
Backend auf Port 8000 weiter, siehe `frontend/vite.config.ts`).

## Testdaten einspielen (optional)

Das Dashboard ist ohne Daten leer. Kleiner Testdatensatz (3 Monate) unter
`data/testdaten_minimal.csv`:

1. Backend-Doku öffnen: <http://localhost:8000/docs>
2. Endpunkt `POST /api/import` aufklappen, "Try it out"
3. `data/testdaten_minimal.csv` als Datei hochladen, ausführen

Die Antwort zeigt, wie viele Zeilen importiert wurden und ob es Fehler oder
Warnungen gab (siehe `backend/importer.py` für die Prüfregeln).

## Jahresziel setzen

Dafür gibt es aktuell noch keinen eigenen Endpunkt — ein Ziel muss direkt in
die Datenbank eingetragen werden, zum Beispiel:

```bash
python -c "from backend.db import verbindung; conn = verbindung('dashboard.db'); conn.execute(\"INSERT INTO targets (kategorie, jahr, ziel_kg_co2e) VALUES ('Gesamt', 2026, 12000)\"); conn.commit()"
```

(`kategorie = 'Gesamt'` ist eine bewusste Vereinfachung, siehe CLAUDE.md §4.)

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

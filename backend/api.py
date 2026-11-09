import shutil
import sqlite3
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, UploadFile

from backend.core import kpis, units
from backend.db import init_db, jahresziel_gesamt, messungen_mit_co2e, verbindung
from backend.importer import importiere_csv
from backend.seed.faktoren import seed_faktoren

DB_PFAD = str(Path(__file__).resolve().parent.parent / "dashboard.db")


@asynccontextmanager
async def lifespan(app: FastAPI):
    neu_angelegt = not Path(DB_PFAD).exists()
    init_db(DB_PFAD)
    if neu_angelegt:
        conn = verbindung(DB_PFAD)
        seed_faktoren(conn)
        conn.close()
    yield


app = FastAPI(lifespan=lifespan)


def get_conn():
    conn = verbindung(DB_PFAD)
    try:
        yield conn
    finally:
        conn.close()


def vormonat(jahr: int, monat: int) -> tuple[int, int]:
    if monat == 1:
        return jahr - 1, 12
    return jahr, monat - 1


@app.get("/api/kpis")
def api_kpis(jahr: int, monat: int, conn: sqlite3.Connection = Depends(get_conn)):
    aktuelle_messungen = messungen_mit_co2e(conn, jahr, monat)
    v_jahr, v_monat = vormonat(jahr, monat)
    vormonat_messungen = messungen_mit_co2e(conn, v_jahr, v_monat)

    gesamt = kpis.co2e_im_monat(aktuelle_messungen)
    vormonat_gesamt = kpis.co2e_im_monat(vormonat_messungen)
    jahresziel = jahresziel_gesamt(conn, jahr)

    if gesamt["wert_kg"] is None:
        co2e_anzeige = {"wert": None, "einheit": "kg", "warnungen": gesamt["warnungen"]}
    else:
        wert, einheit = units.anzeige_einheit(gesamt["wert_kg"])
        co2e_anzeige = {"wert": wert, "einheit": einheit, "warnungen": gesamt["warnungen"]}

    return {
        "co2e_im_monat": co2e_anzeige,
        "anteil_je_kategorie": kpis.anteil_je_kategorie(aktuelle_messungen),
        "veraenderung_zum_vormonat": kpis.veraenderung_zum_vormonat(
            gesamt["wert_kg"], vormonat_gesamt["wert_kg"]
        ),
        "zielerreichung": kpis.zielerreichung(gesamt["wert_kg"], jahresziel),
    }


@app.get("/api/verlauf")
def api_verlauf(jahr: int, conn: sqlite3.Connection = Depends(get_conn)):
    # ein Diagramm nutzt nur eine Einheit (CLAUDE.md §4): die Einheit wird
    # einmal fuer die ganze Reihe bestimmt, nicht pro Monat einzeln.
    monatsergebnisse = [
        kpis.co2e_im_monat(messungen_mit_co2e(conn, jahr, monat)) for monat in range(1, 13)
    ]
    werte_kg = [ergebnis["wert_kg"] for ergebnis in monatsergebnisse]
    einheit = units.einheit_fuer_reihe(werte_kg)
    werte = units.reihe_in_einheit(werte_kg, einheit)

    return {
        "einheit": einheit,
        "monate": [
            {"monat": monat, "wert": wert, "warnungen": ergebnis["warnungen"]}
            for monat, wert, ergebnis in zip(range(1, 13), werte, monatsergebnisse)
        ],
    }


@app.post("/api/import")
def api_import(datei: UploadFile, conn: sqlite3.Connection = Depends(get_conn)):
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        shutil.copyfileobj(datei.file, tmp)
        tmp_pfad = tmp.name

    try:
        return importiere_csv(conn, tmp_pfad)
    finally:
        Path(tmp_pfad).unlink(missing_ok=True)

import shutil
import sqlite3
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, UploadFile
from pydantic import BaseModel, Field

from backend.core import kpis, units
from backend.db import (
    alle_faktoren,
    alle_jahresziele,
    alle_messungen_roh,
    fruehester_monat,
    init_db,
    jahresziel_gesamt,
    letzte_messungen,
    messungen_mit_co2e,
    messungen_mit_co2e_jahr,
    setze_jahresziel,
    verbindung,
)
from backend.importer import gueltige_kategorien, importiere_csv, pruefe_duplikat, pruefe_zeile
from backend.seed.faktoren import seed_faktoren

FAHRT_KATEGORIEN = Literal[
    "Dienstreisen Pkw", "Dienstreisen Bahn", "Dienstreisen Bus", "Dienstreisen Flug"
]


class FahrtEingabe(BaseModel):
    datum: str
    kategorie: FAHRT_KATEGORIEN
    wert: float
    person: str | None = None


class JahreszielEingabe(BaseModel):
    jahr: int
    ziel_kg_co2e: float = Field(ge=0)

DB_PFAD = str(Path(__file__).resolve().parent.parent / "dashboard.db")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db(DB_PFAD)
    # seed_faktoren ist ein Upsert (siehe faktoren.py): bei jedem Start
    # aufrufen, damit eine Aenderung an FAKTOREN auch in einer schon
    # bestehenden dashboard.db ankommt, nicht nur bei einer neuen DB.
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
    alle_messungen = [messungen_mit_co2e(conn, jahr, monat) for monat in range(1, 13)]
    monatsergebnisse = [kpis.co2e_im_monat(m) for m in alle_messungen]
    anteilsergebnisse = [kpis.anteil_je_kategorie(m) for m in alle_messungen]

    jahresziel = jahresziel_gesamt(conn, jahr)
    monatsziel_kg = jahresziel / 12 if jahresziel is not None else None

    # ein Diagramm nutzt nur eine Einheit (CLAUDE.md §4): die Einheit wird
    # einmal fuer die ganze Reihe bestimmt, nicht pro Monat einzeln - die
    # Ziel-Linie zaehlt dabei mit, sonst bliebe sie ohne Messungen in kg
    # "stecken", auch wenn das Ziel allein schon ueber der Tonnen-Schwelle liegt.
    werte_kg = [ergebnis["wert_kg"] for ergebnis in monatsergebnisse]
    einheit = units.einheit_fuer_reihe(werte_kg + [monatsziel_kg])
    werte = units.reihe_in_einheit(werte_kg, einheit)
    monatsziel = (
        units.reihe_in_einheit([monatsziel_kg], einheit)[0]
        if monatsziel_kg is not None
        else None
    )

    veraenderungen = [None] + [
        kpis.veraenderung_zum_vormonat(werte_kg[i], werte_kg[i - 1]) for i in range(1, 12)
    ]
    zielerreichungen = [kpis.zielerreichung(w, jahresziel) for w in werte_kg]

    # groesste Kategorie aus dem letzten Monat mit echten Anteilen bestimmen,
    # damit die Sparkline durchgehend dieselbe Kategorie zeigt statt jeden
    # Monat eine andere.
    groesste_kategorie = None
    for ergebnis in reversed(anteilsergebnisse):
        if ergebnis["anteile"]:
            groesste_kategorie = max(ergebnis["anteile"], key=ergebnis["anteile"].get)
            break

    anteile_groesste = [
        ergebnis["anteile"].get(groesste_kategorie)
        if ergebnis["anteile"] and groesste_kategorie
        else None
        for ergebnis in anteilsergebnisse
    ]

    return {
        "einheit": einheit,
        "groesste_kategorie": groesste_kategorie,
        "monatsziel": monatsziel,
        "monate": [
            {
                "monat": monat,
                "wert": wert,
                "veraenderung": veraenderung,
                "zielerreichung": zielerreichung,
                "anteil_groesste_kategorie": anteil,
                "anteile": anteile_ergebnis["anteile"] or {},
                "warnungen": ergebnis["warnungen"],
            }
            for monat, wert, veraenderung, zielerreichung, anteil, ergebnis, anteile_ergebnis in zip(
                range(1, 13),
                werte,
                veraenderungen,
                zielerreichungen,
                anteile_groesste,
                monatsergebnisse,
                anteilsergebnisse,
            )
        ],
    }


@app.get("/api/vergleich")
def api_vergleich(
    jahr_a: int,
    jahr_b: int,
    monat_a: int | None = None,
    monat_b: int | None = None,
    conn: sqlite3.Connection = Depends(get_conn),
):
    kategorien = list(gueltige_kategorien(conn).keys())

    if monat_a is not None and monat_b is not None:
        messungen_a = messungen_mit_co2e(conn, jahr_a, monat_a)
        messungen_b = messungen_mit_co2e(conn, jahr_b, monat_b)
    else:
        messungen_a = messungen_mit_co2e_jahr(conn, jahr_a)
        messungen_b = messungen_mit_co2e_jahr(conn, jahr_b)

    ergebnis_kg = kpis.vergleich_je_kategorie(messungen_a, messungen_b, kategorien)

    # ein Diagramm nutzt nur eine Einheit (CLAUDE.md §4): ueber alle Kategorien
    # und beide Zeitraeume hinweg einmal bestimmen, nicht pro Kategorie einzeln.
    alle_werte_kg = [
        wert
        for eintrag in ergebnis_kg.values()
        for wert in (eintrag["wert_a_kg"], eintrag["wert_b_kg"])
        if wert is not None
    ]
    einheit = units.einheit_fuer_reihe(alle_werte_kg)

    def in_einheit(wert_kg):
        return None if wert_kg is None else units.reihe_in_einheit([wert_kg], einheit)[0]

    return {
        "einheit": einheit,
        "zeitraum_a": {"jahr": jahr_a, "monat": monat_a},
        "zeitraum_b": {"jahr": jahr_b, "monat": monat_b},
        "kategorien": {
            kategorie: {
                "wert_a": in_einheit(eintrag["wert_a_kg"]),
                "wert_b": in_einheit(eintrag["wert_b_kg"]),
                "veraenderung": eintrag["veraenderung"],
                "hinweis": eintrag["hinweis"],
            }
            for kategorie, eintrag in ergebnis_kg.items()
        },
    }


@app.get("/api/jahresziel")
def api_jahresziele(conn: sqlite3.Connection = Depends(get_conn)):
    return alle_jahresziele(conn)


@app.get("/api/faktoren")
def api_faktoren(conn: sqlite3.Connection = Depends(get_conn)):
    return alle_faktoren(conn)


@app.post("/api/jahresziel")
def api_jahresziel_setzen(
    eingabe: JahreszielEingabe, conn: sqlite3.Connection = Depends(get_conn)
):
    setze_jahresziel(conn, eingabe.jahr, eingabe.ziel_kg_co2e)
    return {"gespeichert": True}


@app.get("/api/messungen/fruehester-monat")
def api_fruehester_monat(conn: sqlite3.Connection = Depends(get_conn)):
    ergebnis = fruehester_monat(conn)
    if ergebnis is None:
        return {"jahr": None, "monat": None}
    jahr, monat = ergebnis
    return {"jahr": jahr, "monat": monat}


@app.get("/api/messungen/export")
def api_messungen_export(conn: sqlite3.Connection = Depends(get_conn)):
    return alle_messungen_roh(conn)


@app.get("/api/messungen/letzte")
def api_letzte_messungen(
    limit: int = 5, datenart: str | None = None, conn: sqlite3.Connection = Depends(get_conn)
):
    return letzte_messungen(conn, limit=limit, datenart=datenart)


@app.post("/api/fahrt")
def api_fahrt(eingabe: FahrtEingabe, conn: sqlite3.Connection = Depends(get_conn)):
    kategorien = gueltige_kategorien(conn)
    zeile = {
        "datum": eingabe.datum,
        "datenart": "fahrt",
        "kategorie": eingabe.kategorie,
        "wert": str(eingabe.wert),
        "einheit": kategorien.get(eingabe.kategorie, ""),
        "person": eingabe.person,
    }

    fehler = pruefe_zeile(zeile, kategorien)
    if fehler:
        raise HTTPException(status_code=422, detail=fehler)

    warnung = pruefe_duplikat(conn, zeile)

    conn.execute(
        """
        INSERT INTO measurements (datum, datenart, kategorie, wert, einheit, person)
        VALUES (?, 'fahrt', ?, ?, ?, ?)
        """,
        (zeile["datum"], zeile["kategorie"], eingabe.wert, zeile["einheit"], eingabe.person),
    )
    conn.commit()
    return {"gespeichert": True, "warnung": warnung}


@app.post("/api/import")
def api_import(datei: UploadFile, conn: sqlite3.Connection = Depends(get_conn)):
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        shutil.copyfileobj(datei.file, tmp)
        tmp_pfad = tmp.name

    try:
        return importiere_csv(conn, tmp_pfad, quelle_datei=datei.filename)
    finally:
        Path(tmp_pfad).unlink(missing_ok=True)

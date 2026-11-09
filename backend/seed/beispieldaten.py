"""
Erzeugt Beispieldaten fuer die fiktive "Muster Consulting GmbH" (25 Leute,
ein Buero, viel Kundenreisen): 24 Monate von November 2024 bis Oktober 2026.

Muster: Strom nahezu gleichmaessig (leichter Sommer-Zuschlag, Klimaanlage),
Erdgas stark saisonal (Winter hoch, Sommer niedrig). Dienstreisen 2024/2025
ueberwiegend Flug und Pkw; ab 2026 Optimierung zu ueberwiegend Bahn; im
Sommer 2026 ein bewusster Rueckfall zu mehr Flug/Pkw.

Erzeugt zwei Dateien unter data/:
  beispieldaten_24_monate.csv - gueltige Demo-Daten
  beispieldaten_fehler.csv    - absichtliche Fehler fuer den Live-Import-Test
    (ungueltiges Datum, negativer Wert, unbekannte Kategorie, Duplikat)
"""

import csv
import math
import random
from pathlib import Path

from backend.seed.faktoren import FAKTOREN

random.seed(24)  # reproduzierbar

MITARBEITER = ["Lena", "Tobias", "Sarah", "Jonas", "Mia", "Felix", "Nora", "David"]

VERKEHRSMITTEL_GEWICHTE = {
    "vorher": {"Dienstreisen Flug": 0.4, "Dienstreisen Pkw": 0.4, "Dienstreisen Bahn": 0.2},
    "rueckfall": {"Dienstreisen Flug": 0.35, "Dienstreisen Pkw": 0.35, "Dienstreisen Bahn": 0.3},
    "optimiert": {"Dienstreisen Flug": 0.1, "Dienstreisen Pkw": 0.2, "Dienstreisen Bahn": 0.7},
}

PKM_SPANNEN = {
    "Dienstreisen Flug": (400, 900),
    "Dienstreisen Pkw": (80, 400),
    "Dienstreisen Bahn": (100, 500),
}

FELDER = ["datum", "datenart", "kategorie", "wert", "einheit", "person"]


def monate(start_jahr: int, start_monat: int, anzahl: int):
    jahr, monat = start_jahr, start_monat
    for _ in range(anzahl):
        yield jahr, monat
        monat += 1
        if monat > 12:
            monat = 1
            jahr += 1


def strom_kwh(monat: int) -> int:
    basis = 1800
    sommer_zuschlag = 250 if monat in (6, 7, 8) else 0
    return round(basis + sommer_zuschlag + random.uniform(-80, 80))


def erdgas_kwh(monat: int) -> int:
    phase = (monat - 1) / 12 * 2 * math.pi
    saison = math.cos(phase)  # 1 im Januar (Winter), -1 im Juli (Sommer)
    basis, spanne = 1600, 1500
    return round(max(150, basis + spanne * saison) + random.uniform(-100, 100))


def phase_fuer(jahr: int, monat: int) -> str:
    if jahr < 2026:
        return "vorher"
    if jahr == 2026 and monat in (6, 7, 8):
        return "rueckfall"
    return "optimiert"


def dienstreisen_fuer_monat(jahr: int, monat: int) -> list[dict]:
    gewichte = VERKEHRSMITTEL_GEWICHTE[phase_fuer(jahr, monat)]
    zeilen = []
    for _ in range(random.randint(4, 8)):
        kategorie = random.choices(list(gewichte), weights=list(gewichte.values()))[0]
        tag = random.randint(1, 28)
        wert = random.randint(*PKM_SPANNEN[kategorie])
        zeilen.append(
            {
                "datum": f"{jahr:04d}-{monat:02d}-{tag:02d}",
                "datenart": "fahrt",
                "kategorie": kategorie,
                "wert": wert,
                "einheit": "Pkm",
                "person": random.choice(MITARBEITER),
            }
        )
    return zeilen


def erzeuge_beispieldaten() -> list[dict]:
    zeilen = []
    for jahr, monat in monate(2024, 11, 24):
        zeilen.append(
            {
                "datum": f"{jahr:04d}-{monat:02d}-05",
                "datenart": "verbrauch",
                "kategorie": "Strom",
                "wert": strom_kwh(monat),
                "einheit": "kWh",
                "person": "",
            }
        )
        zeilen.append(
            {
                "datum": f"{jahr:04d}-{monat:02d}-05",
                "datenart": "verbrauch",
                "kategorie": "Erdgas",
                "wert": erdgas_kwh(monat),
                "einheit": "kWh",
                "person": "",
            }
        )
        zeilen.extend(dienstreisen_fuer_monat(jahr, monat))
    return zeilen


def erzeuge_fehlerdaten() -> list[dict]:
    return [
        {
            "datum": "2026-02-31",
            "datenart": "verbrauch",
            "kategorie": "Strom",
            "wert": "1800",
            "einheit": "kWh",
            "person": "",
        },
        {
            "datum": "2025-06-10",
            "datenart": "verbrauch",
            "kategorie": "Erdgas",
            "wert": "-200",
            "einheit": "kWh",
            "person": "",
        },
        {
            "datum": "2025-09-15",
            "datenart": "verbrauch",
            "kategorie": "Papier",
            "wert": "50",
            "einheit": "kg",
            "person": "",
        },
        {
            # Datum bewusst ausserhalb Nov 2024 - Okt 2026, damit das
            # Duplikat-Paar nicht zufaellig mit echten Beispieldaten
            # kollidiert, egal in welcher Reihenfolge demonstriert wird.
            "datum": "2027-01-01",
            "datenart": "verbrauch",
            "kategorie": "Strom",
            "wert": "1750",
            "einheit": "kWh",
            "person": "",
        },
        {
            "datum": "2027-01-01",
            "datenart": "verbrauch",
            "kategorie": "Strom",
            "wert": "1750",
            "einheit": "kWh",
            "person": "",
        },
    ]


def schreibe_csv(pfad: str, zeilen: list[dict]) -> None:
    with open(pfad, "w", newline="", encoding="utf-8") as datei:
        writer = csv.DictWriter(datei, fieldnames=FELDER)
        writer.writeheader()
        writer.writerows(zeilen)


def empfohlenes_jahresziel_2026(zeilen: list[dict]) -> float:
    faktoren = {f["kategorie"]: f["faktor_kg_co2e_pro_einheit"] for f in FAKTOREN}
    summe_2025 = sum(
        float(z["wert"]) * faktoren[z["kategorie"]]
        for z in zeilen
        if z["datum"].startswith("2025")
    )
    return round(summe_2025 * 0.9)


if __name__ == "__main__":
    daten_pfad = Path(__file__).resolve().parent.parent.parent / "data"
    beispieldaten = erzeuge_beispieldaten()
    schreibe_csv(str(daten_pfad / "beispieldaten_24_monate.csv"), beispieldaten)
    schreibe_csv(str(daten_pfad / "beispieldaten_fehler.csv"), erzeuge_fehlerdaten())

    ziel = empfohlenes_jahresziel_2026(beispieldaten)
    print(f"{len(beispieldaten)} Zeilen in beispieldaten_24_monate.csv geschrieben.")
    print("5 Zeilen in beispieldaten_fehler.csv geschrieben.")
    print(f"Empfohlenes Jahresziel 2026 (10 % unter 2025): {ziel} kg")

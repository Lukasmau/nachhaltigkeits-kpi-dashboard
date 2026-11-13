import sqlite3

FAKTOREN = [
    {
        "kategorie": "Strom",
        "einheit": "kWh",
        "faktor_kg_co2e_pro_einheit": 0.344,
        "quelle": "UBA, Strommix Deutschland 2025, Schätzung (CO₂, nicht CO₂e)",
        "stand": "23.03.2026",
    },
    {
        "kategorie": "Erdgas",
        "einheit": "kWh",
        "faktor_kg_co2e_pro_einheit": 0.1833,
        "quelle": (
            "UBA, Liste Emissionsfaktoren zur Treibhausgasbilanzierung v2.1, "
            "Blatt 01_Stationäre_Verbrennung, ID 01_10_02_005_01 "
            "(Erdgas, Brennwert, ohne Vorkette)"
        ),
        "stand": "Bezugsjahr 2024, Version 2.1 vom 28.02.2026",
    },
    {
        "kategorie": "Dienstreisen Pkw",
        "einheit": "Pkm",
        "faktor_kg_co2e_pro_einheit": 0.164,
        "quelle": (
            "UBA, Vergleich der durchschnittlichen Emissionen einzelner Verkehrsmittel "
            "im Personenverkehr 2024, TREMOD 6.71B (10/2025), Pkw alle Antriebe, "
            "1,4 Pers./Pkw, inkl. Vorkette (Bereitstellung/Umwandlung der Energieträger); "
            "siehe data/uba_vergleich_personenverkehr_2024.pdf"
        ),
        "stand": "Bezugsjahr 2024",
    },
    {
        "kategorie": "Dienstreisen Bahn",
        "einheit": "Pkm",
        "faktor_kg_co2e_pro_einheit": 0.026,
        "quelle": (
            "UBA, Vergleich der durchschnittlichen Emissionen einzelner Verkehrsmittel "
            "im Personenverkehr 2024, TREMOD 6.71B (10/2025), Eisenbahn Fernverkehr, "
            "inkl. Vorkette; siehe data/uba_vergleich_personenverkehr_2024.pdf"
        ),
        "stand": "Bezugsjahr 2024",
    },
    {
        "kategorie": "Dienstreisen Bus",
        "einheit": "Pkm",
        "faktor_kg_co2e_pro_einheit": 0.030,
        "quelle": (
            "UBA, Vergleich der durchschnittlichen Emissionen einzelner Verkehrsmittel "
            "im Personenverkehr 2024, TREMOD 6.71B (10/2025), Linienbus Fernverkehr "
            "(nicht Nahverkehr, dort 90 g/Pkm), inkl. Vorkette; "
            "siehe data/uba_vergleich_personenverkehr_2024.pdf"
        ),
        "stand": "Bezugsjahr 2024",
    },
    {
        "kategorie": "Dienstreisen Flug",
        "einheit": "Pkm",
        "faktor_kg_co2e_pro_einheit": 0.290,
        "quelle": (
            "UBA, Vergleich der durchschnittlichen Emissionen einzelner Verkehrsmittel "
            "im Personenverkehr 2024, TREMOD 6.71B (10/2025), Flugzeug Inland, "
            "inkl. Nicht-CO₂-Effekte (EWF 1,5) und Vorkette; "
            "siehe data/uba_vergleich_personenverkehr_2024.pdf"
        ),
        "stand": "Bezugsjahr 2024",
    },
]


def seed_faktoren(conn: sqlite3.Connection) -> None:
    conn.executemany(
        """
        INSERT INTO factors (kategorie, einheit, faktor_kg_co2e_pro_einheit, quelle, stand)
        VALUES (:kategorie, :einheit, :faktor_kg_co2e_pro_einheit, :quelle, :stand)
        ON CONFLICT(kategorie) DO UPDATE SET
            einheit = excluded.einheit,
            faktor_kg_co2e_pro_einheit = excluded.faktor_kg_co2e_pro_einheit,
            quelle = excluded.quelle,
            stand = excluded.stand
        """,
        FAKTOREN,
    )
    conn.commit()

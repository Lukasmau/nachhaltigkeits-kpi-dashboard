import pytest
from fastapi.testclient import TestClient

from backend.api import app, get_conn, vormonat
from backend.db import init_db, verbindung
from backend.seed.faktoren import seed_faktoren


@pytest.fixture
def client(tmp_path):
    db_pfad = str(tmp_path / "test.db")
    init_db(db_pfad)
    conn = verbindung(db_pfad)
    seed_faktoren(conn)
    conn.close()

    def override_get_conn():
        conn = verbindung(db_pfad)
        try:
            yield conn
        finally:
            conn.close()

    app.dependency_overrides[get_conn] = override_get_conn
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_vormonat_normalfall():
    assert vormonat(2026, 5) == (2026, 4)


def test_vormonat_wechselt_jahr_bei_januar():
    assert vormonat(2026, 1) == (2025, 12)


def test_api_kpis_leerer_monat_gibt_hinweis(client):
    antwort = client.get("/api/kpis", params={"jahr": 2026, "monat": 3})
    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["co2e_im_monat"]["wert"] is None
    assert "Keine Werte angegeben" in daten["co2e_im_monat"]["warnungen"]


def test_api_import_dann_kpis_zeigen_den_wert(client):
    csv_inhalt = (
        "datum,datenart,kategorie,wert,einheit,person\n"
        "2026-03-01,verbrauch,Strom,1000,kWh,\n"
    )
    import_antwort = client.post(
        "/api/import", files={"datei": ("test.csv", csv_inhalt, "text/csv")}
    )
    assert import_antwort.json()["importiert"] == 1

    kpi_antwort = client.get("/api/kpis", params={"jahr": 2026, "monat": 3})
    daten = kpi_antwort.json()
    # Strom-Faktor 0,344 kg/kWh (siehe CLAUDE.md) * 1000 kWh = 344 kg, unter der Tonnen-Schwelle
    assert daten["co2e_im_monat"]["wert"] == pytest.approx(344.0)
    assert daten["co2e_im_monat"]["einheit"] == "kg"


def test_api_kpis_ueber_1000_kg_zeigt_tonnen(client):
    csv_inhalt = (
        "datum,datenart,kategorie,wert,einheit,person\n"
        "2026-03-01,verbrauch,Strom,3000,kWh,\n"
    )
    client.post("/api/import", files={"datei": ("test.csv", csv_inhalt, "text/csv")})

    kpi_antwort = client.get("/api/kpis", params={"jahr": 2026, "monat": 3})
    daten = kpi_antwort.json()
    # 3000 kWh * 0,344 kg/kWh = 1032 kg = 1,032 t
    assert daten["co2e_im_monat"]["einheit"] == "t"
    assert daten["co2e_im_monat"]["wert"] == pytest.approx(1.032)


def test_api_import_meldet_fehlerhafte_zeile(client):
    csv_inhalt = (
        "datum,datenart,kategorie,wert,einheit,person\n"
        "31.02.2026,verbrauch,Strom,100,kWh,\n"
    )
    antwort = client.post(
        "/api/import", files={"datei": ("test.csv", csv_inhalt, "text/csv")}
    )
    ergebnis = antwort.json()
    assert ergebnis["importiert"] == 0
    assert ergebnis["fehler"][0]["spalte"] == "datum"


def test_api_verlauf_hat_zwoelf_monate(client):
    antwort = client.get("/api/verlauf", params={"jahr": 2026})
    daten = antwort.json()
    assert daten["einheit"] == "kg"
    assert len(daten["monate"]) == 12
    assert daten["monate"][0]["monat"] == 1
    assert daten["monate"][-1]["monat"] == 12


def test_api_verlauf_liefert_veraenderung_zielerreichung_und_groesste_kategorie(client):
    csv_inhalt = (
        "datum,datenart,kategorie,wert,einheit,person\n"
        "2026-01-01,verbrauch,Strom,1000,kWh,\n"
        "2026-02-01,verbrauch,Strom,2000,kWh,\n"
    )
    client.post("/api/import", files={"datei": ("test.csv", csv_inhalt, "text/csv")})

    antwort = client.get("/api/verlauf", params={"jahr": 2026})
    daten = antwort.json()

    assert daten["groesste_kategorie"] == "Strom"
    jan, feb = daten["monate"][0], daten["monate"][1]
    assert jan["veraenderung"] is None  # kein Vormonat in diesem Jahr
    # 2000 kWh ist doppelt so viel wie 1000 kWh -> 100 % Veraenderung
    assert feb["veraenderung"] == pytest.approx(1.0)
    assert jan["anteil_groesste_kategorie"] == pytest.approx(1.0)  # nur Strom vorhanden


def test_api_verlauf_monatsziel_ist_jahresziel_durch_zwoelf(tmp_path):
    db_pfad = str(tmp_path / "test.db")
    init_db(db_pfad)
    conn = verbindung(db_pfad)
    seed_faktoren(conn)
    conn.execute(
        "INSERT INTO targets (kategorie, jahr, ziel_kg_co2e) VALUES ('Gesamt', 2026, 12000)"
    )
    conn.commit()
    conn.close()

    def override_get_conn():
        conn = verbindung(db_pfad)
        try:
            yield conn
        finally:
            conn.close()

    app.dependency_overrides[get_conn] = override_get_conn
    try:
        antwort = TestClient(app).get("/api/verlauf", params={"jahr": 2026})
    finally:
        app.dependency_overrides.clear()

    assert antwort.json()["monatsziel"] == pytest.approx(1000.0)


def test_api_fahrt_speichert_eine_fahrt(client):
    antwort = client.post(
        "/api/fahrt",
        json={"datum": "2026-03-05", "kategorie": "Dienstreisen Bahn", "wert": 250, "person": "Lukas"},
    )
    assert antwort.status_code == 200
    daten = antwort.json()
    assert daten["gespeichert"] is True
    assert daten["warnung"] is None

    kpi_antwort = client.get("/api/kpis", params={"jahr": 2026, "monat": 3})
    # 250 Pkm * 0,026 kg/Pkm (Bahn, siehe CLAUDE.md) = 6,5 kg
    assert kpi_antwort.json()["co2e_im_monat"]["wert"] == pytest.approx(6.5)


def test_api_fahrt_meldet_fachfehler_bei_ungueltigem_datum(client):
    antwort = client.post(
        "/api/fahrt",
        json={"datum": "31.02.2026", "kategorie": "Dienstreisen Bahn", "wert": 250, "person": "Lukas"},
    )
    assert antwort.status_code == 422
    assert antwort.json()["detail"][0]["spalte"] == "datum"


def test_api_fahrt_lehnt_negativen_wert_ab(client):
    antwort = client.post(
        "/api/fahrt",
        json={"datum": "2026-03-05", "kategorie": "Dienstreisen Bahn", "wert": -10, "person": "Lukas"},
    )
    assert antwort.status_code == 422
    assert antwort.json()["detail"][0]["spalte"] == "wert"


def test_api_fahrt_warnt_bei_duplikat_aber_speichert_trotzdem(client):
    eingabe = {"datum": "2026-03-05", "kategorie": "Dienstreisen Bahn", "wert": 250, "person": "Lukas"}
    client.post("/api/fahrt", json=eingabe)
    zweite_antwort = client.post("/api/fahrt", json=eingabe)

    assert zweite_antwort.status_code == 200
    daten = zweite_antwort.json()
    assert daten["gespeichert"] is True
    assert "existiert bereits" in daten["warnung"]

    kpi_antwort = client.get("/api/kpis", params={"jahr": 2026, "monat": 3})
    # beide Fahrten sind gespeichert (Fahrten werden nie blockiert, siehe CLAUDE.md §7)
    assert kpi_antwort.json()["co2e_im_monat"]["wert"] == pytest.approx(13.0)


def test_api_fahrt_lehnt_unbekannte_kategorie_ab(client):
    antwort = client.post(
        "/api/fahrt",
        json={"datum": "2026-03-05", "kategorie": "Strom", "wert": 250, "person": "Lukas"},
    )
    assert antwort.status_code == 422


def test_api_letzte_messungen_zeigt_neueste_zuerst(client):
    client.post(
        "/api/fahrt",
        json={"datum": "2026-03-05", "kategorie": "Dienstreisen Bahn", "wert": 250, "person": "Lukas"},
    )
    client.post(
        "/api/fahrt",
        json={"datum": "2026-03-06", "kategorie": "Dienstreisen Pkw", "wert": 90, "person": "Anna"},
    )

    antwort = client.get("/api/messungen/letzte", params={"limit": 2})
    daten = antwort.json()

    assert len(daten) == 2
    assert daten[0]["kategorie"] == "Dienstreisen Pkw"  # zuletzt hinzugefuegt zuerst
    assert daten[1]["kategorie"] == "Dienstreisen Bahn"


def test_api_letzte_messungen_filtert_nach_datenart(client):
    client.post(
        "/api/fahrt",
        json={"datum": "2026-03-05", "kategorie": "Dienstreisen Bahn", "wert": 250, "person": "Lukas"},
    )
    csv_inhalt = "datum,datenart,kategorie,wert,einheit,person\n2026-03-01,verbrauch,Strom,1000,kWh,\n"
    client.post("/api/import", files={"datei": ("test.csv", csv_inhalt, "text/csv")})

    antwort = client.get("/api/messungen/letzte", params={"datenart": "fahrt"})
    daten = antwort.json()

    assert len(daten) == 1
    assert daten[0]["datenart"] == "fahrt"


def test_api_letzte_messungen_zeigt_quelle_datei_aus_csv_import(client):
    csv_inhalt = "datum,datenart,kategorie,wert,einheit,person\n2026-03-01,verbrauch,Strom,1000,kWh,\n"
    client.post(
        "/api/import", files={"datei": ("maerz_2026.csv", csv_inhalt, "text/csv")}
    )

    antwort = client.get("/api/messungen/letzte", params={"limit": 1})
    assert antwort.json()[0]["quelle_datei"] == "maerz_2026.csv"


def test_api_letzte_messungen_fahrt_hat_keine_quelle_datei(client):
    client.post(
        "/api/fahrt",
        json={"datum": "2026-03-05", "kategorie": "Dienstreisen Bahn", "wert": 250, "person": "Lukas"},
    )

    antwort = client.get("/api/messungen/letzte", params={"limit": 1})
    assert antwort.json()[0]["quelle_datei"] is None


def test_api_letzte_messungen_ohne_eintraege_ist_leer(client):
    antwort = client.get("/api/messungen/letzte")
    assert antwort.json() == []


def test_api_jahresziel_setzen_und_abfragen(client):
    antwort = client.post("/api/jahresziel", json={"jahr": 2026, "ziel_kg_co2e": 12000})
    assert antwort.status_code == 200

    liste = client.get("/api/jahresziel").json()
    assert liste == [{"jahr": 2026, "ziel_kg_co2e": 12000.0}]


def test_api_jahresziel_ueberschreibt_bestehendes_jahr(client):
    client.post("/api/jahresziel", json={"jahr": 2026, "ziel_kg_co2e": 12000})
    client.post("/api/jahresziel", json={"jahr": 2026, "ziel_kg_co2e": 9000})

    liste = client.get("/api/jahresziel").json()
    assert liste == [{"jahr": 2026, "ziel_kg_co2e": 9000.0}]


def test_api_jahresziel_lehnt_negativen_wert_ab(client):
    antwort = client.post("/api/jahresziel", json={"jahr": 2026, "ziel_kg_co2e": -500})
    assert antwort.status_code == 422


def test_api_jahresziel_liste_sortiert_neuestes_jahr_zuerst(client):
    client.post("/api/jahresziel", json={"jahr": 2025, "ziel_kg_co2e": 12000})
    client.post("/api/jahresziel", json={"jahr": 2026, "ziel_kg_co2e": 10800})

    liste = client.get("/api/jahresziel").json()
    assert [z["jahr"] for z in liste] == [2026, 2025]


def test_api_jahresziel_wirkt_sich_auf_verlauf_aus(client):
    client.post("/api/jahresziel", json={"jahr": 2026, "ziel_kg_co2e": 12000})

    antwort = client.get("/api/verlauf", params={"jahr": 2026})
    assert antwort.json()["monatsziel"] == pytest.approx(1000.0)


def test_api_verlauf_waehlt_tonnen_wenn_ein_monat_drueber_liegt(client):
    csv_inhalt = (
        "datum,datenart,kategorie,wert,einheit,person\n"
        "2026-01-01,verbrauch,Strom,100,kWh,\n"
        "2026-03-01,verbrauch,Strom,3000,kWh,\n"
    )
    client.post("/api/import", files={"datei": ("test.csv", csv_inhalt, "text/csv")})

    antwort = client.get("/api/verlauf", params={"jahr": 2026})
    daten = antwort.json()
    assert daten["einheit"] == "t"
    # auch der kleine Januar-Wert wird in Tonnen umgerechnet, nicht in kg belassen
    assert daten["monate"][0]["wert"] == pytest.approx(0.0344)

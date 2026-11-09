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
    assert daten["co2e_im_monat"]["wert_kg"] is None
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
    # Strom-Faktor 0,344 kg/kWh (siehe CLAUDE.md) * 1000 kWh = 344 kg
    assert daten["co2e_im_monat"]["wert_kg"] == pytest.approx(344.0)


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
    assert len(daten) == 12
    assert daten[0]["monat"] == 1
    assert daten[-1]["monat"] == 12

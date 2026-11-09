import pytest

from backend.db import init_db, verbindung
from backend.importer import (
    gueltige_kategorien,
    importiere_csv,
    pruefe_duplikat,
    pruefe_zeile,
)
from backend.seed.faktoren import seed_faktoren

KATEGORIEN = {"Strom": "kWh", "Erdgas": "kWh", "Dienstreisen Bahn": "Pkm"}


@pytest.fixture
def conn(tmp_path):
    db_pfad = str(tmp_path / "test.db")
    init_db(db_pfad)
    verbindung_obj = verbindung(db_pfad)
    seed_faktoren(verbindung_obj)
    yield verbindung_obj
    verbindung_obj.close()


def test_gueltige_kategorien_liefert_alle_faktor_kategorien(conn):
    kategorien = gueltige_kategorien(conn)
    assert kategorien["Strom"] == "kWh"
    assert kategorien["Dienstreisen Bahn"] == "Pkm"


def test_pruefe_zeile_gueltige_verbrauchszeile_hat_keine_fehler():
    zeile = {
        "datum": "2026-03-01",
        "datenart": "verbrauch",
        "kategorie": "Strom",
        "wert": "1250",
        "einheit": "kWh",
        "person": None,
    }
    assert pruefe_zeile(zeile, KATEGORIEN) == []


def test_pruefe_zeile_gueltige_fahrt_hat_keine_fehler():
    zeile = {
        "datum": "2026-03-15",
        "datenart": "fahrt",
        "kategorie": "Dienstreisen Bahn",
        "wert": "340",
        "einheit": "Pkm",
        "person": "Lukas",
    }
    assert pruefe_zeile(zeile, KATEGORIEN) == []


def test_pruefe_zeile_wert_null_ist_gueltig():
    zeile = {
        "datum": "2026-03-01",
        "datenart": "verbrauch",
        "kategorie": "Strom",
        "wert": "0",
        "einheit": "kWh",
        "person": None,
    }
    assert pruefe_zeile(zeile, KATEGORIEN) == []


def test_pruefe_zeile_datum_falsches_format():
    zeile = {
        "datum": "31.03.2026",
        "datenart": "verbrauch",
        "kategorie": "Strom",
        "wert": "100",
        "einheit": "kWh",
        "person": None,
    }
    fehler = pruefe_zeile(zeile, KATEGORIEN)
    assert len(fehler) == 1
    assert fehler[0]["spalte"] == "datum"
    assert "JJJJ-MM-TT" in fehler[0]["tipp"]


def test_pruefe_zeile_datum_kalendarisch_ungueltig():
    zeile = {
        "datum": "2026-02-31",
        "datenart": "verbrauch",
        "kategorie": "Strom",
        "wert": "100",
        "einheit": "kWh",
        "person": None,
    }
    fehler = pruefe_zeile(zeile, KATEGORIEN)
    assert fehler[0]["spalte"] == "datum"


def test_pruefe_zeile_wert_negativ():
    zeile = {
        "datum": "2026-03-01",
        "datenart": "verbrauch",
        "kategorie": "Strom",
        "wert": "-50",
        "einheit": "kWh",
        "person": None,
    }
    fehler = pruefe_zeile(zeile, KATEGORIEN)
    assert fehler[0]["spalte"] == "wert"
    assert "negativ" in fehler[0]["grund"]


def test_pruefe_zeile_wert_keine_zahl():
    zeile = {
        "datum": "2026-03-01",
        "datenart": "verbrauch",
        "kategorie": "Strom",
        "wert": "abc",
        "einheit": "kWh",
        "person": None,
    }
    fehler = pruefe_zeile(zeile, KATEGORIEN)
    assert fehler[0]["spalte"] == "wert"
    assert "keine Zahl" in fehler[0]["grund"]


def test_pruefe_zeile_unbekannte_datenart():
    zeile = {
        "datum": "2026-03-01",
        "datenart": "sonstiges",
        "kategorie": "Strom",
        "wert": "10",
        "einheit": "kWh",
        "person": None,
    }
    fehler = pruefe_zeile(zeile, KATEGORIEN)
    assert fehler[0]["spalte"] == "datenart"


def test_pruefe_zeile_fehlende_datenart():
    zeile = {
        "datum": "2026-03-01",
        "datenart": None,
        "kategorie": "Strom",
        "wert": "10",
        "einheit": "kWh",
        "person": None,
    }
    fehler = pruefe_zeile(zeile, KATEGORIEN)
    assert fehler[0]["spalte"] == "datenart"


def test_pruefe_zeile_unbekannte_kategorie():
    zeile = {
        "datum": "2026-03-01",
        "datenart": "verbrauch",
        "kategorie": "Papier",
        "wert": "10",
        "einheit": "kg",
        "person": None,
    }
    fehler = pruefe_zeile(zeile, KATEGORIEN)
    assert fehler[0]["spalte"] == "kategorie"


def test_pruefe_zeile_falsche_einheit():
    zeile = {
        "datum": "2026-03-01",
        "datenart": "verbrauch",
        "kategorie": "Strom",
        "wert": "10",
        "einheit": "MWh",
        "person": None,
    }
    fehler = pruefe_zeile(zeile, KATEGORIEN)
    assert fehler[0]["spalte"] == "einheit"
    assert "kWh" in fehler[0]["tipp"]


def test_pruefe_zeile_mehrere_fehler_gleichzeitig():
    zeile = {
        "datum": "31.02.2026",
        "datenart": "verbrauch",
        "kategorie": "Strom",
        "wert": "-5",
        "einheit": "kWh",
        "person": None,
    }
    fehler = pruefe_zeile(zeile, KATEGORIEN)
    spalten = {f["spalte"] for f in fehler}
    assert "datum" in spalten
    assert "wert" in spalten


def test_pruefe_duplikat_verbrauch_gleicher_monat_erkannt(conn):
    conn.execute(
        "INSERT INTO measurements (datum, datenart, kategorie, wert, einheit) "
        "VALUES (?, ?, ?, ?, ?)",
        ("2026-03-01", "verbrauch", "Strom", 1250, "kWh"),
    )
    conn.commit()
    zeile = {
        "datum": "2026-03-15",
        "datenart": "verbrauch",
        "kategorie": "Strom",
        "wert": "1300",
        "einheit": "kWh",
        "person": None,
    }
    assert pruefe_duplikat(conn, zeile) is not None


def test_pruefe_duplikat_verbrauch_anderer_monat_kein_duplikat(conn):
    conn.execute(
        "INSERT INTO measurements (datum, datenart, kategorie, wert, einheit) "
        "VALUES (?, ?, ?, ?, ?)",
        ("2026-03-01", "verbrauch", "Strom", 1250, "kWh"),
    )
    conn.commit()
    zeile = {
        "datum": "2026-04-01",
        "datenart": "verbrauch",
        "kategorie": "Strom",
        "wert": "1300",
        "einheit": "kWh",
        "person": None,
    }
    assert pruefe_duplikat(conn, zeile) is None


def test_pruefe_duplikat_fahrt_gleicher_name_erkannt(conn):
    conn.execute(
        "INSERT INTO measurements (datum, datenart, kategorie, wert, einheit, person) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        ("2026-03-15", "fahrt", "Dienstreisen Bahn", 340, "Pkm", "Lukas"),
    )
    conn.commit()
    zeile = {
        "datum": "2026-03-15",
        "datenart": "fahrt",
        "kategorie": "Dienstreisen Bahn",
        "wert": "340",
        "einheit": "Pkm",
        "person": "Lukas",
    }
    assert pruefe_duplikat(conn, zeile) is not None


def test_pruefe_duplikat_fahrt_anderer_name_kein_duplikat(conn):
    conn.execute(
        "INSERT INTO measurements (datum, datenart, kategorie, wert, einheit, person) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        ("2026-03-15", "fahrt", "Dienstreisen Bahn", 340, "Pkm", "Lukas"),
    )
    conn.commit()
    zeile = {
        "datum": "2026-03-15",
        "datenart": "fahrt",
        "kategorie": "Dienstreisen Bahn",
        "wert": "340",
        "einheit": "Pkm",
        "person": "Anna",
    }
    assert pruefe_duplikat(conn, zeile) is None


def test_importiere_csv_teilimport_gueltige_und_ungueltige_zeilen(conn, tmp_path):
    csv_pfad = tmp_path / "import.csv"
    csv_pfad.write_text(
        "datum,datenart,kategorie,wert,einheit,person\n"
        "2026-03-01,verbrauch,Strom,1250,kWh,\n"
        "31.02.2026,verbrauch,Strom,100,kWh,\n"
        "2026-03-15,fahrt,Dienstreisen Bahn,340,Pkm,Lukas\n",
        encoding="utf-8",
    )
    ergebnis = importiere_csv(conn, str(csv_pfad))

    assert ergebnis["importiert"] == 2
    assert len(ergebnis["fehler"]) == 1
    assert ergebnis["fehler"][0]["spalte"] == "datum"
    assert ergebnis["fehler"][0]["zeile"] == 3
    assert ergebnis["warnungen"] == []

    gespeichert = conn.execute("SELECT COUNT(*) AS n FROM measurements").fetchone()["n"]
    assert gespeichert == 2


def test_importiere_csv_verbrauch_duplikat_wird_uebersprungen(conn, tmp_path):
    csv_pfad = tmp_path / "import.csv"
    csv_pfad.write_text(
        "datum,datenart,kategorie,wert,einheit,person\n"
        "2026-03-01,verbrauch,Strom,1250,kWh,\n",
        encoding="utf-8",
    )
    importiere_csv(conn, str(csv_pfad))
    ergebnis = importiere_csv(conn, str(csv_pfad))

    assert ergebnis["importiert"] == 0
    assert any("bereits vorhanden" in f["grund"] for f in ergebnis["fehler"])

    gespeichert = conn.execute("SELECT COUNT(*) AS n FROM measurements").fetchone()["n"]
    assert gespeichert == 1


def test_importiere_csv_fahrt_duplikat_wird_trotzdem_importiert_mit_warnung(conn, tmp_path):
    csv_pfad = tmp_path / "import.csv"
    csv_pfad.write_text(
        "datum,datenart,kategorie,wert,einheit,person\n"
        "2026-03-15,fahrt,Dienstreisen Bahn,340,Pkm,Lukas\n",
        encoding="utf-8",
    )
    importiere_csv(conn, str(csv_pfad))
    ergebnis = importiere_csv(conn, str(csv_pfad))

    assert ergebnis["importiert"] == 1
    assert len(ergebnis["warnungen"]) == 1
    assert ergebnis["fehler"] == []

    gespeichert = conn.execute("SELECT COUNT(*) AS n FROM measurements").fetchone()["n"]
    assert gespeichert == 2

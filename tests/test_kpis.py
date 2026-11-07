from backend.core.kpis import co2e_im_monat


def test_co2e_im_monat_summiert_mehrere_kategorien():
    messungen = [
        {"kategorie": "Strom", "co2e_kg": 100.0},
        {"kategorie": "Erdgas", "co2e_kg": 50.0},
    ]
    ergebnis = co2e_im_monat(messungen)
    assert ergebnis["wert_kg"] == 150.0
    assert ergebnis["warnungen"] == []


def test_co2e_im_monat_leerer_monat():
    ergebnis = co2e_im_monat([])
    assert ergebnis["wert_kg"] is None
    assert "Keine Werte angegeben" in ergebnis["warnungen"]


def test_co2e_im_monat_nur_nullen_gibt_plausibilitaetswarnung():
    messungen = [{"kategorie": "Strom", "co2e_kg": 0.0}]
    ergebnis = co2e_im_monat(messungen)
    assert ergebnis["wert_kg"] == 0.0
    assert any("0" in warnung for warnung in ergebnis["warnungen"])


def test_co2e_im_monat_fehlender_faktor_wird_nicht_als_null_gezaehlt():
    messungen = [
        {"kategorie": "Strom", "co2e_kg": 100.0},
        {"kategorie": "Dienstreisen", "co2e_kg": None},
    ]
    ergebnis = co2e_im_monat(messungen)
    assert ergebnis["wert_kg"] == 100.0
    assert any(
        "Faktor" in warnung and "Dienstreisen" in warnung
        for warnung in ergebnis["warnungen"]
    )


def test_co2e_im_monat_alle_faktoren_fehlen_ist_nicht_berechenbar():
    messungen = [{"kategorie": "Strom", "co2e_kg": None}]
    ergebnis = co2e_im_monat(messungen)
    assert ergebnis["wert_kg"] is None

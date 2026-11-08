from backend.core.kpis import anteil_je_kategorie, co2e_im_monat, veraenderung_zum_vormonat


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


def test_anteil_je_kategorie_rechnet_exakt():
    messungen = [
        {"kategorie": "Strom", "co2e_kg": 100.0},
        {"kategorie": "Erdgas", "co2e_kg": 50.0},
    ]
    ergebnis = anteil_je_kategorie(messungen)
    assert ergebnis["anteile"] == {"Strom": 100 / 150, "Erdgas": 50 / 150}
    assert ergebnis["warnungen"] == []


def test_anteil_je_kategorie_leerer_monat_nicht_berechenbar():
    ergebnis = anteil_je_kategorie([])
    assert ergebnis["anteile"] is None
    assert "Keine Werte angegeben" in ergebnis["warnungen"]


def test_anteil_je_kategorie_bei_monatssumme_null_nicht_berechenbar():
    messungen = [{"kategorie": "Strom", "co2e_kg": 0.0}]
    ergebnis = anteil_je_kategorie(messungen)
    assert ergebnis["anteile"] is None
    assert any("0" in warnung for warnung in ergebnis["warnungen"])


def test_anteil_je_kategorie_fehlender_faktor_taucht_nicht_im_anteil_auf():
    messungen = [
        {"kategorie": "Strom", "co2e_kg": 100.0},
        {"kategorie": "Dienstreisen", "co2e_kg": None},
    ]
    ergebnis = anteil_je_kategorie(messungen)
    assert ergebnis["anteile"] == {"Strom": 1.0}
    assert any("Dienstreisen" in warnung for warnung in ergebnis["warnungen"])


def test_veraenderung_zum_vormonat_normalfall():
    # 120 kg jetzt, 100 kg im Vormonat -> 20 % mehr, also 0.2
    assert veraenderung_zum_vormonat(120, 100) == 0.2


def test_veraenderung_zum_vormonat_ohne_vormonat_nicht_berechenbar():
    assert veraenderung_zum_vormonat(120, None) is None


def test_veraenderung_zum_vormonat_bei_vormonat_null_nicht_berechenbar():
    assert veraenderung_zum_vormonat(120, 0) is None
    assert veraenderung_zum_vormonat(120, 0.0) is None


def test_veraenderung_zum_vormonat_bewusste_null_ist_ein_echter_ruckgang():
    # aktuell 0 kg, Vormonat 100 kg -> echter Rückgang um 100 %, kein "nicht angegeben"
    assert veraenderung_zum_vormonat(0, 100) == -1.0

from backend.core.units import (
    SCHWELLE_TONNEN_KG,
    anzeige_einheit,
    einheit_fuer_reihe,
    kg_in_tonnen,
    reihe_in_einheit,
)


def test_kg_in_tonnen_rechnet_exakt_um():
    assert kg_in_tonnen(2500) == 2.5


def test_kg_in_tonnen_bei_einem_kilogramm():
    assert kg_in_tonnen(1) == 0.001


def test_anzeige_unter_schwelle_bleibt_kg():
    assert anzeige_einheit(500) == (500, "kg")


def test_anzeige_knapp_unter_schwelle_bleibt_kg():
    assert anzeige_einheit(999.9) == (999.9, "kg")


def test_anzeige_genau_an_schwelle_wird_tonne():
    assert anzeige_einheit(SCHWELLE_TONNEN_KG) == (1.0, "t")


def test_anzeige_ueber_schwelle_wird_tonne():
    assert anzeige_einheit(2500) == (2.5, "t")


def test_anzeige_bei_null_kg():
    assert anzeige_einheit(0) == (0, "kg")


def test_einheit_fuer_reihe_alle_unter_schwelle_bleibt_kg():
    assert einheit_fuer_reihe([500, 800, None, 100]) == "kg"


def test_einheit_fuer_reihe_ein_wert_ueber_schwelle_wird_tonne():
    assert einheit_fuer_reihe([500, 1500, None]) == "t"


def test_einheit_fuer_reihe_nur_none_bleibt_kg():
    assert einheit_fuer_reihe([None, None]) == "kg"


def test_einheit_fuer_reihe_leere_liste_bleibt_kg():
    assert einheit_fuer_reihe([]) == "kg"


def test_reihe_in_einheit_kg_bleibt_unveraendert():
    assert reihe_in_einheit([500, None, 800], "kg") == [500, None, 800]


def test_reihe_in_einheit_t_rechnet_alle_werte_um_und_laesst_none():
    assert reihe_in_einheit([500, None, 2500], "t") == [0.5, None, 2.5]

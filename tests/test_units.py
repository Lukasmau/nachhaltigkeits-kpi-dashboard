from backend.core.units import SCHWELLE_TONNEN_KG, anzeige_einheit, kg_in_tonnen


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

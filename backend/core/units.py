SCHWELLE_TONNEN_KG = 1000


def kg_in_tonnen(kg: float) -> float:
    return kg / 1000


def anzeige_einheit(kg: float) -> tuple[float, str]:
    if kg >= SCHWELLE_TONNEN_KG:
        return kg_in_tonnen(kg), "t"
    return kg, "kg"


def einheit_fuer_reihe(werte_kg: list[float | None]) -> str:
    vorhandene = [w for w in werte_kg if w is not None]
    if vorhandene and max(vorhandene) >= SCHWELLE_TONNEN_KG:
        return "t"
    return "kg"


def reihe_in_einheit(werte_kg: list[float | None], einheit: str) -> list[float | None]:
    if einheit == "t":
        return [None if w is None else kg_in_tonnen(w) for w in werte_kg]
    return werte_kg

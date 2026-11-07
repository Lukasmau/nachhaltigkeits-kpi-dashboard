SCHWELLE_TONNEN_KG = 1000


def kg_in_tonnen(kg: float) -> float:
    return kg / 1000


def anzeige_einheit(kg: float) -> tuple[float, str]:
    if kg >= SCHWELLE_TONNEN_KG:
        return kg_in_tonnen(kg), "t"
    return kg, "kg"

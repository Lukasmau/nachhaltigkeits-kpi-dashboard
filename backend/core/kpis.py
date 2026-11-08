def co2e_im_monat(messungen: list[dict]) -> dict:
    if not messungen:
        return {"wert_kg": None, "warnungen": ["Keine Werte angegeben"]}

    warnungen = []
    werte = []
    for messung in messungen:
        co2e_kg = messung["co2e_kg"]
        if co2e_kg is None:
            warnungen.append(f"Faktor fehlt für Kategorie {messung['kategorie']}")
        else:
            werte.append(co2e_kg)

    if not werte:
        return {"wert_kg": None, "warnungen": warnungen}

    summe = sum(werte)
    if summe == 0:
        warnungen.append("Alle Werte sind 0 - bitte Plausibilität prüfen")

    return {"wert_kg": summe, "warnungen": warnungen}


def anteil_je_kategorie(messungen: list[dict]) -> dict:
    gesamt = co2e_im_monat(messungen)
    warnungen = gesamt["warnungen"]

    if gesamt["wert_kg"] is None or gesamt["wert_kg"] == 0:
        return {"anteile": None, "warnungen": warnungen}

    anteile = {
        messung["kategorie"]: messung["co2e_kg"] / gesamt["wert_kg"]
        for messung in messungen
        if messung["co2e_kg"] is not None
    }
    return {"anteile": anteile, "warnungen": warnungen}


def veraenderung_zum_vormonat(aktuell_kg, vormonat_kg) -> float | None:
    if aktuell_kg is None or vormonat_kg is None:
        return None

    if vormonat_kg == 0:
        return None

    veraenderung = (aktuell_kg - vormonat_kg) / vormonat_kg
    return veraenderung


def zielerreichung(ist_kg: float | None, jahresziel_kg: float | None) -> float | None:
    if ist_kg is None or jahresziel_kg is None:
        return None

    if ist_kg == 0:
        return 1.0

    monatsziel_kg = jahresziel_kg / 12
    return min(monatsziel_kg / ist_kg, 1.0)

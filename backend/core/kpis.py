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

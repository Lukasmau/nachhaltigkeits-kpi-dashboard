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


def vergleich_je_kategorie(
    messungen_a: list[dict], messungen_b: list[dict], kategorien: list[str]
) -> dict:
    def summen_je_kategorie(messungen):
        vorhanden = set()
        summen = {}
        for messung in messungen:
            kategorie = messung["kategorie"]
            vorhanden.add(kategorie)
            co2e_kg = messung["co2e_kg"]
            if co2e_kg is not None:
                summen[kategorie] = summen.get(kategorie, 0) + co2e_kg
        return vorhanden, summen

    vorhanden_a, summen_a = summen_je_kategorie(messungen_a)
    vorhanden_b, summen_b = summen_je_kategorie(messungen_b)

    ergebnis = {}
    for kategorie in kategorien:
        in_a = kategorie in vorhanden_a
        in_b = kategorie in vorhanden_b
        wert_a = summen_a.get(kategorie, 0.0) if in_a else None
        wert_b = summen_b.get(kategorie, 0.0) if in_b else None

        if wert_a is not None and wert_b:
            veraenderung = (wert_a - wert_b) / wert_b
        else:
            veraenderung = None

        if in_a and in_b:
            hinweis = None
        elif in_a and not in_b:
            hinweis = "Keine Messung in Zeitraum B"
        elif in_b and not in_a:
            hinweis = "Keine Messung in Zeitraum A"
        else:
            hinweis = None

        ergebnis[kategorie] = {
            "wert_a_kg": wert_a,
            "wert_b_kg": wert_b,
            "veraenderung": veraenderung,
            "hinweis": hinweis,
        }

    return ergebnis


def zielerreichung(ist_kg: float | None, jahresziel_kg: float | None) -> float | None:
    # Budget-Verbrauch, nicht "Ziel erreicht": 100 % = Monatsbudget genau
    # ausgeschoepft, darueber (ungekappt) heisst ueber dem Budget. Weniger
    # Emissionen ergeben also einen kleineren Wert, nicht einen groesseren -
    # umgekehrt zur alten Formel (Ziel/Ist, gekappt auf 100 %).
    if ist_kg is None or jahresziel_kg is None:
        return None

    monatsziel_kg = jahresziel_kg / 12
    if monatsziel_kg == 0:
        return None

    return ist_kg / monatsziel_kg

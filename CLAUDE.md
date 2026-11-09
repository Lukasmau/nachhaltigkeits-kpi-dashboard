# CLAUDE.md: Nachhaltigkeits-KPI-Dashboard (DVA-Seminar Thema 24)

Einzelprojekt von Lukas (WI, THA Augsburg). Funktionaler Prototyp in ca. zwei Wochen. Seminar Sa 14.11.2026 (Folien Fr 13.11. auf Moodle). Schriftliche Ausarbeitung (7 bis 9 Seiten IEEE) bis 31.01.2027.
Alle Entscheidungen unten sind mit Lukas besprochen und begründet (Miro-Board "DVA Thema 24 Planung", Vault-Notiz "DVA Thema 24"). Nicht still ändern: Hast du eine bessere Idee, frag erst.

## 1. So arbeiten wir (wichtigste Regel)
Lukas muss jedes Modul verstehen und vor dem Kurs erklären können. Das Lernen zählt mehr als die Geschwindigkeit.
1. **Ein Modul pro Schritt.** Vorher in höchstens 3 Zeilen sagen, was kommt und warum.
2. **Nach jedem Modul:** in 2 Sätzen erklären, was es tut, dann **stehen bleiben**. Lukas erklärt es in eigenen Worten zurück (Teach-back). Stimmt es nicht, noch einmal anders erklären. Erst dann weiter.
3. **Markierte Stücke schreibt Lukas selbst** (siehe Releases), du begleitest: Frage stellen, Hinweis geben, Fehler benennen, **nicht die Lösung liefern**, außer er sagt ausdrücklich "gib mir die Lösung".
4. **Tests zuerst** im Kern (pytest): erst Normal- und Randfälle als Tests, dann die Funktion.
5. **Commit pro Modul**, im Commit-Text steht Lukas' Erklärung in eigenen Worten (daraus wird später der Bericht).
6. Fachbegriffe (Pydantic, Polars, Gradtagzahl …) beim ersten Mal in einem Satz erklären.
7. Rechtschreibung in allem, was Lukas abgibt (UI-Texte, Fehlermeldungen, Doku), sorgfältig prüfen. Deutsch, du-Form in der UI ist nicht nötig, sachlich und klar.
8. Keine stillen Annahmen: Unsicherheit offen sagen. Quellen prüfen, nichts erfinden.

## 2. Stack (entschieden)
- **Backend:** FastAPI + Pydantic. **Kern:** reines Python (`units.py`, `kpis.py`), keine Fremd-Imports, bekommt einfache Python-Daten. **Tests:** pytest.
- **Daten:** SQLite (`db.py`, nur SQL). **Import/CSV:** Polars (`importer.py`, nur Polars/CSV). Polars fängt nur Typfehler früh ab: **Fachprüfungen (Datum, Wert, Datenart, Kategorie, Einheit, Duplikate) schreiben wir selbst.**
- **Frontend:** React + Vite, Diagramme mit **ECharts** über `echarts-for-react` (Teilimport, Theme pro Modus registriert). Ein Befehl zum Starten (FastAPI liefert das gebaute Frontend aus).
- **Plan B:** NiceGUI, nur wenn das Frontend nicht trägt.
- Warum so (kurz): moderner und ansehnlicher als Streamlit/Dash; ECharts passt zum Look; Polars strenger bei Typen; SQLite reicht (lokal, wenig Schreibkonkurrenz).

## 3. Architektur: Schichten
```
Frontend ──► API (FastAPI) ──► Kern (units.py, kpis.py)
                                  ▲
                        db.py (nur SQL)   importer.py (nur Polars/CSV)
```
Regel: Nur trennen, wo ein Tausch realistisch ist (Frontend, SQLite→DuckDB in `db.py`, Polars→pandas in `importer.py`, Datenquelle CSV→Sensor später). Keine Schnittstellen für alles.

## 4. Datenmodell
- `measurements(id, datum, datenart, kategorie, wert, einheit, person)`. Fahrten brauchen eine eigene Zeilen-ID (zwei Fahrten am selben Tag sind gültig). `person` ist optional (nur bei Fahrten genutzt) und dient nur der Duplikat-Warnung beim Import (gleicher Name + Datum + Kategorie bereits vorhanden): löst **nie** ein Blockieren aus, nur eine Warnung, weil zwei Personen zufällig gleich heißen können.
- `factors(id, kategorie, einheit, faktor_kg_co2e_pro_einheit, quelle, stand)`. Faktor je Kategorie mit Quelle und Stand.
- `targets(kategorie, jahr, ziel_kg_co2e)`. Aktuell nur ein Gesamt-Jahresziel pro Jahr (Zeile mit `kategorie = "Gesamt"`), Monatsziel = Jahresziel / 12 für die Summe aller Kategorien. API summiert alle `targets`-Zeilen eines Jahres, statt nur die eine Gesamt-Zeile zu lesen — **Ausbau-Stelle:** einzelne Kategorie-Ziele addieren sich dann automatisch zum Gesamtziel, ohne die Abfrage zu ändern.
- **Rechnung:** kg CO₂e = Messwert × Faktor. Intern immer kg. Anzeige: unter 1.000 kg ganze kg, ab 1.000 kg Tonnen, **ein Diagramm nutzt nur eine Einheit**.
- Kategorien: Strom, Erdgas, Dienstreisen (Bahn, Pkw, Bus, Flug). Papier ist gestrichen (kein belegter Faktor).

## 5. Emissionsfaktoren (Seed, vor dem Einbau gegen die Quelle prüfen)
Quelle: UBA, Liste "Emissionsfaktoren zur Treibhausgasbilanzierung", Version 2.1 vom 28.02.2026, Bezugsjahr 2024.
- Strom DE 2025: 344 g CO₂/kWh (Schätzung, Stand 23.03.2026; 2024 vorläufig 353). Strom ist CO₂, Verkehr ist CO₂e (im Bericht erwähnen).
- Personenverkehr 2024 (TREMOD 6.71B, inkl. Vorkette, g CO₂e/Pkm): Pkw 164 (1,4 Pers.), Bahn Fernverkehr 26, Linienbus **Fernverkehr** 30 (Nahverkehr wäre 90, nicht verwechseln), Flug Inland 290. Am 08.11.2026 gegen die offizielle UBA-Tabelle geprüft (exakte Übereinstimmung), PDF liegt als Beleg unter `data/uba_vergleich_personenverkehr_2024.pdf`.
- Erdgas: **183,3 g CO₂e/kWh** (nicht 240 g wie zuerst vermutet – das war nur ein ungeprüfter Platzhalter, da die Datei dem ersten Chat nicht vorlag). Geprüft in `data/uba_liste_ef_für_thg_bilanzierung_v2.1.xlsx`, Blatt "01_Stationäre_Verbrennung" (Titel dort: "ohne Vorketten"), ID `01_10_02_005_01` "Erdgas (Brennwert)", Bezugsjahr 2024, Veröffentlichung 2025. Brennwert statt Heizwert gewählt, weil Versorger-Abrechnungen (unsere Messdaten) auf Brennwert basieren (Heizwert-Variante läge bei 202,9 g, ID `01_10_02_004_01`). Ohne Vorkette, laut Blatt-Titel.

## 6. KPIs (Stufe 1)
1. **CO₂e im Monat** = Summe aller Messungen.
2. **Anteil je Kategorie** = Kategorie / Monatssumme. Exakt rechnen, nur die Anzeige runden.
3. **Veränderung zum Vormonat** = (aktuell − Vormonat) / Vormonat. `None`, wenn Vormonat fehlt oder 0 ist. Kategorien einzeln kombinierbar, Hinweis, wenn eine Kategorie in einem der Monate fehlt. **Bewusste 0 ≠ nichts angegeben.**
4. **Zielerreichung** (Stufe 1): Monatsziel = Jahresziel / 12, Ziel/Ist maximal 100 %.
- **Randfälle:** leerer Monat → "Keine Werte angegeben" (nicht berechenbar). Lücke im Jahr → Info. Monat nur mit Nullen → Plausibilitätswarnung. Faktor fehlt → Warnung statt stiller 0. Ziel fehlt → nicht berechenbar.
- Tests: pro KPI ein Normalfall und die Randfälle (ca. 12 bis 15 kleine Tests).
- **Ausbau (nicht jetzt bauen):** Saison-Sollkurve aus aktuellen Vorjahresanteilen, Übertrag des Restbudgets, Witterungsbereinigung (Gradtagzahlen, BDEW), Live-Daten (Themenblatt schließt Live-Sensordaten als Pflicht aus; Lukas will sie später, die Datenquelle bleibt deshalb austauschbar; Energy-Charts/Fraunhofer ISE hat eine API, Endpunkte und Lizenz vorher prüfen), KI-Tipps.

## 7. Import-Regeln
- **Teil-Import:** gültige Zeilen übernehmen, fehlerhafte nicht, am Ende Tabelle mit **Zeile, Spalte, Grund, Tipp** (Beispiel: "Zeile 14, Datum: 31.02.2026 gibt es nicht, erwartet JJJJ-MM-TT").
- Bereits vorhandene Daten überspringen und melden. Gilt so nur für Strom/Erdgas (ein Wert pro Monat und Kategorie ist eindeutig, zweiter Wert = Fehler). Bei Fahrten nur warnen statt überspringen (gleicher Name + Datum + Kategorie bereits vorhanden), die Zeile wird trotzdem importiert, weil zwei echte Fahrten am selben Tag gültig sind und Namensgleichheit zwischen zwei Personen vorkommen kann.
- Beispieldaten: ein Skript erzeugt 24 Monate einer fiktiven Firma (Saison, Optimierung, Rückfall), klar als Beispiel gekennzeichnet. Dazu ein Datensatz mit absichtlichen Fehlern für den Import-Test. Erst nach R1 nötig.

## 8. Look (Design-Tokens als einzige Quelle für CSS-Variablen und ECharts-Theme)
- Palette **Tiefsee + Grün.** Dunkel: Hintergrund #06121B, Karte #0C1D29, Karte2 #132B3B, Text #EAF6FB, gedämpft #8FAEBF, Linie #1D3A4D, Akzent #38BDF8, zweite Farbe/gut #34D399, Abweichung #FB7185. Hell: Hintergrund #EFF6FA, Karte #FFFFFF, Karte2 #E1EEF5, Text #0A1F2E, gedämpft #4B6475, Linie #CFE0EA, Akzent #0369A1, zweite Farbe/gut #15803D, Abweichung #BE123C.
- Schriften: **Sora** (Überschriften) und **DM Sans** (Text). Mindestens ca. 16 px (Beamer).
- Bento-Karten, Seitenmenü, **Glow in der Diagrammfarbe** (CSS color-mix radial-gradient pro Karte), Dunkel und Hell umschaltbar.
- Erklärmodus: kleines, gedämpftes **?** an jeder Karte (Klick: Klartext in 1 bis 2 Sätzen, Formel, Zahlenbeispiel, Quelle), dazu ein Schalter für alle Erklärungen (beim ersten Start an). Texte zentral in einer Datei. Kein Dauertext auf der Karte.

## 9. Releases (feste Reihenfolge, Muss/Soll/Kann)
- **R0 Kern (Muss, bis So):** `units.py`, `kpis.py` mit allen 4 KPIs, Tests. *Lukas schreibt selbst (begleitet):* KPI "Veränderung zum Vormonat".
- **R1 Läuft (Muss, bis Mi 11.11. Abend):** Datenbank mit Faktoren und Quelle, CSV-Import mit Teil-Import und Fehlertabelle, API, Dashboard mit 4 KPI-Karten und 2 Diagrammen (Anteil, Verlauf), Beispieldaten, Dunkelmodus.
- **R2 Schön (Soll, bis Do):** Hellmodus, "?" mit Schalter, Glow, Vormonat mit kombinierbaren Kategorien und Hinweisen, Fahrten per Formular, **Export der KPI-Tabelle als CSV**.
- **R3 Bonus (Kann):** Publikum schätzt vorab, Zielkurve, weitere Diagramme.
- **Kassensturz Mi Abend:** Läuft R1 nicht, erst kürzen (z. B. ein Diagramm), Plan B nur wenn das Frontend klemmt.

## 10. Struktur (Vorschlag)
```
backend/  core/units.py  core/kpis.py  db.py  importer.py  api.py  seed/
frontend/ src/tokens.ts  src/theme/  src/components/  src/explain/texte.json
tests/    test_kpis.py  test_units.py  test_importer.py
docs/     entscheidungen.md  (Kurzfassung hier, Details im Miro/Vault)
```

## 11. Nicht tun
- Keine Annahmen still treffen, Werte nicht erfinden, keine Quellen erfinden.
- Keine neuen Bibliotheken ohne Rückfrage.
- Nichts aus dem Ausbau-Abschnitt bauen, bevor R1 läuft.
- Kern importiert nichts aus API, Datenbank oder Import.

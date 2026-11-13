import { useEffect, useState, type CSSProperties } from 'react'
import './App.css'
import {
  holeFruehestenMonat,
  holeSpaetestenMonat,
  holeKpis,
  holeVerlauf,
  type KpiAntwort,
  type VerlaufAntwort,
  type VerlaufEintrag,
} from './api'
import { AnteilDiagramm, gruppiereDienstreisen } from './components/AnteilDiagramm'
import { CsvImport } from './components/CsvImport'
import { ErklaerIcon } from './components/ErklaerIcon'
import { FahrtFormular } from './components/FahrtFormular'
import { FaktorenSeite } from './components/FaktorenSeite'
import { JahreszielFormular } from './components/JahreszielFormular'
import { KpiKarte } from './components/KpiKarte'
import { Sidebar, type Seite } from './components/Sidebar'
import { VergleichSeite } from './components/VergleichSeite'
import { VerlaufDiagramm } from './components/VerlaufDiagramm'
import { ZielerreichungKarte } from './components/ZielerreichungKarte'
import { csvHerunterladen, csvZahl } from './csvExport'
import { monatsLang } from './monate'

// Die Uebersicht startet im aktuellen Kalendermonat. Wie weit man vor- und
// zurueckblaettern kann, bestimmen die echten Daten (fruehester und
// spaetester Monat in der Datenbank).
const HEUTE = new Date()
const START_JAHR = HEUTE.getFullYear()
const START_MONAT = HEUTE.getMonth() + 1

function naechsterMonat(jahr: number, monat: number): [number, number] {
  return monat === 12 ? [jahr + 1, 1] : [jahr, monat + 1]
}

function vorherigerMonat(jahr: number, monat: number): [number, number] {
  return monat === 1 ? [jahr - 1, 12] : [jahr, monat - 1]
}

// Feste Reihenfolge fuer bekannte Kategorien, Rest (sollte es ihn geben) alphabetisch hinten an.
const KATEGORIEN_REIHENFOLGE = ['Strom', 'Erdgas', 'Dienstreisen']

function alleKategorien(monate: VerlaufEintrag[]): string[] {
  const gefunden = new Set<string>()
  for (const m of monate) {
    for (const k of Object.keys(gruppiereDienstreisen(m.anteile))) gefunden.add(k)
  }
  const bekannt = KATEGORIEN_REIHENFOLGE.filter((k) => gefunden.has(k))
  const unbekannt = [...gefunden].filter((k) => !KATEGORIEN_REIHENFOLGE.includes(k)).sort()
  return [...bekannt, ...unbekannt]
}

function App() {
  const [seite, setSeite] = useState<Seite>('uebersicht')
  const [jahr, setJahr] = useState(START_JAHR)
  const [monat, setMonat] = useState(START_MONAT)
  const [daten, setDaten] = useState<KpiAntwort | null>(null)
  const [verlauf, setVerlauf] = useState<VerlaufAntwort | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [fruehestesJahr, setFruehestesJahr] = useState<number | null>(null)
  const [fruehesterMonat, setFruehesterMonat] = useState<number | null>(null)
  const [spaetestesJahr, setSpaetestesJahr] = useState<number | null>(null)
  const [spaetesterMonat, setSpaetesterMonat] = useState<number | null>(null)

  useEffect(() => {
    holeFruehestenMonat()
      .then((f) => {
        setFruehestesJahr(f.jahr)
        setFruehesterMonat(f.monat)
      })
      .catch((e: Error) => setFehler(e.message))
  }, [])

  // Beim Wechsel zurueck zur Uebersicht neu laden, damit frisch eingetragene
  // Messungen (z. B. Fahrt im Folgemonat) den Pfeil nach vorn freischalten.
  useEffect(() => {
    if (seite !== 'uebersicht') return
    holeSpaetestenMonat()
      .then((s) => {
        setSpaetestesJahr(s.jahr)
        setSpaetesterMonat(s.monat)
      })
      .catch((e: Error) => setFehler(e.message))
  }, [seite])

  useEffect(() => {
    holeKpis(jahr, monat)
      .then(setDaten)
      .catch((e: Error) => setFehler(e.message))
  }, [jahr, monat])

  useEffect(() => {
    holeVerlauf(jahr)
      .then(setVerlauf)
      .catch((e: Error) => setFehler(e.message))
  }, [jahr])

  const kannZurueck =
    fruehestesJahr !== null &&
    fruehesterMonat !== null &&
    (jahr > fruehestesJahr || (jahr === fruehestesJahr && monat > fruehesterMonat))
  const kannVor =
    spaetestesJahr !== null &&
    spaetesterMonat !== null &&
    (jahr < spaetestesJahr || (jahr === spaetestesJahr && monat < spaetesterMonat))

  function zurueck() {
    if (!kannZurueck) return
    const [j, m] = vorherigerMonat(jahr, monat)
    setJahr(j)
    setMonat(m)
  }

  function vor() {
    if (!kannVor) return
    const [j, m] = naechsterMonat(jahr, monat)
    setJahr(j)
    setMonat(m)
  }

  const anteile = daten?.anteil_je_kategorie.anteile
  const groessterEintrag = anteile
    ? Object.entries(anteile).reduce((groesste, aktuell) =>
        aktuell[1] > groesste[1] ? aktuell : groesste
      )
    : null

  // Verhaeltnis (0 bis 1) in Prozent fuer die Sparklines, null bleibt null.
  const alsProzentReihe = (werte: (number | null)[] | undefined) =>
    werte?.map((w) => (w === null ? null : w * 100))

  if (seite === 'csv-import') {
    return (
      <div className="layout">
        <Sidebar aktuelleSeite={seite} aufSeiteWechseln={setSeite} />
        <div className="layout__inhalt">
          <CsvImport />
        </div>
      </div>
    )
  }

  if (seite === 'fahrt-erfassen') {
    return (
      <div className="layout">
        <Sidebar aktuelleSeite={seite} aufSeiteWechseln={setSeite} />
        <div className="layout__inhalt">
          <FahrtFormular />
        </div>
      </div>
    )
  }

  if (seite === 'jahresziel') {
    return (
      <div className="layout">
        <Sidebar aktuelleSeite={seite} aufSeiteWechseln={setSeite} />
        <div className="layout__inhalt">
          <JahreszielFormular />
        </div>
      </div>
    )
  }

  if (seite === 'faktoren') {
    return (
      <div className="layout">
        <Sidebar aktuelleSeite={seite} aufSeiteWechseln={setSeite} />
        <div className="layout__inhalt">
          <FaktorenSeite />
        </div>
      </div>
    )
  }

  if (seite === 'vergleichen') {
    return (
      <div className="layout">
        <Sidebar aktuelleSeite={seite} aufSeiteWechseln={setSeite} />
        <div className="layout__inhalt">
          <VergleichSeite />
        </div>
      </div>
    )
  }

  return (
    <div className="layout">
      <Sidebar aktuelleSeite={seite} aufSeiteWechseln={setSeite} />
      <div className="layout__inhalt">
        <div className="app">
          <div className="monats-navigation">
            <button
              type="button"
              className="monats-navigation__pfeil"
              onClick={zurueck}
              disabled={!kannZurueck}
              aria-label="Vormonat"
            >
              ←
            </button>
            <h1>
              Übersicht {monatsLang[monat - 1]} {jahr}
            </h1>
            <button
              type="button"
              className="monats-navigation__pfeil"
              onClick={vor}
              disabled={!kannVor}
              aria-label="Nächster Monat"
            >
              →
            </button>
          </div>
          {fehler && <p className="app__fehler">{fehler}</p>}
          {daten && (
            <div className="app__grid">
              <KpiKarte
                titel={`Emissionen im ${monatsLang[monat - 1]}`}
                wert={daten.co2e_im_monat.wert}
                einheit={daten.co2e_im_monat.einheit}
                hinweis={daten.co2e_im_monat.warnungen[0] ?? 'Keine Werte angegeben'}
                sparklineWerte={verlauf?.monate.map((m) => m.wert)}
                erklaerung="co2e_im_monat"
              />
              <KpiKarte
                titel="Veränderung zum Vormonat"
                wert={
                  daten.veraenderung_zum_vormonat === null
                    ? null
                    : daten.veraenderung_zum_vormonat * 100
                }
                einheit="%"
                hinweis="Vormonat fehlt oder ist 0"
                farbe={
                  daten.veraenderung_zum_vormonat === null
                    ? 'neutral'
                    : daten.veraenderung_zum_vormonat < 0
                      ? 'gut'
                      : 'schlecht'
                }
                mitVorzeichen
                sparklineWerte={alsProzentReihe(verlauf?.monate.map((m) => m.veraenderung))}
                erklaerung="veraenderung_zum_vormonat"
              />
              <KpiKarte
                titel={groessterEintrag ? `Größter Posten: ${groessterEintrag[0]}` : 'Größter Posten'}
                wert={groessterEintrag ? groessterEintrag[1] * 100 : null}
                einheit="%"
                hinweis="Keine Werte angegeben"
                sparklineWerte={alsProzentReihe(
                  groessterEintrag
                    ? verlauf?.monate.map((m) =>
                        // Monat ohne Daten: Luecke. Monat mit Daten, aber ohne diese
                        // Kategorie: echter Anteil 0 %.
                        Object.keys(m.anteile).length === 0
                          ? null
                          : (m.anteile[groessterEintrag[0]] ?? 0)
                      )
                    : undefined
                )}
                erklaerung="groesster_posten"
              />
              <ZielerreichungKarte
                titel="Zielerreichung"
                prozent={
                  daten.zielerreichung === null ? null : daten.zielerreichung * 100
                }
                hinweis={
                  daten.co2e_im_monat.wert === null
                    ? 'Noch keine Messwerte'
                    : 'Ziel fehlt oder nicht berechenbar'
                }
              />
            </div>
          )}
          <div className="app__grid app__grid--diagramme">
            {verlauf && (
              <div
                className="app__diagramm"
                style={{ '--glow-farbe': 'var(--akzent)' } as CSSProperties}
              >
                <div className="app__diagramm-kopf">
                  <h2>
                    Verlauf {jahr}
                    <ErklaerIcon schluessel="verlauf" />
                  </h2>
                  <button
                    type="button"
                    className="export-knopf"
                    onClick={() => {
                      const kategorien = alleKategorien(verlauf.monate)
                      csvHerunterladen(
                        `verlauf_${jahr}.csv`,
                        [
                          'Monat',
                          `Gesamt (${verlauf.einheit})`,
                          'Veränderung (%)',
                          'Zielerreichung (%)',
                          ...kategorien.map((k) => `${k} Anteil (%)`),
                        ],
                        verlauf.monate.map((m) => {
                          const gruppiert = gruppiereDienstreisen(m.anteile)
                          return [
                            monatsLang[m.monat - 1],
                            csvZahl(m.wert),
                            csvZahl(m.veraenderung !== null ? m.veraenderung * 100 : null),
                            csvZahl(m.zielerreichung !== null ? m.zielerreichung * 100 : null),
                            ...kategorien.map((k) => {
                              const anteil = gruppiert[k] ?? null
                              return csvZahl(anteil !== null ? anteil * 100 : null)
                            }),
                          ]
                        })
                      )
                    }}
                  >
                    CSV exportieren
                  </button>
                </div>
                <VerlaufDiagramm
                  verlauf={verlauf.monate}
                  einheit={verlauf.einheit}
                  monatsziel={verlauf.monatsziel}
                />
              </div>
            )}
            {daten && (
              <div
                className="app__diagramm"
                style={{ '--glow-farbe': 'var(--gut)' } as CSSProperties}
              >
                <h2>
                  Anteil je Kategorie
                  <ErklaerIcon schluessel="anteil" />
                </h2>
                {anteile ? (
                  <AnteilDiagramm anteile={anteile} />
                ) : (
                  <p className="app__hinweis-text">Noch keine Daten</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

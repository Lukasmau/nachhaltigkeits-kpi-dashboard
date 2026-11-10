import { useEffect, useState, type CSSProperties } from 'react'
import './App.css'
import { holeKpis, holeVerlauf, type KpiAntwort, type VerlaufAntwort } from './api'
import { AnteilDiagramm } from './components/AnteilDiagramm'
import { CsvImport } from './components/CsvImport'
import { ErklaerIcon } from './components/ErklaerIcon'
import { FahrtFormular } from './components/FahrtFormular'
import { JahreszielFormular } from './components/JahreszielFormular'
import { KpiKarte } from './components/KpiKarte'
import { Sidebar, type Seite } from './components/Sidebar'
import { VergleichSeite } from './components/VergleichSeite'
import { VerlaufDiagramm } from './components/VerlaufDiagramm'
import { ZielerreichungKarte } from './components/ZielerreichungKarte'
import { monatsLang } from './monate'

// Noch fest verdrahtet, bis es eine Monats-/Jahresauswahl im Frontend gibt.
const JAHR = 2026
const MONAT = 10

function App() {
  const [seite, setSeite] = useState<Seite>('uebersicht')
  const [daten, setDaten] = useState<KpiAntwort | null>(null)
  const [verlauf, setVerlauf] = useState<VerlaufAntwort | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    holeKpis(JAHR, MONAT)
      .then(setDaten)
      .catch((e: Error) => setFehler(e.message))
    holeVerlauf(JAHR)
      .then(setVerlauf)
      .catch((e: Error) => setFehler(e.message))
  }, [])

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
          <h1>Übersicht {monatsLang[MONAT - 1]}</h1>
          {fehler && <p className="app__fehler">{fehler}</p>}
          {daten && (
            <div className="app__grid">
              <KpiKarte
                titel={`CO2e im ${monatsLang[MONAT - 1]}`}
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
                  verlauf?.monate.map((m) => m.anteil_groesste_kategorie)
                )}
                erklaerung="groesster_posten"
              />
              <ZielerreichungKarte
                titel="Zielerreichung"
                prozent={
                  daten.zielerreichung === null ? null : daten.zielerreichung * 100
                }
                hinweis="Ziel fehlt oder nicht berechenbar"
              />
            </div>
          )}
          <div className="app__grid app__grid--diagramme">
            {verlauf && (
              <div
                className="app__diagramm"
                style={{ '--glow-farbe': 'var(--akzent)' } as CSSProperties}
              >
                <h2>
                  Verlauf {JAHR}
                  <ErklaerIcon schluessel="verlauf" />
                </h2>
                <VerlaufDiagramm
                  verlauf={verlauf.monate}
                  einheit={verlauf.einheit}
                  monatsziel={verlauf.monatsziel}
                />
              </div>
            )}
            {anteile && (
              <div
                className="app__diagramm"
                style={{ '--glow-farbe': 'var(--gut)' } as CSSProperties}
              >
                <h2>
                  Anteil je Kategorie
                  <ErklaerIcon schluessel="anteil" />
                </h2>
                <AnteilDiagramm anteile={anteile} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

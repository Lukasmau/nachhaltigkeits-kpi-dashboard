import { useEffect, useState } from 'react'
import './App.css'
import { holeKpis, holeVerlauf, type KpiAntwort, type VerlaufAntwort } from './api'
import { AnteilDiagramm } from './components/AnteilDiagramm'
import { KpiKarte } from './components/KpiKarte'
import { VerlaufDiagramm } from './components/VerlaufDiagramm'
import { monatsLang } from './monate'

// Noch fest verdrahtet, bis es eine Monats-/Jahresauswahl im Frontend gibt.
const JAHR = 2026
const MONAT = 10

function App() {
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

  return (
    <div className="app">
      <h1>Nachhaltigkeits-KPI-Dashboard</h1>
      {fehler && <p className="app__fehler">{fehler}</p>}
      {daten && (
        <div className="app__karten">
          <KpiKarte
            titel={`CO2e im ${monatsLang[MONAT - 1]}`}
            wert={daten.co2e_im_monat.wert}
            einheit={daten.co2e_im_monat.einheit}
            hinweis={daten.co2e_im_monat.warnungen[0] ?? 'Keine Werte angegeben'}
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
          />
          <KpiKarte
            titel="Zielerreichung"
            wert={
              daten.zielerreichung === null ? null : daten.zielerreichung * 100
            }
            einheit="%"
            hinweis="Ziel fehlt oder nicht berechenbar"
          />
          <KpiKarte
            titel={groessterEintrag ? `Größter Posten: ${groessterEintrag[0]}` : 'Größter Posten'}
            wert={groessterEintrag ? groessterEintrag[1] * 100 : null}
            einheit="%"
            hinweis="Keine Werte angegeben"
          />
        </div>
      )}
      <div className="app__diagramme">
        {anteile && (
          <div className="app__diagramm">
            <h2>Anteil je Kategorie</h2>
            <AnteilDiagramm anteile={anteile} />
          </div>
        )}
        {verlauf && (
          <div className="app__diagramm">
            <h2>Verlauf {JAHR}</h2>
            <VerlaufDiagramm verlauf={verlauf.monate} einheit={verlauf.einheit} />
          </div>
        )}
      </div>
    </div>
  )
}

export default App

import { useEffect, useState } from 'react'
import './App.css'
import { holeKpis, type KpiAntwort } from './api'
import { KpiKarte } from './components/KpiKarte'

function App() {
  const [daten, setDaten] = useState<KpiAntwort | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    holeKpis(2026, 1)
      .then(setDaten)
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
            titel="CO2e im Monat"
            wert={daten.co2e_im_monat.wert_kg}
            einheit="kg"
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
    </div>
  )
}

export default App

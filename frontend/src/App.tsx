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

  return (
    <div className="app">
      <h1>Nachhaltigkeits-KPI-Dashboard</h1>
      {fehler && <p className="app__fehler">{fehler}</p>}
      {daten && (
        <KpiKarte
          titel="CO2e im Monat"
          wert={daten.co2e_im_monat.wert_kg}
          einheit="kg"
          warnungen={daten.co2e_im_monat.warnungen}
        />
      )}
    </div>
  )
}

export default App

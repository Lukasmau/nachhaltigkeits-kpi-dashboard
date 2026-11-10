import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { holeJahresziele, speichereJahresziel, type Jahresziel } from '../api'

// Noch fest verdrahtet, bis es eine Monats-/Jahresauswahl im Frontend gibt (siehe App.tsx).
const JAHR = 2026

export function JahreszielFormular() {
  const [jahr, setJahr] = useState(String(JAHR))
  const [ziel, setZiel] = useState('')
  const [speichert, setSpeichert] = useState(false)
  const [erfolg, setErfolg] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [ziele, setZiele] = useState<Jahresziel[]>([])

  async function ladeZiele() {
    try {
      const geladen = await holeJahresziele()
      setZiele(geladen)
      const aktuelles = geladen.find((z) => z.jahr === Number(jahr))
      if (aktuelles) setZiel(String(aktuelles.ziel_kg_co2e))
    } catch {
      // Tabelle bleibt einfach leer, das Formular funktioniert trotzdem.
    }
  }

  useEffect(() => {
    ladeZiele()
    // nur beim ersten Laden vorbefuellen, danach soll ein Tippen im Jahr-Feld
    // das eingegebene Ziel nicht ueberschreiben
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function speichern(e: FormEvent) {
    e.preventDefault()
    setSpeichert(true)
    setErfolg(false)
    setFehler(null)
    try {
      await speichereJahresziel({ jahr: Number(jahr), ziel_kg_co2e: Number(ziel) })
      setErfolg(true)
      ladeZiele()
    } catch (e) {
      setFehler((e as Error).message)
    } finally {
      setSpeichert(false)
    }
  }

  const zielZahl = Number(ziel)
  const monatsziel = ziel !== '' && !Number.isNaN(zielZahl) ? zielZahl / 12 : null

  return (
    <div className="app">
      <h1>Jahresziel</h1>
      <p className="app__hinweis-text">
        Legt das Gesamt-Jahresziel fest. Das Monatsziel (Jahresziel ÷ 12) steuert die
        Zielerreichung-Anzeige.
      </p>

      <div className="fahrt-seite__grid">
        <div className="app__diagramm" style={{ '--glow-farbe': 'var(--gut)' } as CSSProperties}>
          <form className="eingabe-formular" onSubmit={speichern}>
            <div>
              <label htmlFor="j-jahr">Jahr</label>
              <input
                id="j-jahr"
                type="number"
                value={jahr}
                onChange={(e) => setJahr(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="j-ziel">Jahresziel (kg CO2e)</label>
              <input
                id="j-ziel"
                className="eingabe-formular__wert-gross"
                type="number"
                min="0"
                step="any"
                value={ziel}
                onChange={(e) => setZiel(e.target.value)}
                required
              />
            </div>
            {monatsziel !== null && (
              <p className="app__hinweis-text">Monatsziel: {monatsziel.toFixed(1)} kg</p>
            )}
            <button type="submit" disabled={speichert}>
              {speichert ? 'Speichert …' : 'Ziel speichern'}
            </button>
          </form>

          {erfolg && <p className="app__hinweis-text">Ziel gespeichert.</p>}
          {fehler && <p className="app__fehler">{fehler}</p>}
        </div>

        <div className="app__diagramm" style={{ '--glow-farbe': 'var(--akzent)' } as CSSProperties}>
          <h2>Ziele der letzten Jahre</h2>
          {ziele.length > 0 ? (
            <table className="letzte-tabelle">
              <thead>
                <tr>
                  <th>Jahr</th>
                  <th>Ziel</th>
                </tr>
              </thead>
              <tbody>
                {ziele.map((z) => (
                  <tr key={z.jahr}>
                    <td>{z.jahr}</td>
                    <td>{(z.ziel_kg_co2e / 1000).toFixed(1)} t</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="app__hinweis-text">Noch kein Jahresziel gesetzt.</p>
          )}
        </div>
      </div>
    </div>
  )
}

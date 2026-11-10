import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import {
  FahrtFehlerAntwort,
  holeLetzteMessungen,
  speichereFahrt,
  type FahrtFehler,
  type LetzteMessung,
} from '../api'

const KATEGORIEN = [
  { wert: 'Dienstreisen Bahn', label: 'Bahn' },
  { wert: 'Dienstreisen Pkw', label: 'Pkw' },
  { wert: 'Dienstreisen Bus', label: 'Bus' },
  { wert: 'Dienstreisen Flug', label: 'Flug' },
]

export function FahrtFormular() {
  const [datum, setDatum] = useState('')
  const [kategorie, setKategorie] = useState(KATEGORIEN[0].wert)
  const [wert, setWert] = useState('')
  const [person, setPerson] = useState('')
  const [speichert, setSpeichert] = useState(false)
  const [erfolg, setErfolg] = useState<{ warnung: string | null } | null>(null)
  const [fachfehler, setFachfehler] = useState<FahrtFehler[] | null>(null)
  const [netzwerkfehler, setNetzwerkfehler] = useState<string | null>(null)
  const [letzteFahrten, setLetzteFahrten] = useState<LetzteMessung[]>([])

  async function ladeLetzteFahrten() {
    try {
      setLetzteFahrten(await holeLetzteMessungen(5, 'fahrt'))
    } catch {
      // Tabelle bleibt einfach leer, das Formular selbst funktioniert trotzdem.
    }
  }

  useEffect(() => {
    ladeLetzteFahrten()
  }, [])

  async function speichern(e: FormEvent) {
    e.preventDefault()
    setSpeichert(true)
    setErfolg(null)
    setFachfehler(null)
    setNetzwerkfehler(null)
    try {
      const ergebnis = await speichereFahrt({
        datum,
        kategorie,
        wert: Number(wert),
        person: person || undefined,
      })
      setErfolg({ warnung: ergebnis.warnung })
      setDatum('')
      setWert('')
      setPerson('')
      ladeLetzteFahrten()
    } catch (e) {
      if (e instanceof FahrtFehlerAntwort) {
        setFachfehler(e.fehler)
      } else {
        setNetzwerkfehler((e as Error).message)
      }
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="app">
      <h1>Fahrt erfassen</h1>
      <p className="app__hinweis-text">
        Eine einzelne Dienstreise eintragen – nutzt dieselben Prüf-Funktionen wie der CSV-Import.
      </p>

      <div className="fahrt-seite__grid">
      <div
        className="app__diagramm fahrt-formular-karte"
        style={{ '--glow-farbe': 'var(--akzent)' } as CSSProperties}
      >
        <form className="fahrt-formular" onSubmit={speichern}>
          <div>
            <label htmlFor="f-datum">Datum</label>
            <input
              id="f-datum"
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="f-kategorie">Kategorie</label>
            <select id="f-kategorie" value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
              <optgroup label="Dienstreisen">
                {KATEGORIEN.map((k) => (
                  <option key={k.wert} value={k.wert}>
                    {k.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label htmlFor="f-wert">Wert (Pkm)</label>
            <input
              id="f-wert"
              type="number"
              min="0"
              step="any"
              placeholder="z. B. 180"
              value={wert}
              onChange={(e) => setWert(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="f-person">
              Person <span className="app__hinweis-text">(optional, für Duplikat-Warnung)</span>
            </label>
            <input
              id="f-person"
              type="text"
              placeholder="z. B. Lukas"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            />
          </div>
          <button type="submit" disabled={speichert}>
            {speichert ? 'Speichert …' : 'Fahrt speichern'}
          </button>
        </form>

        {erfolg && (
          <p className={erfolg.warnung ? 'app__fehler' : 'app__hinweis-text'}>
            Fahrt gespeichert.{erfolg.warnung ? ` Warnung: ${erfolg.warnung}` : ''}
          </p>
        )}
        {netzwerkfehler && <p className="app__fehler">{netzwerkfehler}</p>}
        {fachfehler && (
          <ul className="import-warnungen">
            {fachfehler.map((f, i) => (
              <li key={i}>
                {f.spalte}: {f.grund} ({f.tipp})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="app__diagramm"
        style={{ '--glow-farbe': 'var(--gut)' } as CSSProperties}
      >
        <h2>Zuletzt erfasste Fahrten</h2>
        {letzteFahrten.length > 0 ? (
          <table className="letzte-tabelle">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Kategorie</th>
                <th>Wert</th>
                <th>Person</th>
              </tr>
            </thead>
            <tbody>
              {letzteFahrten.map((f, i) => (
                <tr key={i}>
                  <td>{f.datum}</td>
                  <td>{f.kategorie}</td>
                  <td>
                    {f.wert} {f.einheit}
                  </td>
                  <td>{f.person ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="app__hinweis-text">Noch keine Fahrt erfasst.</p>
        )}
      </div>
      </div>
    </div>
  )
}

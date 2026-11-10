import { useState, type CSSProperties, type FormEvent } from 'react'
import { FahrtFehlerAntwort, speichereFahrt, type FahrtFehler } from '../api'

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
    </div>
  )
}

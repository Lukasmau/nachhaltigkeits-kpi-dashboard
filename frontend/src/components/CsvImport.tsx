import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  holeLetzteMessungen,
  importiereCsv,
  type ImportErgebnis,
  type LetzteMessung,
} from '../api'

export function CsvImport() {
  const [ergebnis, setErgebnis] = useState<ImportErgebnis | null>(null)
  const [fehlerText, setFehlerText] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)
  const [ziehtUeber, setZiehtUeber] = useState(false)
  const [letzteMessungen, setLetzteMessungen] = useState<LetzteMessung[]>([])
  const dateiEingabe = useRef<HTMLInputElement>(null)

  async function ladeLetzteMessungen() {
    try {
      setLetzteMessungen(await holeLetzteMessungen(5))
    } catch {
      // Tabelle bleibt einfach leer, der Import selbst funktioniert trotzdem.
    }
  }

  useEffect(() => {
    ladeLetzteMessungen()
  }, [])

  async function hochladen(datei: File) {
    setLaedt(true)
    setFehlerText(null)
    setErgebnis(null)
    try {
      setErgebnis(await importiereCsv(datei))
      ladeLetzteMessungen()
    } catch (e) {
      setFehlerText((e as Error).message)
    } finally {
      setLaedt(false)
    }
  }

  return (
    <div className="app">
      <h1>CSV importieren</h1>
      <p className="app__hinweis-text">
        Lade eine CSV-Datei mit Strom-, Erdgas- oder Fahrtdaten hoch. Fehlerhafte Zeilen werden
        einzeln gemeldet, der Rest wird trotzdem übernommen.
      </p>

      <div className="app__grid app__grid--diagramme">
        <div
          className={ziehtUeber ? 'dropzone dropzone--aktiv' : 'dropzone'}
          style={{ '--glow-farbe': 'var(--akzent)' } as CSSProperties}
          onDragOver={(e) => {
            e.preventDefault()
            setZiehtUeber(true)
          }}
          onDragLeave={() => setZiehtUeber(false)}
          onDrop={(e) => {
            e.preventDefault()
            setZiehtUeber(false)
            const datei = e.dataTransfer.files[0]
            if (datei) hochladen(datei)
          }}
        >
          <svg
            className="dropzone__icon"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path d="M12 3v12m0-12 4 4m-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p>CSV-Datei hierher ziehen</p>
          <p className="dropzone__oder">oder</p>
          <button type="button" onClick={() => dateiEingabe.current?.click()}>
            Datei wählen
          </button>
          <input
            ref={dateiEingabe}
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => {
              const datei = e.target.files?.[0]
              if (datei) hochladen(datei)
            }}
          />
        </div>

        <div className="app__diagramm" style={{ '--glow-farbe': 'var(--akzent)' } as CSSProperties}>
          <h2>Erwartetes Format</h2>
          <table className="format-tabelle">
            <tbody>
              <tr>
                <td>datum</td>
                <td>JJJJ-MM-TT</td>
              </tr>
              <tr>
                <td>datenart</td>
                <td>verbrauch / fahrt</td>
              </tr>
              <tr>
                <td>kategorie</td>
                <td>Strom, Erdgas, Dienstreisen (Bahn/Pkw/Bus/Flug)</td>
              </tr>
              <tr>
                <td>wert</td>
                <td>Zahl</td>
              </tr>
              <tr>
                <td>einheit</td>
                <td>kWh, Pkm</td>
              </tr>
              <tr>
                <td>person</td>
                <td>optional (Fahrt)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="app__diagramm import-ergebnis"
        style={{ '--glow-farbe': 'var(--gut)' } as CSSProperties}
      >
        {ergebnis ? (
          <>
            <div className="import-ergebnis__kopf">
              <h2>Ergebnis</h2>
              <span className="import-badge import-badge--gut">
                {ergebnis.importiert} übernommen
              </span>
              {ergebnis.fehler.length > 0 && (
                <span className="import-badge import-badge--schlecht">
                  {ergebnis.fehler.length} Fehler
                </span>
              )}
            </div>

            {ergebnis.warnungen.length > 0 && (
              <ul className="import-warnungen">
                {ergebnis.warnungen.map((w) => (
                  <li key={w.zeile}>
                    Zeile {w.zeile}: {w.grund}
                  </li>
                ))}
              </ul>
            )}

            {ergebnis.fehler.length > 0 && (
              <table className="import-fehler-tabelle">
                <thead>
                  <tr>
                    <th>Zeile</th>
                    <th>Spalte</th>
                    <th>Grund</th>
                    <th>Tipp</th>
                  </tr>
                </thead>
                <tbody>
                  {ergebnis.fehler.map((f, i) => (
                    <tr key={i}>
                      <td>{f.zeile}</td>
                      <td>{f.spalte}</td>
                      <td>{f.grund}</td>
                      <td>{f.tipp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <>
            <h2>Ergebnis</h2>
            <p className={fehlerText ? 'app__fehler' : 'app__hinweis-text'}>
              {laedt
                ? 'Importiere …'
                : (fehlerText ?? 'Hier erscheint das Ergebnis nach dem Hochladen.')}
            </p>
          </>
        )}
      </div>

      <div
        className="app__diagramm"
        style={{ '--glow-farbe': 'var(--akzent)' } as CSSProperties}
      >
        <h2>Zuletzt hinzugefügt</h2>
        {letzteMessungen.length > 0 ? (
          <table className="letzte-tabelle">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Datenart</th>
                <th>Kategorie</th>
                <th>Wert</th>
                <th>Person</th>
              </tr>
            </thead>
            <tbody>
              {letzteMessungen.map((m, i) => (
                <tr key={i}>
                  <td>{m.datum}</td>
                  <td>{m.datenart}</td>
                  <td>{m.kategorie}</td>
                  <td>
                    {m.wert} {m.einheit}
                  </td>
                  <td>{m.person ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="app__hinweis-text">Noch keine Daten importiert.</p>
        )}
      </div>
    </div>
  )
}

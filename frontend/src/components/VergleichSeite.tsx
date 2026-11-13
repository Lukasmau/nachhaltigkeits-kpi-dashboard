import { useEffect, useState, type CSSProperties } from 'react'
import { holeVergleich, type VergleichAntwort } from '../api'
import { csvHerunterladen, csvZahl } from '../csvExport'
import { monatsLang } from '../monate'

// Noch fest verdrahtet, bis es eine Monats-/Jahresauswahl im Frontend gibt (siehe App.tsx).
const JAHR = 2026
const MONAT = 10
const JAHRE = [2024, 2025, 2026]

// Gleiche "heute"-Grenze wie HEUTE_JAHR in App.tsx (demo-fest auf Oktober
// 2026): das laufende Jahr hat noch keine 12 Monate Daten, ein Vergleich
// gegen ein volles Jahr ist dann nicht fair.
const HEUTE_JAHR = 2026

type Modus = 'monat' | 'jahr'

type GruppenZeile = {
  name: string
  wertA: number | null
  wertB: number | null
  veraenderung: number | null
  hinweis: string | null
}

// Fasst alle "Dienstreisen ..."-Kategorien zu einer Sammelzeile zusammen,
// gleiche Idee wie in AnteilDiagramm.tsx, nur fuer die reichhaltigeren
// Vergleichs-Werte (wert_a/wert_b/hinweis statt nur ein Anteil).
function gruppiereDienstreisen(kategorien: VergleichAntwort['kategorien']): GruppenZeile[] {
  const gruppen: Record<string, { wertA: number; hatA: boolean; wertB: number; hatB: boolean }> = {}

  for (const [name, eintrag] of Object.entries(kategorien)) {
    const gruppenName = name.startsWith('Dienstreisen ') ? 'Dienstreisen' : name
    const g = gruppen[gruppenName] ?? { wertA: 0, hatA: false, wertB: 0, hatB: false }
    if (eintrag.wert_a !== null) {
      g.wertA += eintrag.wert_a
      g.hatA = true
    }
    if (eintrag.wert_b !== null) {
      g.wertB += eintrag.wert_b
      g.hatB = true
    }
    gruppen[gruppenName] = g
  }

  return Object.entries(gruppen).map(([name, g]) => ({
    name,
    wertA: g.hatA ? g.wertA : null,
    wertB: g.hatB ? g.wertB : null,
    veraenderung: g.hatA && g.hatB && g.wertB !== 0 ? (g.wertA - g.wertB) / g.wertB : null,
    hinweis: !g.hatA
      ? 'Keine Messung in Zeitraum A'
      : !g.hatB
        ? 'Keine Messung in Zeitraum B'
        : null,
  }))
}

export function VergleichSeite() {
  const [modus, setModus] = useState<Modus>('monat')
  const [jahrA, setJahrA] = useState(JAHR)
  const [monatA, setMonatA] = useState(MONAT)
  const [jahrB, setJahrB] = useState(JAHR)
  const [monatB, setMonatB] = useState(MONAT === 1 ? 12 : MONAT - 1)
  const [daten, setDaten] = useState<VergleichAntwort | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    holeVergleich(jahrA, jahrB, modus === 'monat' ? monatA : undefined, modus === 'monat' ? monatB : undefined)
      .then(setDaten)
      .catch((e: Error) => setFehler(e.message))
  }, [modus, jahrA, monatA, jahrB, monatB])

  const zeilen = daten ? gruppiereDienstreisen(daten.kategorien) : []
  const maxWert = Math.max(
    1,
    ...zeilen.flatMap((z) => [z.wertA ?? 0, z.wertB ?? 0])
  )
  const einheit = daten?.einheit ?? 'kg'

  const labelA =
    modus === 'monat' ? `${monatsLang[monatA - 1]} ${jahrA}` : `${jahrA}`
  const labelB =
    modus === 'monat' ? `${monatsLang[monatB - 1]} ${jahrB}` : `${jahrB}`

  const unvollstaendigesJahr =
    modus === 'jahr' && (jahrA === HEUTE_JAHR || jahrB === HEUTE_JAHR) ? HEUTE_JAHR : null

  return (
    <div className="app">
      <h1>Vergleichen</h1>
      <p className="app__hinweis-text">
        Zwei Zeiträume nebeneinander vergleichen, je Kategorie. Egal ob dahinter eine
        CSV-Zeile pro Monat oder viele einzelne Fahrten stecken – am Ende zählt nur die
        Summe pro Kategorie und Zeitraum.
      </p>

      <div
        className="app__diagramm vergleich-auswahl"
        style={{ '--glow-farbe': 'var(--akzent)' } as CSSProperties}
      >
        <div className="segment">
          <button
            type="button"
            className={modus === 'monat' ? 'aktiv' : ''}
            onClick={() => setModus('monat')}
          >
            Monat vergleichen
          </button>
          <button
            type="button"
            className={modus === 'jahr' ? 'aktiv' : ''}
            onClick={() => setModus('jahr')}
          >
            Jahr vergleichen
          </button>
        </div>

        <div className="vergleich-auswahl__felder">
          <div>
            <label>Zeitraum A</label>
            <div className="vergleich-auswahl__paar">
              {modus === 'monat' && (
                <select value={monatA} onChange={(e) => setMonatA(Number(e.target.value))}>
                  {monatsLang.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
              <select value={jahrA} onChange={(e) => setJahrA(Number(e.target.value))}>
                {JAHRE.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label>Zeitraum B</label>
            <div className="vergleich-auswahl__paar">
              {modus === 'monat' && (
                <select value={monatB} onChange={(e) => setMonatB(Number(e.target.value))}>
                  {monatsLang.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
              <select value={jahrB} onChange={(e) => setJahrB(Number(e.target.value))}>
                {JAHRE.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {unvollstaendigesJahr !== null && (
        <p className="app__hinweis-text">
          {unvollstaendigesJahr} ist unvollständig – Vergleich nicht zu 100 % fair.
        </p>
      )}

      {fehler && <p className="app__fehler">{fehler}</p>}

      {daten && (
        <>
          <div
            className="app__diagramm"
            style={{ '--glow-farbe': 'var(--gut)' } as CSSProperties}
          >
            <h2>
              CO₂e je Kategorie, {labelA} gegen {labelB}
            </h2>

            <div className="legende">
              <span>
                <span className="punkt" style={{ background: 'var(--akzent)' }} />
                {labelA}
              </span>
              <span>
                <span className="punkt" style={{ background: 'var(--gedaempft)' }} />
                {labelB}
              </span>
            </div>

            <div className="balken-reihe">
              {zeilen.map((z) => (
                <div className="balken-gruppe" key={z.name}>
                  <div className="balken-paar">
                    <div
                      className="balken balken--a"
                      style={{
                        height: `${((z.wertA ?? 0) / maxWert) * 180}px`,
                        background: 'var(--akzent)',
                      }}
                    >
                      {z.wertA !== null && (
                        <span className="balken-wert">
                          {z.wertA.toLocaleString('de-DE', { maximumFractionDigits: 1 })} {einheit}
                        </span>
                      )}
                    </div>
                    <div
                      className="balken balken--b"
                      style={{
                        height: `${((z.wertB ?? 0) / maxWert) * 180}px`,
                        background: 'var(--gedaempft)',
                      }}
                    >
                      {z.wertB !== null && (
                        <span className="balken-wert">
                          {z.wertB.toLocaleString('de-DE', { maximumFractionDigits: 1 })} {einheit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="balken-label">{z.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="app__diagramm"
            style={{ '--glow-farbe': 'var(--akzent)' } as CSSProperties}
          >
            <div className="app__diagramm-kopf">
              <h2>Im Detail</h2>
              <button
                type="button"
                className="export-knopf"
                onClick={() =>
                  csvHerunterladen(
                    `vergleich_${labelA}_${labelB}.csv`.replace(/\s+/g, '_'),
                    ['Kategorie', labelA, labelB, 'Veränderung (%)'],
                    zeilen.map((z) => [
                      z.name,
                      csvZahl(z.wertA),
                      csvZahl(z.wertB),
                      z.veraenderung !== null
                        ? csvZahl(z.veraenderung * 100)
                        : (z.hinweis ?? ''),
                    ])
                  )
                }
              >
                CSV exportieren
              </button>
            </div>
            <table className="letzte-tabelle">
              <thead>
                <tr>
                  <th>Kategorie</th>
                  <th>{labelA}</th>
                  <th>{labelB}</th>
                  <th>Veränderung</th>
                </tr>
              </thead>
              <tbody>
                {zeilen.map((z) => (
                  <tr key={z.name}>
                    <td>{z.name}</td>
                    <td>{z.wertA !== null ? `${z.wertA.toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${einheit}` : '–'}</td>
                    <td>{z.wertB !== null ? `${z.wertB.toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${einheit}` : '–'}</td>
                    <td>
                      {z.hinweis ? (
                        <span className="app__fehler">{z.hinweis}</span>
                      ) : z.veraenderung !== null ? (
                        `${z.veraenderung >= 0 ? '+' : ''}${(z.veraenderung * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`
                      ) : (
                        '–'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

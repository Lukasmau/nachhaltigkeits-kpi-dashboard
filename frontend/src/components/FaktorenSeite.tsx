import { useEffect, useState, type CSSProperties } from 'react'
import { holeFaktoren, type Faktor } from '../api'
import { InfoIcon } from './InfoIcon'

function formatiereFaktor(faktor: Faktor): { wert: string; co2Label: string } {
  const gramm = faktor.faktor_kg_co2e_pro_einheit * 1000
  return {
    wert: gramm.toLocaleString('de-DE', { maximumFractionDigits: 1 }),
    // Strom ist CO2, Verkehr ist CO2e (CLAUDE.md §5) - einzige Ausnahme in der Liste.
    co2Label: faktor.kategorie === 'Strom' ? 'CO₂' : 'CO₂e',
  }
}

export function FaktorenSeite() {
  const [faktoren, setFaktoren] = useState<Faktor[]>([])
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    holeFaktoren()
      .then(setFaktoren)
      .catch((e: Error) => setFehler(e.message))
  }, [])

  return (
    <div className="app">
      <h1>
        Faktoren
        <InfoIcon text="Alle Emissionsfaktoren, mit denen das Dashboard Messwerte in kg CO₂e umrechnet. Nur zur Ansicht – geändert wird im Code, siehe Hinweis unten." />
      </h1>

      {fehler && <p className="app__fehler">{fehler}</p>}

      <div className="app__diagramm" style={{ '--glow-farbe': 'var(--akzent)' } as CSSProperties}>
        <table className="letzte-tabelle faktoren-tabelle">
          <colgroup>
            <col style={{ width: '17%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '44%' }} />
            <col style={{ width: '24%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Kategorie</th>
              <th>Wert</th>
              <th>Quelle</th>
              <th>Stand</th>
            </tr>
          </thead>
          <tbody>
            {faktoren.map((faktor) => {
              const { wert, co2Label } = formatiereFaktor(faktor)
              return (
                <tr key={faktor.kategorie}>
                  <td>{faktor.kategorie}</td>
                  <td className="faktor-wert">
                    {wert} g {co2Label}/{faktor.einheit}
                    {co2Label === 'CO₂' && <span className="faktor-hinweis">CO₂, nicht CO₂e</span>}
                  </td>
                  <td className="quelle">
                    <span className="quelle-text">{faktor.quelle}</span>
                    <InfoIcon text={faktor.quelle} />
                  </td>
                  <td>{faktor.stand}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="faktoren-hinweise">
        <div className="app__diagramm" style={{ '--glow-farbe': 'var(--gut)' } as CSSProperties}>
          <h2>Faktoren aktualisieren</h2>
          <p className="app__hinweis-text">
            Die Werte stehen in <code>backend/seed/faktoren.py</code>, in der Liste{' '}
            <code>FAKTOREN</code>. Feld <code>faktor_kg_co2e_pro_einheit</code> ändern (kg CO₂e pro
            Einheit), dazu <code>quelle</code> und <code>stand</code> anpassen. Danach das Backend
            neu starten – die neuen Werte werden bei jedem Start automatisch übernommen.
          </p>
        </div>
        <div
          className="app__diagramm"
          style={{ '--glow-farbe': 'var(--abweichung)' } as CSSProperties}
        >
          <h2>Wichtig</h2>
          <p className="app__hinweis-text">
            Eine Änderung hier wirkt rückwirkend auf alle Berechnungen und Diagramme im
            Dashboard, nicht nur auf neue Messungen.
          </p>
          <p className="app__hinweis-text">
            Aktuell gibt es nur einen Faktor für Flug Inland. Eine Flug-Messung mit echter
            Langstrecke wird damit nicht korrekt abgebildet – eine bewusste Vereinfachung für
            diesen Prototyp.
          </p>
        </div>
      </div>
    </div>
  )
}

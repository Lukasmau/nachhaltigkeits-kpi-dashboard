type Props = {
  anteile: Record<string, number>
}

// Fasst alle "Dienstreisen ..."-Kategorien zu einer Sammelkategorie zusammen,
// nur fuer diese Hauptansicht - die Einzelwerte je Verkehrsmittel bleiben in
// den Rohdaten fuer eine spaetere Detail-Ansicht erhalten.
function gruppiereDienstreisen(anteile: Record<string, number>): Record<string, number> {
  const gruppiert: Record<string, number> = {}
  for (const [name, anteil] of Object.entries(anteile)) {
    const gruppenName = name.startsWith('Dienstreisen ') ? 'Dienstreisen' : name
    gruppiert[gruppenName] = (gruppiert[gruppenName] ?? 0) + anteil
  }
  return gruppiert
}

const FARBEN: Record<string, string> = {
  Strom: 'var(--akzent)',
  Erdgas: 'var(--gut)',
  Dienstreisen: 'var(--gedaempft)',
}

export function AnteilDiagramm({ anteile }: Props) {
  const daten = Object.entries(gruppiereDienstreisen(anteile))
    .map(([name, anteil]) => ({ name, prozent: Math.round(anteil * 1000) / 10 }))
    .sort((a, b) => b.prozent - a.prozent)

  return (
    <div className="anteil-liste">
      {daten.map((d) => (
        <div className="anteil-zeile" key={d.name}>
          <div className="anteil-zeile__kopf">
            <span>{d.name}</span>
            <span className="anteil-zeile__prozent">
              {d.prozent.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %
            </span>
          </div>
          <div className="anteil-zeile__spur">
            <div
              className="anteil-zeile__balken"
              style={{ width: `${d.prozent}%`, background: FARBEN[d.name] ?? 'var(--akzent)' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

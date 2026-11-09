type Props = {
  werte: (number | null)[]
  farbe?: string
}

const BREITE = 100
const HOEHE = 30

export function Sparkline({ werte, farbe = 'var(--akzent)' }: Props) {
  const vorhandene = werte.filter((w): w is number => w !== null)
  if (vorhandene.length < 2) {
    return null
  }

  const min = Math.min(...vorhandene)
  const max = Math.max(...vorhandene)
  const spanne = max - min || 1
  const schritt = BREITE / (werte.length - 1)

  const punkte: ([number, number] | null)[] = werte.map((w, i) =>
    w === null ? null : [i * schritt, HOEHE - ((w - min) / spanne) * HOEHE]
  )

  // In zusammenhaengende Segmente teilen, damit eine Luecke (null) keine
  // Linie quer durchzieht - gleiches Prinzip wie im Verlauf-Diagramm.
  const segmente: [number, number][][] = []
  let aktuelles: [number, number][] = []
  for (const punkt of punkte) {
    if (punkt === null) {
      if (aktuelles.length) segmente.push(aktuelles)
      aktuelles = []
    } else {
      aktuelles.push(punkt)
    }
  }
  if (aktuelles.length) segmente.push(aktuelles)

  return (
    <svg className="sparkline" viewBox={`0 0 ${BREITE} ${HOEHE}`} preserveAspectRatio="none">
      {segmente.map((segment, i) => (
        <polyline
          key={i}
          points={segment.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke={farbe}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

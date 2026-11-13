import { useId } from 'react'

type Props = {
  werte: (number | null)[]
  farbe?: string
}

const BREITE = 100
const HOEHE = 34

// Gerade Segmente zwischen den Punkten, wie beim ECharts-Liniendiagramm im
// Verlauf (dort auch keine Glaettung) - gleicher Linien-Charakter in beiden.
function geradeLinie(punkte: [number, number][]): string {
  return punkte.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
}

// Haengt an den Linienpfad eines Segments noch das Stueck bis runter zur
// Grundlinie und zurueck an - geschlossene Flaeche fuers Fuellen (wie die
// Flaeche im Verlauf-Diagramm).
function flaechenPfad(segment: [number, number][]): string {
  const [ersterX] = segment[0]
  const [letzterX] = segment[segment.length - 1]
  return `${geradeLinie(segment)} L ${letzterX} ${HOEHE} L ${ersterX} ${HOEHE} Z`
}

export function Sparkline({ werte, farbe = 'var(--akzent)' }: Props) {
  const gradientId = useId()
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
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: farbe, stopOpacity: 0.35 }} />
          <stop offset="1" style={{ stopColor: farbe, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {segmente.map((segment, i) =>
        // Ein Segment mit nur einem Punkt (Luecke davor und danach) ergibt
        // bei M-ohne-L keine sichtbare Linie - als Punkt zeichnen statt dass
        // der Monat einfach verschwindet.
        segment.length === 1 ? (
          <circle key={i} cx={segment[0][0]} cy={segment[0][1]} r={2.2} fill={farbe} />
        ) : (
          <g key={i}>
            <path d={flaechenPfad(segment)} fill={`url(#${gradientId})`} stroke="none" />
            <path
              d={geradeLinie(segment)}
              fill="none"
              stroke={farbe}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      )}
    </svg>
  )
}

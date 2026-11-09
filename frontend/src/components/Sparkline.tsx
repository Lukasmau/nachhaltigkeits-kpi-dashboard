type Props = {
  werte: (number | null)[]
  farbe?: string
}

const BREITE = 100
const HOEHE = 30

// Glatter Pfad statt eckiger Linie: jedes Segment faehrt als quadratische
// Bezier-Kurve zum Mittelpunkt zum naechsten Punkt, die Datenpunkte selbst
// dienen als Kurven-Steuerpunkte. Gaengige Technik fuer kleine Sparklines,
// braucht keine extra Bibliothek.
function glatterPfad(punkte: [number, number][]): string {
  if (punkte.length === 1) {
    const [x, y] = punkte[0]
    return `M ${x} ${y}`
  }

  let pfad = `M ${punkte[0][0]} ${punkte[0][1]}`
  for (let i = 1; i < punkte.length - 1; i++) {
    const [x, y] = punkte[i]
    const [naechstesX, naechstesY] = punkte[i + 1]
    const mitteX = (x + naechstesX) / 2
    const mitteY = (y + naechstesY) / 2
    pfad += ` Q ${x} ${y} ${mitteX} ${mitteY}`
  }
  const vorletzter = punkte[punkte.length - 2]
  const letzter = punkte[punkte.length - 1]
  pfad += ` Q ${vorletzter[0]} ${vorletzter[1]} ${letzter[0]} ${letzter[1]}`
  return pfad
}

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
        <path
          key={i}
          d={glatterPfad(segment)}
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

type Props = {
  prozent: number
}

const RADIUS = 46
const UMFANG = 2 * Math.PI * RADIUS

export function ZielRing({ prozent }: Props) {
  const basis = Math.min(Math.max(prozent, 0), 100)
  const basisOffset = UMFANG - (basis / 100) * UMFANG

  // Ueber 100 % (Budget ueberschritten): eine zweite, rote Runde ueber dem
  // jetzt vollen blauen Ring zeigt, wie weit drueber - gedeckelt auf eine
  // volle Zusatzrunde (100 Prozentpunkte), die genaue Zahl steht daneben.
  const ueberschuss = prozent > 100 ? Math.min(prozent - 100, 100) : 0
  const ueberschussOffset = UMFANG - (ueberschuss / 100) * UMFANG

  return (
    <svg width="108" height="108" viewBox="0 0 108 108">
      <circle cx="54" cy="54" r={RADIUS} fill="none" stroke="#CFE0EA" strokeWidth="12" />
      <circle
        cx="54"
        cy="54"
        r={RADIUS}
        fill="none"
        stroke="#0369A1"
        strokeWidth="12"
        strokeDasharray={UMFANG}
        strokeDashoffset={basisOffset}
        strokeLinecap="round"
        transform="rotate(-90 54 54)"
      />
      {ueberschuss > 0 && (
        <circle
          cx="54"
          cy="54"
          r={RADIUS}
          fill="none"
          stroke="#BE123C"
          strokeWidth="12"
          strokeDasharray={UMFANG}
          strokeDashoffset={ueberschussOffset}
          strokeLinecap="round"
          transform="rotate(-90 54 54)"
        />
      )}
    </svg>
  )
}

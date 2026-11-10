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
      <defs>
        {/* Eigener Filter mit grosszuegiger Region statt CSS drop-shadow -
            drop-shadow schneidet sich sonst an der engen Standard-Filterbox
            des duennen Rings ab und wirkt eckig statt weich. */}
        <filter id="ring-glow-blau" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ring-glow-rot" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
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
        filter="url(#ring-glow-blau)"
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
          filter="url(#ring-glow-rot)"
        />
      )}
    </svg>
  )
}

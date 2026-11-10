type Props = {
  prozent: number
}

const RADIUS = 46
const UMFANG = 2 * Math.PI * RADIUS

export function ZielRing({ prozent }: Props) {
  const gefuellt = Math.min(Math.max(prozent, 0), 100)
  const offset = UMFANG - (gefuellt / 100) * UMFANG

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
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 54 54)"
      />
    </svg>
  )
}

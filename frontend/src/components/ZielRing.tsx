type Props = {
  prozent: number
}

const RADIUS = 36
const UMFANG = 2 * Math.PI * RADIUS

export function ZielRing({ prozent }: Props) {
  const gefuellt = Math.min(Math.max(prozent, 0), 100)
  const offset = UMFANG - (gefuellt / 100) * UMFANG

  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={RADIUS} fill="none" stroke="#CFE0EA" strokeWidth="8" />
      <circle
        cx="45"
        cy="45"
        r={RADIUS}
        fill="none"
        stroke="#0369A1"
        strokeWidth="8"
        strokeDasharray={UMFANG}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
      />
    </svg>
  )
}

import type { CSSProperties } from 'react'
import { Sparkline } from './Sparkline'

type Props = {
  titel: string
  wert: number | null
  einheit: string
  hinweis: string
  farbe?: 'neutral' | 'gut' | 'schlecht'
  mitVorzeichen?: boolean
  sparklineWerte?: (number | null)[]
}

// Die Kartenfarbe bestimmt auch die Glow-Farbe (CLAUDE.md §8: Glow in der
// Diagrammfarbe) - keine zweite, unabhaengige Farbwahl noetig.
const GLOW_FARBEN: Record<string, string> = {
  neutral: 'var(--akzent)',
  gut: 'var(--gut)',
  schlecht: 'var(--abweichung)',
}

export function KpiKarte({
  titel,
  wert,
  einheit,
  hinweis,
  farbe = 'neutral',
  mitVorzeichen = false,
  sparklineWerte,
}: Props) {
  const style = { '--glow-farbe': GLOW_FARBEN[farbe] } as CSSProperties

  return (
    <div className="kpi-karte" style={style}>
      <div className="kpi-karte__titel">{titel}</div>
      {wert === null ? (
        <div className="kpi-karte__hinweis">{hinweis}</div>
      ) : (
        <>
          <div className={`kpi-karte__wert kpi-karte__wert--${farbe}`}>
            {wert.toLocaleString('de-DE', {
              maximumFractionDigits: 1,
              signDisplay: mitVorzeichen ? 'exceptZero' : 'auto',
            })}
            <span className="kpi-karte__einheit">{einheit}</span>
          </div>
          {sparklineWerte && <Sparkline werte={sparklineWerte} farbe={GLOW_FARBEN[farbe]} />}
        </>
      )}
    </div>
  )
}

type Props = {
  titel: string
  wert: number | null
  einheit: string
  hinweis: string
  farbe?: 'neutral' | 'gut' | 'schlecht'
}

export function KpiKarte({ titel, wert, einheit, hinweis, farbe = 'neutral' }: Props) {
  return (
    <div className="kpi-karte">
      <div className="kpi-karte__titel">{titel}</div>
      {wert === null ? (
        <div className="kpi-karte__hinweis">{hinweis}</div>
      ) : (
        <div className={`kpi-karte__wert kpi-karte__wert--${farbe}`}>
          {wert.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
          <span className="kpi-karte__einheit">{einheit}</span>
        </div>
      )}
    </div>
  )
}

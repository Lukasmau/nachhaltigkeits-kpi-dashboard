type Props = {
  titel: string
  wert: number | null
  einheit: string
  hinweis: string
}

export function KpiKarte({ titel, wert, einheit, hinweis }: Props) {
  return (
    <div className="kpi-karte">
      <div className="kpi-karte__titel">{titel}</div>
      {wert === null ? (
        <div className="kpi-karte__hinweis">{hinweis}</div>
      ) : (
        <div className="kpi-karte__wert">
          {wert.toLocaleString('de-DE', { maximumFractionDigits: 1 })} {einheit}
        </div>
      )}
    </div>
  )
}

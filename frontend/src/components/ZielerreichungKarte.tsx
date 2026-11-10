import { ErklaerIcon } from './ErklaerIcon'
import { ZielRing } from './ZielRing'

type Props = {
  titel: string
  prozent: number | null
  hinweis: string
}

export function ZielerreichungKarte({ titel, prozent, hinweis }: Props) {
  return (
    <div className="ziel-karte">
      <div className="ziel-karte__titel">
        {titel}
        <ErklaerIcon schluessel="zielerreichung" />
      </div>
      {prozent === null ? (
        <div className="ziel-karte__hinweis">{hinweis}</div>
      ) : (
        <div className="ziel-karte__inhalt">
          <ZielRing prozent={prozent} />
          <div className="ziel-karte__wert">
            {prozent.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
            <span className="ziel-karte__einheit">%</span>
          </div>
        </div>
      )}
    </div>
  )
}

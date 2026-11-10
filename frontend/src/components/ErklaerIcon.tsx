import texte from '../explain/texte.json'

export type ErklaerSchluessel = keyof typeof texte

export function ErklaerIcon({ schluessel }: { schluessel: ErklaerSchluessel }) {
  const eintrag = texte[schluessel]

  return (
    <span className="erklaer-icon" tabIndex={0}>
      ?
      <span className="erklaer-icon__tooltip">
        <p>{eintrag.text}</p>
        <p className="erklaer-icon__formel">{eintrag.formel}</p>
        <p className="erklaer-icon__beispiel">{eintrag.beispiel}</p>
        <p className="erklaer-icon__quelle">{eintrag.quelle}</p>
      </span>
    </span>
  )
}

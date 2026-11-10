export type Seite = 'uebersicht' | 'csv-import' | 'fahrt-erfassen' | 'jahresziel'

const EINTRAEGE: { seite: Seite; label: string }[] = [
  { seite: 'uebersicht', label: 'Übersicht' },
  { seite: 'csv-import', label: 'CSV importieren' },
  { seite: 'fahrt-erfassen', label: 'Fahrt erfassen' },
  { seite: 'jahresziel', label: 'Jahresziel' },
]

type Props = {
  aktuelleSeite: Seite
  aufSeiteWechseln: (seite: Seite) => void
}

export function Sidebar({ aktuelleSeite, aufSeiteWechseln }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <span className="sidebar__logo-punkt" />
        CO₂-Bilanz
      </div>
      <nav className="sidebar__nav">
        {EINTRAEGE.map(({ seite, label }) => (
          <button
            key={seite}
            type="button"
            className={
              seite === aktuelleSeite
                ? 'sidebar__eintrag sidebar__eintrag--aktiv'
                : 'sidebar__eintrag'
            }
            onClick={() => aufSeiteWechseln(seite)}
          >
            {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

// Gleiches Hover-Tooltip wie ErklaerIcon (CLAUDE.md §8), aber mit freiem
// Text statt eines texte.json-Schluessels - fuer Inhalte aus der Datenbank
// (z. B. eine lange Quelle-Angabe), die nicht in texte.json gehoeren.
export function InfoIcon({ text }: { text: string }) {
  return (
    <span className="erklaer-icon" tabIndex={0}>
      ?
      <span className="erklaer-icon__tooltip">
        <p>{text}</p>
      </span>
    </span>
  )
}

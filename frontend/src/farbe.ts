// Wandelt einen Hex-Farbtoken in rgba um, damit eine Deckkraft-Variante
// (z. B. fuer Flaechen-Verlaeufe) nicht als zweiter, hart codierter Farbwert
// irgendwo im Code steht - die Farbe kommt immer allein aus tokens.ts.
export function hexZuRgba(hex: string, deckkraft: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${deckkraft})`
}

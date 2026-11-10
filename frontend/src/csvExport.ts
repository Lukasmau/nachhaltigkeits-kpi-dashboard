// Zahl im deutschen Format (Komma statt Punkt) fuer eine CSV-Zelle - ein Punkt
// wie bei "1.2" wird von deutschem Excel sonst als Datum (1. Februar) gelesen.
export function csvZahl(wert: number | null, nachkommastellen = 1): string {
  if (wert === null) return ''
  return wert.toLocaleString('de-DE', {
    minimumFractionDigits: nachkommastellen,
    maximumFractionDigits: nachkommastellen,
  })
}

function starteDownload(dateiname: string, inhalt: string, mitBom: boolean) {
  const blob = new Blob([mitBom ? '﻿' + inhalt : inhalt], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = dateiname
  link.click()
  URL.revokeObjectURL(url)
}

// Baut eine CSV-Datei (Semikolon-getrennt, mit BOM) und startet den Download -
// Semikolon statt Komma, weil Excel mit deutscher Spracheinstellung sonst
// jede Zeile in eine Spalte quetscht (Komma ist dort das Dezimaltrennzeichen).
// Fuer Lese-/Report-Exports (Verlauf, Vergleichen) - NICHT re-importierbar,
// siehe importCsvHerunterladen fuer die Rohdaten-Sicherung.
export function csvHerunterladen(dateiname: string, header: string[], zeilen: (string | number)[][]) {
  const inhalt = [header, ...zeilen]
    .map((zeile) => zeile.map((feld) => `"${String(feld).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')
  starteDownload(dateiname, inhalt, true)
}

// Baut eine CSV-Datei exakt im Format, das der eigene CSV-Import erwartet
// (Komma statt Semikolon, Punkt statt Komma bei Zahlen, kein BOM) - anders als
// csvHerunterladen re-importierbar, fuer die Rohdaten-Sicherung gedacht.
export function importCsvHerunterladen(dateiname: string, header: string[], zeilen: (string | number)[][]) {
  const inhalt = [header, ...zeilen].map((zeile) => zeile.join(',')).join('\n')
  starteDownload(dateiname, inhalt, false)
}

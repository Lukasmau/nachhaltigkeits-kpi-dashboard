// Zahl im deutschen Format (Komma statt Punkt) fuer eine CSV-Zelle - ein Punkt
// wie bei "1.2" wird von deutschem Excel sonst als Datum (1. Februar) gelesen.
export function csvZahl(wert: number | null, nachkommastellen = 1): string {
  if (wert === null) return ''
  return wert.toLocaleString('de-DE', {
    minimumFractionDigits: nachkommastellen,
    maximumFractionDigits: nachkommastellen,
  })
}

// Baut eine CSV-Datei (Semikolon-getrennt, mit BOM) und startet den Download -
// Semikolon statt Komma, weil Excel mit deutscher Spracheinstellung sonst
// jede Zeile in eine Spalte quetscht (Komma ist dort das Dezimaltrennzeichen).
export function csvHerunterladen(dateiname: string, header: string[], zeilen: (string | number)[][]) {
  const inhalt = [header, ...zeilen]
    .map((zeile) => zeile.map((feld) => `"${String(feld).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')

  const blob = new Blob(['﻿' + inhalt], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = dateiname
  link.click()
  URL.revokeObjectURL(url)
}

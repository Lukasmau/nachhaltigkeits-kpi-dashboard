export type KpiAntwort = {
  co2e_im_monat: { wert: number | null; einheit: string; warnungen: string[] }
  anteil_je_kategorie: { anteile: Record<string, number> | null; warnungen: string[] }
  veraenderung_zum_vormonat: number | null
  zielerreichung: number | null
}

export async function holeKpis(jahr: number, monat: number): Promise<KpiAntwort> {
  const antwort = await fetch(`/api/kpis?jahr=${jahr}&monat=${monat}`)
  if (!antwort.ok) {
    throw new Error(`API-Fehler: ${antwort.status}`)
  }
  return antwort.json()
}

export type VerlaufEintrag = {
  monat: number
  wert: number | null
  veraenderung: number | null
  zielerreichung: number | null
  anteil_groesste_kategorie: number | null
  warnungen: string[]
}
export type VerlaufAntwort = {
  einheit: string
  groesste_kategorie: string | null
  monatsziel: number | null
  monate: VerlaufEintrag[]
}

export async function holeVerlauf(jahr: number): Promise<VerlaufAntwort> {
  const antwort = await fetch(`/api/verlauf?jahr=${jahr}`)
  if (!antwort.ok) {
    throw new Error(`API-Fehler: ${antwort.status}`)
  }
  return antwort.json()
}

export type ImportFehler = { zeile: number; spalte: string; grund: string; tipp: string }
export type ImportWarnung = { zeile: number; grund: string }
export type ImportErgebnis = {
  importiert: number
  fehler: ImportFehler[]
  warnungen: ImportWarnung[]
}

export async function importiereCsv(datei: File): Promise<ImportErgebnis> {
  const formular = new FormData()
  formular.append('datei', datei)
  const antwort = await fetch('/api/import', { method: 'POST', body: formular })
  if (!antwort.ok) {
    throw new Error(`API-Fehler: ${antwort.status}`)
  }
  return antwort.json()
}

export type LetzteMessung = {
  datum: string
  datenart: string
  kategorie: string
  wert: number
  einheit: string
  person: string | null
  quelle_datei: string | null
}

export async function holeLetzteMessungen(
  limit: number,
  datenart?: string
): Promise<LetzteMessung[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (datenart) params.set('datenart', datenart)
  const antwort = await fetch(`/api/messungen/letzte?${params}`)
  if (!antwort.ok) {
    throw new Error(`API-Fehler: ${antwort.status}`)
  }
  return antwort.json()
}

export type FahrtFehler = { spalte: string; grund: string; tipp: string }
export type FahrtEingabe = { datum: string; kategorie: string; wert: number; person?: string }
export type FahrtErgebnis = { gespeichert: true; warnung: string | null }

export class FahrtFehlerAntwort extends Error {
  fehler: FahrtFehler[]
  constructor(fehler: FahrtFehler[]) {
    super('Fahrt ungültig')
    this.fehler = fehler
  }
}

export async function speichereFahrt(eingabe: FahrtEingabe): Promise<FahrtErgebnis> {
  const antwort = await fetch('/api/fahrt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eingabe),
  })
  if (antwort.status === 422) {
    const body = await antwort.json()
    throw new FahrtFehlerAntwort(body.detail)
  }
  if (!antwort.ok) {
    throw new Error(`API-Fehler: ${antwort.status}`)
  }
  return antwort.json()
}

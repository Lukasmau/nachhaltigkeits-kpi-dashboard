export type KpiAntwort = {
  co2e_im_monat: { wert_kg: number | null; warnungen: string[] }
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

export type VerlaufEintrag = { monat: number; wert_kg: number | null; warnungen: string[] }

export async function holeVerlauf(jahr: number): Promise<VerlaufEintrag[]> {
  const antwort = await fetch(`/api/verlauf?jahr=${jahr}`)
  if (!antwort.ok) {
    throw new Error(`API-Fehler: ${antwort.status}`)
  }
  return antwort.json()
}

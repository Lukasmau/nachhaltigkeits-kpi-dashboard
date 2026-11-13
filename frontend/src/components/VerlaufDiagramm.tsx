import ReactECharts from 'echarts-for-react'
import type { VerlaufEintrag } from '../api'
import { hexZuRgba } from '../farbe'
import { monatsKurz } from '../monate'
import { dunkel } from '../tokens'

type Props = {
  verlauf: VerlaufEintrag[]
  einheit: string
  monatsziel: number | null
}

// Schneidet nur leere Monate am ENDE ab (Zukunft, noch nicht passiert).
// Eine Luecke mittendrin (Monat ist vorbei, aber keine Daten eingetragen)
// bleibt stehen - das ist ein echter Hinweis, kein Darstellungsfehler.
function ohneZukunft(verlauf: VerlaufEintrag[]): VerlaufEintrag[] {
  let ende = verlauf.length
  while (ende > 0 && verlauf[ende - 1].wert === null) {
    ende -= 1
  }
  return verlauf.slice(0, ende)
}

function formatiereWert(wert: number): string {
  return wert.toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

export function VerlaufDiagramm({ verlauf: rohVerlauf, einheit, monatsziel }: Props) {
  const verlauf = ohneZukunft(rohVerlauf)

  if (verlauf.length === 0) {
    return <p className="app__hinweis-text">Noch keine Daten</p>
  }

  const letzterIndex = verlauf.length - 1
  const letzterWert = letzterIndex >= 0 ? verlauf[letzterIndex].wert : null

  const series: Record<string, unknown>[] = [
    {
      name: 'Gesamt',
      type: 'line',
      data: verlauf.map((v) => v.wert),
      connectNulls: false,
      symbol: 'none',
      lineStyle: { color: dunkel.akzent, width: 3 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: hexZuRgba(dunkel.akzent, 0.35) },
            { offset: 1, color: hexZuRgba(dunkel.akzent, 0) },
          ],
        },
      },
    },
  ]

  if (monatsziel !== null) {
    series.push({
      name: `Ziel ${formatiereWert(monatsziel)} ${einheit}`,
      type: 'line',
      data: verlauf.map(() => monatsziel),
      lineStyle: { color: dunkel.gut, width: 2, type: 'dashed' },
      symbol: 'none',
    })
  }

  // Nur der aktuellste Monat bekommt einen Punkt (mit Halo-Rand in der
  // Kartenfarbe) statt einem Punkt auf jedem Monat - ruhigere Linie.
  if (letzterWert !== null) {
    series.push({
      name: 'Aktueller Monat',
      type: 'scatter',
      data: [[letzterIndex, letzterWert]],
      symbolSize: 11,
      itemStyle: {
        color: dunkel.akzent,
        borderColor: dunkel.karte,
        borderWidth: 3,
      },
      tooltip: { show: false },
      silent: true,
    })
  }

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 70, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: verlauf.map((v) => monatsKurz[v.monat - 1]),
      axisLabel: { color: dunkel.gedaempft },
      axisLine: { lineStyle: { color: dunkel.linie } },
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: {
        color: dunkel.gedaempft,
        formatter: (wert: number) => `${formatiereWert(wert)} ${einheit}`,
      },
      splitLine: { lineStyle: { color: dunkel.linie } },
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (wert: number) => `${formatiereWert(wert as number)} ${einheit}`,
    },
    series,
  }

  return (
    <>
      <div className="verlauf-legende">
        <span className="verlauf-legende__eintrag">
          <i className="verlauf-legende__strich" style={{ background: dunkel.akzent }} />
          Gesamt
        </span>
        {monatsziel !== null && (
          <span className="verlauf-legende__eintrag">
            <i className="verlauf-legende__strich" style={{ background: dunkel.gut }} />
            Ziel {formatiereWert(monatsziel)} {einheit}
          </span>
        )}
      </div>
      {/* notMerge: ECharts behaelt sonst Serien aus der vorherigen Option
          (z. B. die Ziel-Linie eines Jahres mit Jahresziel), auch wenn die
          neue Option sie gar nicht mehr enthaelt - vollstaendig ersetzen
          statt zusammenfuehren. */}
      <ReactECharts option={option} notMerge style={{ height: 260 }} />
    </>
  )
}

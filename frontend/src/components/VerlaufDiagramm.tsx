import ReactECharts from 'echarts-for-react'
import type { VerlaufEintrag } from '../api'
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

  const series: Record<string, unknown>[] = [
    {
      name: 'Gesamt',
      type: 'line',
      data: verlauf.map((v) => v.wert),
      connectNulls: false,
      lineStyle: { color: dunkel.akzent, width: 2 },
      itemStyle: { color: dunkel.akzent },
      areaStyle: { color: dunkel.akzent, opacity: 0.1 },
      symbolSize: 8,
    },
  ]

  if (monatsziel !== null) {
    series.push({
      name: `Ziel ${formatiereWert(monatsziel)} ${einheit}`,
      type: 'line',
      data: verlauf.map(() => monatsziel),
      lineStyle: { color: dunkel.gut, width: 2, type: 'dashed' },
      itemStyle: { color: dunkel.gut },
      symbol: 'none',
    })
  }

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 70, right: 20, top: monatsziel !== null ? 50 : 20, bottom: 30 },
    legend: {
      show: monatsziel !== null,
      top: 0,
      left: 0,
      textStyle: { color: dunkel.text },
      itemWidth: 16,
      itemHeight: 3,
    },
    xAxis: {
      type: 'category',
      data: verlauf.map((v) => monatsKurz[v.monat - 1]),
      axisLabel: { color: dunkel.gedaempft },
      axisLine: { lineStyle: { color: dunkel.linie } },
    },
    yAxis: {
      type: 'value',
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

  return <ReactECharts option={option} style={{ height: 260 }} />
}

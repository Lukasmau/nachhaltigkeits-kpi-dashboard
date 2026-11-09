import ReactECharts from 'echarts-for-react'
import type { VerlaufEintrag } from '../api'
import { dunkel } from '../tokens'

type Props = {
  verlauf: VerlaufEintrag[]
  einheit: string
}

const monatsNamen = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
]

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

export function VerlaufDiagramm({ verlauf: rohVerlauf, einheit }: Props) {
  const verlauf = ohneZukunft(rohVerlauf)
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 70, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: verlauf.map((v) => monatsNamen[v.monat - 1]),
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
      valueFormatter: (wert: number) => `${formatiereWert(wert)} ${einheit}`,
    },
    series: [
      {
        type: 'line',
        data: verlauf.map((v) => v.wert),
        connectNulls: false,
        lineStyle: { color: dunkel.akzent, width: 2 },
        itemStyle: { color: dunkel.akzent },
        areaStyle: { color: dunkel.akzent, opacity: 0.1 },
        symbolSize: 8,
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: 260 }} />
}

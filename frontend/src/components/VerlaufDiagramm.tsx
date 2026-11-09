import ReactECharts from 'echarts-for-react'
import type { VerlaufEintrag } from '../api'
import { dunkel } from '../tokens'

type Props = {
  verlauf: VerlaufEintrag[]
}

const monatsNamen = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
]

export function VerlaufDiagramm({ verlauf }: Props) {
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
      axisLabel: { color: dunkel.gedaempft, formatter: '{value} kg' },
      splitLine: { lineStyle: { color: dunkel.linie } },
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (wert: number) => `${wert} kg`,
    },
    series: [
      {
        type: 'line',
        data: verlauf.map((v) => v.wert_kg),
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

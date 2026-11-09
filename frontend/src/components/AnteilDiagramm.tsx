import ReactECharts from 'echarts-for-react'
import { dunkel } from '../tokens'

type Props = {
  anteile: Record<string, number>
}

export function AnteilDiagramm({ anteile }: Props) {
  // aufsteigend sortiert: die Kategorie-Achse zeichnet von unten nach oben,
  // so landet der groesste Wert oben
  const daten = Object.entries(anteile)
    .map(([name, anteil]) => ({ name, wert: Math.round(anteil * 1000) / 10 }))
    .sort((a, b) => a.wert - b.wert)

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 140, right: 50, top: 10, bottom: 10 },
    xAxis: {
      type: 'value',
      axisLabel: { color: dunkel.gedaempft, formatter: '{value}%' },
      splitLine: { lineStyle: { color: dunkel.linie } },
    },
    yAxis: {
      type: 'category',
      data: daten.map((d) => d.name),
      axisLabel: { color: dunkel.text },
      axisLine: { lineStyle: { color: dunkel.linie } },
    },
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    series: [
      {
        type: 'bar',
        data: daten.map((d) => d.wert),
        itemStyle: { color: dunkel.akzent, borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 24,
        label: { show: true, position: 'right', color: dunkel.text, formatter: '{c}%' },
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: Math.max(daten.length * 40, 160) }} />
}

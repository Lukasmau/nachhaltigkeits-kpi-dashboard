import ReactECharts from 'echarts-for-react'
import { dunkel } from '../tokens'

const farben = [dunkel.akzent, dunkel.gut, dunkel.abweichung, dunkel.gedaempft]

type Props = {
  anteile: Record<string, number>
}

export function AnteilDiagramm({ anteile }: Props) {
  const daten = Object.entries(anteile).map(([name, anteil]) => ({
    name,
    value: Math.round(anteil * 1000) / 10,
  }))

  const option = {
    backgroundColor: 'transparent',
    color: farben,
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    legend: {
      bottom: 0,
      textStyle: { color: dunkel.gedaempft },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        data: daten,
        label: { color: dunkel.text },
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: 260 }} />
}

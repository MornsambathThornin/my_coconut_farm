'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type DataPoint = {
  zone: string
  quantity: number
}

type Props = {
  data: DataPoint[]
}

export default function ZoneComparisonChart({ data }: Props) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="zone" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="quantity" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

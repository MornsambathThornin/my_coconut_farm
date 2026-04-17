'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export type ForecastPoint = {
  month: string
  expectedYield: number
  confidence: number
}

type Props = {
  data: ForecastPoint[]
}

export default function ForecastChart({ data }: Props) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <YAxis
            yAxisId="confidence"
            orientation="right"
            domain={[0, 1]}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
          />
          <Tooltip
            formatter={(value: number | string | undefined, name: string = '') => {
              const normalized = name.toLowerCase()
              const numeric = Number(value ?? 0)
              if (normalized.includes('confidence'))
                return [`${(numeric * 100).toFixed(0)}%`, 'Confidence']
              return [`${numeric.toFixed(1)}`, 'Yield (kg/ha)']
            }}
          />
          <Line
            type="monotone"
            dataKey="expectedYield"
            name="Expected yield (kg/ha)"
            stroke="#0f766e"
            strokeWidth={3}
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="confidence"
            name="Confidence"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            yAxisId="confidence"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

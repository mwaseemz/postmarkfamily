import React from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

interface ChartDataPoint {
  date: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  spam: number
  unsubscribed: number
}

interface StatsChartProps {
  data: ChartDataPoint[]
  type?: 'line' | 'bar'
  height?: number
  showMetrics?: string[]
  className?: string
}

const defaultMetrics = ['sent', 'delivered', 'opened', 'clicked']
const metricColors = {
  sent: '#8884d8',
  delivered: '#82ca9d',
  opened: '#ffc658',
  clicked: '#ff7c7c',
  bounced: '#ff6b6b',
  spam: '#ee5a52',
  unsubscribed: '#a5a5a5'
}

const metricLabels = {
  sent: 'Sent',
  delivered: 'Delivered',
  opened: 'Opened',
  clicked: 'Clicked',
  bounced: 'Bounced',
  spam: 'Spam',
  unsubscribed: 'Unsubscribed'
}

export default function StatsChart({ 
  data, 
  type = 'line', 
  height = 400,
  showMetrics = defaultMetrics,
  className = ''
}: StatsChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatTooltipValue = (value: number, name: string) => {
    return [value.toLocaleString(), metricLabels[name as keyof typeof metricLabels] || name]
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {formatDate(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-900 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    )
  }

  const ChartComponent = type === 'bar' ? BarChart : LineChart

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            className="text-gray-600 dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          
          {showMetrics.map((metric) => {
            const color = metricColors[metric as keyof typeof metricColors]
            const label = metricLabels[metric as keyof typeof metricLabels]
            
            if (type === 'bar') {
              return (
                <Bar 
                  key={metric}
                  dataKey={metric} 
                  fill={color}
                  name={label}
                  radius={[2, 2, 0, 0]}
                />
              )
            } else {
              return (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={label}
                />
              )
            }
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  )
} 
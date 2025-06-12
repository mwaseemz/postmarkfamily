import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface LineChartProps {
  data: Array<{
    [key: string]: any
  }>
  xAxis: string
  yAxis: string
  format?: 'number' | 'currency' | 'percentage'
}

export default function LineChart({ data, xAxis, yAxis, format = 'number' }: LineChartProps) {
  const chartData = {
    labels: data.map(item => item[xAxis]),
    datasets: [
      {
        label: yAxis.charAt(0).toUpperCase() + yAxis.slice(1),
        data: data.map(item => item[yAxis]),
        borderColor: 'rgb(99, 102, 241)', // Indigo-600
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y
            switch (format) {
              case 'currency':
                return `$${value.toLocaleString()}`
              case 'percentage':
                return `${value}%`
              default:
                return value.toLocaleString()
            }
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            switch (format) {
              case 'currency':
                return `$${Number(value).toLocaleString()}`
              case 'percentage':
                return `${value}%`
              default:
                return Number(value).toLocaleString()
            }
          }
        }
      }
    }
  }

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  )
} 
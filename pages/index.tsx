import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { toast, Toaster } from 'react-hot-toast'
import { 
  Mail, 
  CheckCircle, 
  Eye, 
  MousePointer, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Calendar,
  Moon,
  Sun,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Wallet
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import KpiCard from '@/components/KpiCard'
import StatsChart from '@/components/StatsChart'
import StatsTable from '@/components/StatsTable'
import { StatsResponse } from '@/pages/api/stats'
import LineChart from '@/components/LineChart'

const TIME_RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 }
]

interface ThriveCartData {
  summary: {
    totalSales: number
    totalOrders: number
    averageOrderValue: number
    refunds: number
    netRevenue: number
    conversionRate: number
  }
  daily: Array<{
    date: string
    sales: number
    orders: number
    refunds: number
    netRevenue: number
  }>
  timeRange: string
}

export default function Dashboard() {
  const [data, setData] = useState<StatsResponse['data'] | null>(null)
  const [thriveCartData, setThriveCartData] = useState<ThriveCartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedRange, setSelectedRange] = useState(30) // Default to 30 days
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  })

  // Dark mode toggle
  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
  }

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode === 'true') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Fetch data
  const fetchData = async (refresh = false) => {
    try {
      let params: URLSearchParams
      
      // Use days parameter for preset ranges, or from/to for custom dates
      if (selectedRange > 0) {
        params = new URLSearchParams({
          days: selectedRange.toString(),
          ...(refresh && { refresh: 'true' })
        })
      } else {
        params = new URLSearchParams({
          from: dateRange.from,
          to: dateRange.to,
          ...(refresh && { refresh: 'true' })
        })
      }

      console.log('Fetching with params:', params.toString())
      const response = await fetch(`/api/stats?${params}`)
      const result: StatsResponse = await response.json()

      console.log('API response:', result)

      if (result.success && result.data) {
        setData(result.data)
        toast.success('Data refreshed successfully')
      } else {
        // Check if it's a rate limiting error based on error message
        if (result.error?.includes('Rate limit') || result.error?.includes('429')) {
          toast.error(`Rate limited: ${result.error}`, {
            duration: 5000,
            icon: '⏱️'
          })
        } else {
          toast.error(`Failed to fetch data: ${result.error}`)
        }
      }
    } catch (error) {
      toast.error('Failed to fetch analytics data')
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch ThriveCart data
  const fetchThriveCartData = async (refresh = false) => {
    try {
      const params = new URLSearchParams()
      if (selectedRange > 0) {
        params.append('days', selectedRange.toString())
      } else {
        params.append('from', dateRange.from)
        params.append('to', dateRange.to)
      }

      const response = await fetch(`/api/thrivecart?${params.toString()}`)
      const result = await response.json()

      if (result.success && result.data) {
        setThriveCartData(result.data)
        if (refresh) {
          toast.success('ThriveCart data refreshed successfully')
        }
      } else {
        toast.error(`Failed to fetch ThriveCart data: ${result.error}`)
      }
    } catch (error) {
      toast.error('Failed to fetch ThriveCart data')
      console.error('ThriveCart fetch error:', error)
    }
  }

  // Force refresh all data
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchData(true), fetchThriveCartData(true)])
    setRefreshing(false)
  }

  // Handle preset time range change
  const handleTimeRangeChange = (days: number) => {
    setSelectedRange(days)
    setLoading(true)
    // Update date range for display
    const toDate = new Date()
    const fromDate = subDays(toDate, days)
    setDateRange({
      from: format(fromDate, 'yyyy-MM-dd'),
      to: format(toDate, 'yyyy-MM-dd')
    })
  }

  // Handle custom date range change
  const handleDateRangeChange = (newRange: { from: string; to: string }) => {
    setDateRange(newRange)
    setSelectedRange(0) // Clear preset selection
    setLoading(true)
  }

  // Initial load and range changes
  useEffect(() => {
    Promise.all([fetchData(), fetchThriveCartData()])
  }, [selectedRange, dateRange])

  const formatLastUpdated = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString()
  }

  return (
    <>
      <Head>
        <title>Postmark Analytics Dashboard</title>
        <meta name="description" content="Email analytics dashboard for Postmark campaigns" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Toaster position="top-right" />
        
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Mail className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Postmark Analytics
                </h1>
                <div className="ml-8 flex items-center space-x-4">
                  <a
                    href="/thrivecart"
                    className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    ThriveCart Dashboard
                  </a>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Time Range Presets */}
                <div className="flex items-center space-x-2">
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range.days}
                      onClick={() => handleTimeRangeChange(range.days)}
                      className={`
                        px-3 py-1 text-sm rounded-md transition-colors
                        ${selectedRange === range.days
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }
                      `}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Picker */}
                <div className="flex items-center space-x-2 border-l border-gray-200 dark:border-gray-600 pl-4">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => handleDateRangeChange({ ...dateRange, from: e.target.value })}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <span className="text-gray-500 dark:text-gray-400">to</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => handleDateRangeChange({ ...dateRange, to: e.target.value })}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className={`
                    flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md
                    ${refreshing 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }
                    transition-colors
                  `}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>

                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading analytics...</span>
            </div>
          ) : data ? (
            <div className="space-y-8">
              {/* Date Range Display */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing data from {format(new Date(dateRange.from), 'MMM d, yyyy')} to {format(new Date(dateRange.to), 'MMM d, yyyy')}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Time range: {data.timeRange}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                  title="Total Sent"
                  value={data.summary.sent}
                  icon={Mail}
                  format="number"
                />
                <KpiCard
                  title="Delivered"
                  value={data.summary.delivered}
                  icon={CheckCircle}
                  format="number"
                  subtitle={`${data.summary.sent > 0 ? ((data.summary.delivered / data.summary.sent) * 100).toFixed(1) : 0}% delivery rate`}
                />
                <KpiCard
                  title="Open Rate"
                  value={data.summary.openRate}
                  icon={Eye}
                  format="percentage"
                />
                <KpiCard
                  title="Click Rate"
                  value={data.summary.clickRate}
                  icon={MousePointer}
                  format="percentage"
                />
              </div>

              {/* Secondary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard
                  title="Bounce Rate"
                  value={data.summary.bounceRate}
                  icon={AlertTriangle}
                  format="percentage"
                />
                <KpiCard
                  title="Spam Complaints"
                  value={data.summary.spam}
                  icon={XCircle}
                  format="number"
                />
                <KpiCard
                  title="Unsubscribed"
                  value={data.summary.unsubscribed}
                  icon={TrendingUp}
                  format="number"
                  subtitle="Note: Requires suppressions API access"
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Email Trends
                  </h3>
                  <StatsChart
                    data={data.daily}
                    type="line"
                    height={300}
                    showMetrics={['sent', 'delivered', 'opened', 'clicked']}
                  />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Issues Tracking
                  </h3>
                  <StatsChart
                    data={data.daily}
                    type="line"
                    height={300}
                    showMetrics={['bounced', 'spam', 'unsubscribed']}
                  />
                </div>
              </div>

              {/* Stats Table */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Performance by Tag
                </h3>
                <StatsTable data={data.byTag} />
              </div>

              {/* ThriveCart Section */}
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  ThriveCart Analytics
                </h2>

                {thriveCartData ? (
                  <>
                    {/* ThriveCart KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      <KpiCard
                        title="Total Sales"
                        value={thriveCartData.summary.totalSales}
                        icon={DollarSign}
                        format="currency"
                      />
                      <KpiCard
                        title="Total Orders"
                        value={thriveCartData.summary.totalOrders}
                        icon={ShoppingCart}
                        format="number"
                      />
                      <KpiCard
                        title="Average Order Value"
                        value={thriveCartData.summary.averageOrderValue}
                        icon={TrendingUp}
                        format="currency"
                      />
                      <KpiCard
                        title="Net Revenue"
                        value={thriveCartData.summary.netRevenue}
                        icon={Wallet}
                        format="currency"
                        subtitle={`${thriveCartData.summary.refunds} refunds`}
                      />
                    </div>

                    {/* ThriveCart Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Daily Sales
                        </h3>
                        <LineChart
                          data={thriveCartData.daily}
                          xAxis="date"
                          yAxis="sales"
                          format="currency"
                        />
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Daily Orders
                        </h3>
                        <LineChart
                          data={thriveCartData.daily}
                          xAxis="date"
                          yAxis="orders"
                          format="number"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    No ThriveCart data available
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No data available. Please check your Postmark configuration.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  )
} 
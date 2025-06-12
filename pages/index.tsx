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
  TrendingUp
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import KpiCard from '@/components/KpiCard'
import StatsChart from '@/components/StatsChart'
import StatsTable from '@/components/StatsTable'
import { StatsResponse } from '@/pages/api/stats'

export default function Dashboard() {
  const [data, setData] = useState<StatsResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
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
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
        ...(refresh && { refresh: 'true' })
      })

      const response = await fetch(`/api/stats?${params}`)
      const result: StatsResponse = await response.json()

      if (result.success && result.data) {
        setData(result.data)
      } else {
        if (result.rateLimited) {
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

  // Force refresh data
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData(true)
  }

  // Handle date range change
  const handleDateRangeChange = (newRange: { from: string; to: string }) => {
    setDateRange(newRange)
    setLoading(true)
  }

  // Initial load and date range changes
  useEffect(() => {
    fetchData()
  }, [dateRange])

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
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Date Range Picker */}
                <div className="flex items-center space-x-2">
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
              {/* Last Updated Info */}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {formatLastUpdated(data.lastUpdated)}
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
                  subtitle={`${((data.summary.delivered / data.summary.sent) * 100).toFixed(1)}% delivery rate`}
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
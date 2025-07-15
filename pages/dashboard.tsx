import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { 
  Mail, 
  CheckCircle, 
  Eye, 
  MousePointer, 
  AlertTriangle,
  RefreshCw,
  Calendar,
  Moon,
  Sun,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  Target,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { format, subDays } from 'date-fns';

// Import existing components
import KpiCard from '@/components/KpiCard';
import { ThriveCartKpiCard } from '@/components/thrivecart/ThriveCartKpiCard';
import { ThriveCartChart } from '@/components/thrivecart/ThriveCartChart';
import { FacebookKpiCard } from '@/components/facebook/FacebookKpiCard';
import { FacebookChart } from '@/components/facebook/FacebookChart';

// Import types
import { StatsResponse } from '@/pages/api/stats';
import { ThriveCartStats } from '@/lib/thrivecart';
import { FacebookAdsStats } from '@/lib/facebook-ads';

const TIME_RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 }
];

interface UnifiedStats {
  postmark: StatsResponse['data'] | null;
  thrivecart: ThriveCartStats | null;
  facebook: FacebookAdsStats | null;
}

export default function UnifiedDashboard() {
  const [stats, setStats] = useState<UnifiedStats>({
    postmark: null,
    thrivecart: null,
    facebook: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedRange, setSelectedRange] = useState(30);
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [error, setError] = useState<string | null>(null);

  // Dark mode toggle
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Fetch all data sources
  const fetchAllData = async (refresh = false) => {
    try {
      setError(null);
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Build query parameters
      let params: URLSearchParams;
      if (selectedRange > 0) {
        params = new URLSearchParams({
          days: selectedRange.toString(),
          ...(refresh && { refresh: 'true' })
        });
      } else {
        params = new URLSearchParams({
          from: dateRange.from,
          to: dateRange.to,
          ...(refresh && { refresh: 'true' })
        });
      }

      // Facebook access token from environment or the provided token
      const facebookToken = process.env.FACEBOOK_ACCESS_TOKEN || 'EAAi0V09Ebq0BPPg4ufX903P4c8WoZCPhUhTjllPvOZBVurz7qG9Ys0DGVpmZCd3nXzf8eQN8CzoQ4zVEZBCgbcZCu5WhcqzeBZBHlZAhDCisEyT2rLwHWE8ZCtq7DQWXRvDAcK56P15Rj0NHuGt62zoXCF77SpUMKgps7ZBJZA7eZCi0DZAjQUEpG2y0mWTxaM1zH5XXBgb7NMaCzM4NuH7XzCkZD';

      // Fetch all data sources in parallel
      const [postmarkResponse, thrivecartResponse, facebookResponse] = await Promise.allSettled([
        fetch(`/api/stats?${params}`),
        fetch(`/api/thrivecart?${params}`, {
          method: refresh ? 'POST' : 'GET'
        }),
        fetch(`/api/facebook-ads?${params}`, {
          method: refresh ? 'POST' : 'GET',
          headers: {
            'x-facebook-token': facebookToken
          }
        })
      ]);

      const newStats: UnifiedStats = {
        postmark: null,
        thrivecart: null,
        facebook: null
      };

      // Process Postmark data
      if (postmarkResponse.status === 'fulfilled' && postmarkResponse.value.ok) {
        const postmarkData: StatsResponse = await postmarkResponse.value.json();
        if (postmarkData.success) {
          newStats.postmark = postmarkData.data;
        }
      }

      // Process ThriveCart data
      if (thrivecartResponse.status === 'fulfilled' && thrivecartResponse.value.ok) {
        newStats.thrivecart = await thrivecartResponse.value.json();
      }

      // Process Facebook data
      if (facebookResponse.status === 'fulfilled' && facebookResponse.value.ok) {
        newStats.facebook = await facebookResponse.value.json();
      }

      setStats(newStats);
      toast.success('Dashboard data refreshed successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      toast.error('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = (days: number) => {
    setSelectedRange(days);
    setLoading(true);
    const toDate = new Date();
    const fromDate = subDays(toDate, days);
    setDateRange({
      from: format(fromDate, 'yyyy-MM-dd'),
      to: format(toDate, 'yyyy-MM-dd')
    });
  };

  // Initial load and range changes
  useEffect(() => {
    fetchAllData();
  }, [selectedRange, dateRange]);

  const handleRefresh = () => {
    fetchAllData(true);
  };

  // Calculate unified metrics
  const getUnifiedMetrics = () => {
    const postmark = stats.postmark;
    const thrivecart = stats.thrivecart;
    const facebook = stats.facebook;

    return {
      // Email metrics
      emailsSent: postmark?.summary.sent || 0,
      emailsOpened: postmark?.summary.opened || 0,
      emailOpenRate: postmark?.summary.openRate || 0,
      emailClickRate: postmark?.summary.clickRate || 0,

      // Sales metrics
      totalRevenue: thrivecart?.totalRevenue || 0,
      totalTransactions: thrivecart?.totalTransactions || 0,
      averageOrderValue: thrivecart?.averageOrderValue || 0,
      conversionRate: thrivecart?.conversionRate || 0,

      // Facebook metrics
      adSpend: facebook?.totalSpend || 0,
      adClicks: facebook?.totalClicks || 0,
      adLeads: facebook?.totalLeads || 0,
      costPerLead: facebook?.averageCostPerLead || 0,

      // Calculated metrics
      roas: (facebook?.totalSpend || 0) > 0 ? (thrivecart?.totalRevenue || 0) / (facebook?.totalSpend || 0) : 0,
      profitMargin: (thrivecart?.totalRevenue || 0) - (facebook?.totalSpend || 0)
    };
  };

  const metrics = getUnifiedMetrics();

  return (
    <>
      <Head>
        <title>Unified Analytics Dashboard</title>
        <meta name="description" content="Comprehensive analytics dashboard combining Postmark, ThriveCart, and Facebook Ads data" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Toaster position="top-right" />
        
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Unified Analytics Dashboard
                </h1>
                <div className="flex gap-2">
                  <Link 
                    href="/"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Postmark
                  </Link>
                  <span className="text-gray-300">•</span>
                  <Link 
                    href="/thrivecart"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    ThriveCart
                  </Link>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Time Range Selector */}
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range.days}
                      onClick={() => handleTimeRangeChange(range.days)}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        selectedRange === range.days
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className={`
                    flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md
                    ${refreshing 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading unified dashboard...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-lg mb-4 inline-block">
                <p className="font-medium">Error loading dashboard</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => fetchAllData()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Date Range Display */}
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Complete Marketing Funnel Overview
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Data from {format(new Date(dateRange.from), 'MMM d, yyyy')} to {format(new Date(dateRange.to), 'MMM d, yyyy')}
                </p>
              </div>

              {/* High-Level KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                  title="Total Revenue"
                  value={metrics.totalRevenue}
                  icon={DollarSign}
                  format="currency"
                />
                <KpiCard
                  title="Ad Spend"
                  value={metrics.adSpend}
                  icon={Target}
                  format="currency"
                />
                <KpiCard
                  title="Net Profit"
                  value={metrics.profitMargin}
                  icon={TrendingUp}
                  format="currency"
                />
                <KpiCard
                  title="ROAS"
                  value={metrics.roas}
                  icon={BarChart3}
                  format="number"
                  subtitle={`${(metrics.roas * 100).toFixed(0)}% return on ad spend`}
                />
              </div>

              {/* Funnel Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Marketing Funnel Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mx-auto mb-3">
                      <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('en-US').format(metrics.adClicks)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ad Clicks</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto mb-3">
                      <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('en-US').format(metrics.adLeads)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Leads Generated</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full mx-auto mb-3">
                      <Mail className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('en-US').format(metrics.emailsOpened)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email Opens</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full mx-auto mb-3">
                      <ShoppingCart className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('en-US').format(metrics.totalTransactions)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Purchases</p>
                  </div>
                </div>

                {/* Funnel Conversion Rates */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {metrics.adClicks > 0 ? ((metrics.adLeads / metrics.adClicks) * 100).toFixed(1) : 0}%
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Click to Lead Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {metrics.emailOpenRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email Open Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {metrics.conversionRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Conversion</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Facebook Ads Performance */}
                {stats.facebook && (
                  <FacebookChart 
                    data={stats.facebook.dailyStats}
                    type="composed"
                    height={300}
                  />
                )}

                {/* ThriveCart Revenue */}
                {stats.thrivecart && (
                  <ThriveCartChart 
                    data={stats.thrivecart.dailyStats}
                    type="line"
                    height={300}
                  />
                )}
              </div>

              {/* Detailed Metrics by Platform */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Postmark Metrics */}
                {stats.postmark && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Email Marketing (Postmark)
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Emails Sent</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('en-US').format(stats.postmark.summary.sent)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Open Rate</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stats.postmark.summary.openRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Click Rate</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stats.postmark.summary.clickRate.toFixed(1)}%
                        </span>
                      </div>
                      <Link 
                        href="/"
                        className="flex items-center justify-center w-full px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        View Details <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* ThriveCart Metrics */}
                {stats.thrivecart && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Sales Performance (ThriveCart)
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Revenue</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${stats.thrivecart.totalRevenue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Transactions</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stats.thrivecart.totalTransactions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">AOV</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${stats.thrivecart.averageOrderValue.toFixed(2)}
                        </span>
                      </div>
                      <Link 
                        href="/thrivecart"
                        className="flex items-center justify-center w-full px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      >
                        View Details <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Facebook Ads Metrics */}
                {stats.facebook && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Facebook Advertising
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Ad Spend</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${stats.facebook.totalSpend.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">CTR</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stats.facebook.averageCtr.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Cost per Lead</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${stats.facebook.averageCostPerLead.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center w-full px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-md">
                        Facebook Analytics
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
} 
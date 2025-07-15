import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { toast, Toaster } from 'react-hot-toast';
import { 
  RefreshCw,
  Moon,
  Sun,
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Mail,
  MousePointer,
  Users,
  ShoppingCart,
  Eye,
  Activity
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

// Import existing components
import KpiCard from '@/components/KpiCard';
import { FacebookChart } from '@/components/facebook/FacebookChart';
import { ThriveCartChart } from '@/components/thrivecart/ThriveCartChart';

// Import types
import { StatsResponse } from '@/pages/api/stats';
import { ThriveCartStats } from '@/lib/thrivecart';
import { FacebookAdsStats } from '@/lib/facebook-ads';

const TIME_RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 }
];

interface DailyMetrics {
  date: string;
  
  // Postmark metrics
  emailsSent: number;
  emailsOpened: number;
  emailOpenRate: number;
  emailClickRate: number;
  
  // ThriveCart metrics
  grossRevenue: number;
  netRevenue: number;
  transactions: number;
  averageOrderValue: number;
  upsells: number;
  
  // Facebook Ads metrics
  adSpend: number;
  adClicks: number;
  adImpressions: number;
  adCtr: number;
  adCpc: number;
  leads: number;
  costPerLead: number;
  
  // Calculated metrics
  roas: number;
  profit: number;
  conversionRate: number;
}

interface UnifiedData {
  postmark: StatsResponse['data'] | null;
  thrivecart: ThriveCartStats | null;
  facebook: FacebookAdsStats | null;
}

export default function UnifiedDashboard() {
  const [data, setData] = useState<UnifiedData>({
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

      const newData: UnifiedData = {
        postmark: null,
        thrivecart: null,
        facebook: null
      };

      // Process Postmark data
      if (postmarkResponse.status === 'fulfilled' && postmarkResponse.value.ok) {
        const postmarkData: StatsResponse = await postmarkResponse.value.json();
        if (postmarkData.success) {
          newData.postmark = postmarkData.data;
        }
      }

      // Process ThriveCart data
      if (thrivecartResponse.status === 'fulfilled' && thrivecartResponse.value.ok) {
        newData.thrivecart = await thrivecartResponse.value.json();
      }

      // Process Facebook data
      if (facebookResponse.status === 'fulfilled' && facebookResponse.value.ok) {
        newData.facebook = await facebookResponse.value.json();
      }

      setData(newData);
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

  // Combine daily data from all sources
  const getDailyMetrics = (): DailyMetrics[] => {
    if (!data.postmark && !data.thrivecart && !data.facebook) return [];

    // Create a map of all dates
    const dateMap = new Map<string, DailyMetrics>();

    // Add Postmark data
    data.postmark?.daily.forEach(day => {
      if (!dateMap.has(day.date)) {
        dateMap.set(day.date, {
          date: day.date,
          emailsSent: 0,
          emailsOpened: 0,
          emailOpenRate: 0,
          emailClickRate: 0,
          grossRevenue: 0,
          netRevenue: 0,
          transactions: 0,
          averageOrderValue: 0,
          upsells: 0,
          adSpend: 0,
          adClicks: 0,
          adImpressions: 0,
          adCtr: 0,
          adCpc: 0,
          leads: 0,
          costPerLead: 0,
          roas: 0,
          profit: 0,
          conversionRate: 0
        });
      }
      const metrics = dateMap.get(day.date)!;
      metrics.emailsSent = day.sent || 0;
      metrics.emailsOpened = day.opened || 0;
      metrics.emailOpenRate = metrics.emailsSent > 0 ? (metrics.emailsOpened / metrics.emailsSent) * 100 : 0;
      metrics.emailClickRate = day.clicked && metrics.emailsSent > 0 ? (day.clicked / metrics.emailsSent) * 100 : 0;
    });

    // Add ThriveCart data
    data.thrivecart?.dailyStats.forEach(day => {
      if (!dateMap.has(day.date)) {
        dateMap.set(day.date, {
          date: day.date,
          emailsSent: 0,
          emailsOpened: 0,
          emailOpenRate: 0,
          emailClickRate: 0,
          grossRevenue: 0,
          netRevenue: 0,
          transactions: 0,
          averageOrderValue: 0,
          upsells: 0,
          adSpend: 0,
          adClicks: 0,
          adImpressions: 0,
          adCtr: 0,
          adCpc: 0,
          leads: 0,
          costPerLead: 0,
          roas: 0,
          profit: 0,
          conversionRate: 0
        });
      }
      const metrics = dateMap.get(day.date)!;
      metrics.grossRevenue = day.revenue;
      metrics.netRevenue = day.revenue; // Assuming gross = net for now
      metrics.transactions = day.transactions;
      metrics.averageOrderValue = metrics.transactions > 0 ? metrics.grossRevenue / metrics.transactions : 0;
      metrics.upsells = day.upsells || 0;
    });

    // Add Facebook data
    data.facebook?.dailyStats.forEach(day => {
      if (!dateMap.has(day.date)) {
        dateMap.set(day.date, {
          date: day.date,
          emailsSent: 0,
          emailsOpened: 0,
          emailOpenRate: 0,
          emailClickRate: 0,
          grossRevenue: 0,
          netRevenue: 0,
          transactions: 0,
          averageOrderValue: 0,
          upsells: 0,
          adSpend: 0,
          adClicks: 0,
          adImpressions: 0,
          adCtr: 0,
          adCpc: 0,
          leads: 0,
          costPerLead: 0,
          roas: 0,
          profit: 0,
          conversionRate: 0
        });
      }
      const metrics = dateMap.get(day.date)!;
      metrics.adSpend = day.spend;
      metrics.adClicks = day.clicks;
      metrics.adImpressions = day.impressions;
      metrics.adCtr = day.ctr;
      metrics.adCpc = day.cpc;
      metrics.leads = day.leads;
      metrics.costPerLead = day.costPerLead;

      // Calculate derived metrics
      metrics.roas = metrics.adSpend > 0 ? metrics.grossRevenue / metrics.adSpend : 0;
      metrics.profit = metrics.grossRevenue - metrics.adSpend;
      metrics.conversionRate = metrics.leads > 0 ? (metrics.transactions / metrics.leads) * 100 : 0;
    });

    return Array.from(dateMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  // Calculate summary metrics
  const getSummaryMetrics = () => {
    const dailyMetrics = getDailyMetrics();
    
    const totals = dailyMetrics.reduce((acc, day) => ({
      totalRevenue: acc.totalRevenue + day.grossRevenue,
      totalSpend: acc.totalSpend + day.adSpend,
      totalClicks: acc.totalClicks + day.adClicks,
      totalLeads: acc.totalLeads + day.leads,
      totalTransactions: acc.totalTransactions + day.transactions,
      totalEmailsSent: acc.totalEmailsSent + day.emailsSent,
      totalEmailsOpened: acc.totalEmailsOpened + day.emailsOpened
    }), {
      totalRevenue: 0,
      totalSpend: 0,
      totalClicks: 0,
      totalLeads: 0,
      totalTransactions: 0,
      totalEmailsSent: 0,
      totalEmailsOpened: 0
    });

    return {
      ...totals,
      netProfit: totals.totalRevenue - totals.totalSpend,
      roas: totals.totalSpend > 0 ? totals.totalRevenue / totals.totalSpend : 0,
      avgCostPerLead: totals.totalLeads > 0 ? totals.totalSpend / totals.totalLeads : 0,
      conversionRate: totals.totalLeads > 0 ? (totals.totalTransactions / totals.totalLeads) * 100 : 0,
      emailOpenRate: totals.totalEmailsSent > 0 ? (totals.totalEmailsOpened / totals.totalEmailsSent) * 100 : 0
    };
  };

  const dailyMetrics = getDailyMetrics();
  const summary = getSummaryMetrics();

  return (
    <>
      <Head>
        <title>Complete Analytics Dashboard</title>
        <meta name="description" content="Comprehensive single-page analytics dashboard" />
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
                  Complete Analytics Dashboard
                </h1>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(dateRange.from), 'MMM d')} - {format(new Date(dateRange.to), 'MMM d, yyyy')}
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
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading complete dashboard...</span>
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
              {/* Facebook Data Error/Warning */}
              {(!data.facebook || (data.facebook && (!data.facebook.dailyStats || data.facebook.dailyStats.length === 0))) && (
                <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 p-4 rounded-lg mb-4 text-center">
                  <p className="font-medium">Warning: No Facebook Ads data found.</p>
                  <p className="text-sm mt-1">Check your Facebook access token, permissions, and ad account. If you believe this is an error, check your Netlify logs or try a different token.</p>
                </div>
              )}
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <KpiCard
                  title="Total Revenue"
                  value={summary.totalRevenue}
                  icon={DollarSign}
                  format="currency"
                />
                <KpiCard
                  title="Ad Spend"
                  value={summary.totalSpend}
                  icon={Target}
                  format="currency"
                />
                <KpiCard
                  title="Net Profit"
                  value={summary.netProfit}
                  icon={TrendingUp}
                  format="currency"
                />
                <KpiCard
                  title="ROAS"
                  value={summary.roas}
                  icon={BarChart3}
                  format="number"
                  subtitle={`${(summary.roas).toFixed(2)}x return`}
                />
                <KpiCard
                  title="Conversion Rate"
                  value={summary.conversionRate}
                  icon={Activity}
                  format="percentage"
                />
                <KpiCard
                  title="Email Open Rate"
                  value={summary.emailOpenRate}
                  icon={Mail}
                  format="percentage"
                />
              </div>

              {/* Complete Data Table - Similar to Google Sheets */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Complete Daily Analytics ({dailyMetrics.length} days)
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    {/* Table Header */}
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                          Date
                        </th>
                        {/* Postmark Columns */}
                        <th className="px-2 py-3 text-center text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600" colSpan={3}>
                          Postmark Email
                        </th>
                        {/* ThriveCart Columns */}
                        <th className="px-2 py-3 text-center text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600" colSpan={4}>
                          ThriveCart Sales
                        </th>
                        {/* Facebook Columns */}
                        <th className="px-2 py-3 text-center text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600" colSpan={5}>
                          Facebook Ads
                        </th>
                        {/* Calculated Columns */}
                        <th className="px-2 py-3 text-center text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider" colSpan={3}>
                          Performance
                        </th>
                      </tr>
                      <tr className="bg-gray-100 dark:bg-gray-600">
                        <th className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-500"></th>
                        {/* Postmark Sub-headers */}
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">Sent</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">Opened</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center border-r border-gray-200 dark:border-gray-500">Open %</th>
                        {/* ThriveCart Sub-headers */}
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">Revenue</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">Orders</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">AOV</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center border-r border-gray-200 dark:border-gray-500">Upsells</th>
                        {/* Facebook Sub-headers */}
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">Spend</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">Clicks</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">Leads</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">CTR</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center border-r border-gray-200 dark:border-gray-500">CPC</th>
                        {/* Performance Sub-headers */}
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">ROAS</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">Profit</th>
                        <th className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 text-center">Conv %</th>
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {dailyMetrics.map((day, index) => (
                        <tr key={day.date} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                          {/* Date */}
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                            {format(new Date(day.date), 'MMM d')}
                          </td>
                          
                          {/* Postmark Data */}
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                            {day.emailsSent.toLocaleString()}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                            {day.emailsOpened.toLocaleString()}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-600">
                            {day.emailOpenRate.toFixed(1)}%
                          </td>

                          {/* ThriveCart Data */}
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                            ${day.grossRevenue.toFixed(0)}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                            {day.transactions}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                            ${day.averageOrderValue.toFixed(0)}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-600">
                            {day.upsells}
                          </td>

                          {/* Facebook Data */}
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                            ${day.adSpend.toFixed(0)}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                            {day.adClicks}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                            {day.leads}
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                            {day.adCtr.toFixed(2)}%
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-600">
                            ${day.adCpc.toFixed(2)}
                          </td>

                          {/* Performance Data */}
                          <td className="px-2 py-3 text-sm text-center">
                            <span className={`font-medium ${day.roas >= 2 ? 'text-green-600' : day.roas >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {day.roas.toFixed(2)}x
                            </span>
                          </td>
                          <td className="px-2 py-3 text-sm text-center">
                            <span className={`font-medium ${day.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${day.profit.toFixed(0)}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                            {day.conversionRate.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Summary Row */}
                    <tfoot className="bg-gray-100 dark:bg-gray-600 border-t-2 border-gray-300 dark:border-gray-500">
                      <tr className="font-bold">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-500">
                          Total
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                          {summary.totalEmailsSent.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                          {summary.totalEmailsOpened.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-500">
                          {summary.emailOpenRate.toFixed(1)}%
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                          ${summary.totalRevenue.toFixed(0)}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                          {summary.totalTransactions}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                          ${summary.totalTransactions > 0 ? (summary.totalRevenue / summary.totalTransactions).toFixed(0) : '0'}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-500">
                          -
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                          ${summary.totalSpend.toFixed(0)}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                          {summary.totalClicks}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                          {summary.totalLeads}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                          -
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-500">
                          ${summary.avgCostPerLead.toFixed(2)}
                        </td>
                        <td className="px-2 py-3 text-sm text-center">
                          <span className={`font-bold ${summary.roas >= 2 ? 'text-green-600' : summary.roas >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {summary.roas.toFixed(2)}x
                          </span>
                        </td>
                        <td className="px-2 py-3 text-sm text-center">
                          <span className={`font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${summary.netProfit.toFixed(0)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-900 dark:text-white text-center">
                          {summary.conversionRate.toFixed(1)}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Facebook Ads Performance */}
                {data.facebook && (
                  <FacebookChart 
                    data={data.facebook.dailyStats}
                    type="composed"
                    height={300}
                  />
                )}

                {/* ThriveCart Revenue */}
                {data.thrivecart && (
                  <ThriveCartChart 
                    data={data.thrivecart.dailyStats}
                    type="line"
                    height={300}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
} 
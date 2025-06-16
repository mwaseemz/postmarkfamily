'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  RefreshCw,
  Moon,
  Sun,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { ThriveCartKpiCard } from '@/components/thrivecart/ThriveCartKpiCard';
import { ThriveCartChart } from '@/components/thrivecart/ThriveCartChart';
import { ThriveCartTable } from '@/components/thrivecart/ThriveCartTable';
import { ThriveCartStats } from '@/lib/thrivecart';

export default function ThriveCartDashboard() {
  const [stats, setStats] = useState<ThriveCartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/thrivecart', {
        method: forceRefresh ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching ThriveCart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <Head>
          <title>ThriveCart Analytics Dashboard</title>
          <meta name="description" content="Sales analytics dashboard for ThriveCart data" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading ThriveCart data...</p>
          </div>
        </div>
      </>
    );
  }

  if (error && !stats) {
    return (
      <>
        <Head>
          <title>ThriveCart Analytics Dashboard - Error</title>
          <meta name="description" content="Sales analytics dashboard for ThriveCart data" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-lg mb-4">
              <p className="font-medium">Error loading data</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => fetchData()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>ThriveCart Analytics Dashboard</title>
        <meta name="description" content="Sales analytics dashboard for ThriveCart data" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <Link 
                  href="/"
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Postmark
                </Link>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  ThriveCart Analytics
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                {lastUpdated && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                
                <button
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                
                <button
                  onClick={toggleDarkMode}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-400 px-4 py-3 rounded-lg">
              <p className="font-medium">Warning</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {stats && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <ThriveCartKpiCard
                  title="Total Revenue"
                  value={stats.totalRevenue}
                  icon={DollarSign}
                  format="currency"
                />
                <ThriveCartKpiCard
                  title="Total Transactions"
                  value={stats.totalTransactions}
                  icon={ShoppingCart}
                  format="number"
                />
                <ThriveCartKpiCard
                  title="Conversion Rate"
                  value={stats.conversionRate}
                  icon={TrendingUp}
                  format="percentage"
                />
                <ThriveCartKpiCard
                  title="Avg Order Value"
                  value={stats.averageOrderValue}
                  icon={Users}
                  format="currency"
                />
              </div>

              {/* Secondary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <ThriveCartKpiCard
                  title="Total Purchases"
                  value={stats.totalPurchases}
                  icon={ShoppingCart}
                  format="number"
                />
                <ThriveCartKpiCard
                  title="Total Upsells"
                  value={stats.totalUpsells}
                  icon={TrendingUp}
                  format="number"
                />
                <ThriveCartKpiCard
                  title="Upsell Rate"
                  value={stats.upsellConversionRate}
                  icon={TrendingUp}
                  format="percentage"
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ThriveCartChart 
                  data={stats.dailyStats} 
                  type="line"
                  height={300}
                />
                <ThriveCartChart 
                  data={stats.dailyStats} 
                  type="bar"
                  height={300}
                />
              </div>

              {/* Product Performance */}
              {stats.productStats.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Product Performance
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Avg Price
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {stats.productStats.map((product, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                              <div className="max-w-xs truncate" title={product.name}>
                                {product.name}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-white text-right font-medium">
                              ${product.revenue.toFixed(2)}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-white text-right">
                              {product.quantity}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-white text-right">
                              ${product.averagePrice.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Transactions Table */}
              <ThriveCartTable transactions={stats.recentTransactions} />
            </>
          )}
        </main>
      </div>
    </>
  );
} 
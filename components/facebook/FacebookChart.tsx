'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ComposedChart
} from 'recharts';
import { FacebookAdsMetrics } from '@/lib/facebook-ads';

interface FacebookChartProps {
  data: FacebookAdsMetrics[];
  type?: 'line' | 'bar' | 'composed';
  height?: number;
  metrics?: ('spend' | 'clicks' | 'impressions' | 'leads' | 'purchases')[];
}

export function FacebookChart({ 
  data, 
  type = 'line', 
  height = 300,
  metrics = ['spend', 'clicks']
}: FacebookChartProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const chartData = data.map(item => ({
    ...item,
    formattedDate: formatDate(item.date)
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {entry.name}:
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {entry.name === 'Spend' || entry.name.includes('Cost')
                  ? formatCurrency(entry.value)
                  : entry.name.includes('CTR') || entry.name.includes('Rate')
                  ? `${entry.value.toFixed(2)}%`
                  : new Intl.NumberFormat('en-US').format(entry.value)
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getMetricConfig = (metric: string) => {
    const configs = {
      spend: { name: 'Spend', color: '#3B82F6', yAxisId: 'spend' },
      clicks: { name: 'Clicks', color: '#10B981', yAxisId: 'count' },
      impressions: { name: 'Impressions', color: '#8B5CF6', yAxisId: 'count' },
      leads: { name: 'Leads', color: '#F59E0B', yAxisId: 'count' },
      purchases: { name: 'Purchases', color: '#EF4444', yAxisId: 'count' },
      ctr: { name: 'CTR', color: '#06B6D4', yAxisId: 'percentage' },
      cpc: { name: 'CPC', color: '#84CC16', yAxisId: 'spend' }
    };
    return configs[metric as keyof typeof configs] || configs.spend;
  };

  if (type === 'composed') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Facebook Ads Performance
        </h3>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="formattedDate" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="spend"
              orientation="left"
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <YAxis 
              yAxisId="count"
              orientation="right"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              yAxisId="spend"
              dataKey="spend" 
              name="Spend"
              fill="#3B82F6" 
              radius={[2, 2, 0, 0]}
            />
            <Line 
              yAxisId="count"
              type="monotone" 
              dataKey="clicks" 
              name="Clicks"
              stroke="#10B981" 
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
            />
            <Line 
              yAxisId="count"
              type="monotone" 
              dataKey="leads" 
              name="Leads"
              stroke="#F59E0B" 
              strokeWidth={2}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Daily Facebook Ads Metrics
        </h3>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="formattedDate" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => 
                metrics.includes('spend') ? formatCurrency(value) : value
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {metrics.map((metric, index) => {
              const config = getMetricConfig(metric);
              return (
                <Bar 
                  key={metric}
                  dataKey={metric} 
                  name={config.name}
                  fill={config.color} 
                  radius={[2, 2, 0, 0]}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Facebook Ads Trends
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="formattedDate" 
            className="text-xs"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => 
              metrics.includes('spend') ? formatCurrency(value) : value
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {metrics.map((metric, index) => {
            const config = getMetricConfig(metric);
            return (
              <Line 
                key={metric}
                type="monotone" 
                dataKey={metric} 
                name={config.name}
                stroke={config.color} 
                strokeWidth={3}
                dot={{ fill: config.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: config.color, strokeWidth: 2 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 
'use client';

import { LucideIcon } from 'lucide-react';

interface FacebookKpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  format?: 'number' | 'currency' | 'percentage';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function FacebookKpiCard({ 
  title, 
  value, 
  icon: Icon, 
  format = 'number',
  subtitle,
  trend 
}: FacebookKpiCardProps) {
  const formatValue = (val: number, type: string) => {
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(val);
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(Math.round(val));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatValue(value, format)}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${
            trend.isPositive 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            <span className="font-medium">
              {trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 
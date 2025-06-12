import React from 'react'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  format?: 'number' | 'percentage' | 'currency'
  className?: string
}

export default function KpiCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  format = 'number',
  className = '' 
}: KpiCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    
    if (format === 'currency') {
      return `$${val.toLocaleString()}`
    }
    if (format === 'percentage') {
      return `${val}%`
    }
    if (format === 'number') {
      return val.toLocaleString()
    }
    return val.toString()
  }

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6
      hover:shadow-md transition-shadow duration-200
      ${className}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {title}
            </h3>
          </div>
          
          <div className="mt-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatValue(value)}
            </p>
            
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
            
            {trend && (
              <div className="flex items-center mt-2">
                <span className={`
                  text-sm font-medium
                  ${trend.isPositive 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                  }
                `}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  vs last period
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 
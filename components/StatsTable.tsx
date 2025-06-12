import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search, ExternalLink } from 'lucide-react'

interface TagStats {
  tag: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  spam: number
  unsubscribed: number
  openRate: number
  clickRate: number
  bounceRate: number
}

interface StatsTableProps {
  data: TagStats[]
  className?: string
}

type SortField = keyof TagStats
type SortDirection = 'asc' | 'desc'

export default function StatsTable({ data, className = '' }: StatsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('sent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const filteredData = useMemo(() => {
    return data.filter(row => 
      row.tag.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm])

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue
      }
      
      return 0
    })
  }, [filteredData, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatNumber = (num: number) => num.toLocaleString()
  const formatPercentage = (num: number) => `${num}%`

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${className}`}>
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tag</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Open Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Click Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row) => (
              <tr key={row.tag} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{row.tag}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatNumber(row.sent)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatNumber(row.delivered)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatPercentage(row.openRate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatPercentage(row.clickRate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-primary-600 hover:text-primary-500">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 
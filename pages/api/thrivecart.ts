import type { NextApiRequest, NextApiResponse } from 'next'
import { format, subDays } from 'date-fns'

interface ThriveCartResponse {
  success: boolean
  data?: {
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
  error?: string
}

async function makeThriveCartRequest(endpoint: string): Promise<any> {
  const apiKey = process.env.THRIVECART_API_KEY
  if (!apiKey) {
    throw new Error('THRIVECART_API_KEY environment variable not set')
  }

  const response = await fetch(`https://api.thrivecart.com/v1${endpoint}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ThriveCart API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ThriveCartResponse>
) {
  try {
    // Parse query parameters
    const { days = '30', from, to } = req.query
    
    let fromDate: Date
    let toDate: Date
    
    if (from && to) {
      fromDate = new Date(from as string)
      toDate = new Date(to as string)
    } else {
      toDate = new Date()
      fromDate = subDays(toDate, parseInt(days as string))
    }
    
    const fromDateStr = format(fromDate, 'yyyy-MM-dd')
    const toDateStr = format(toDate, 'yyyy-MM-dd')

    console.log(`Fetching ThriveCart stats from ${fromDateStr} to ${toDateStr}`)

    try {
      // Fetch orders data from ThriveCart
      const ordersData = await makeThriveCartRequest('/orders', {
        method: 'GET',
        params: {
          start_date: fromDateStr,
          end_date: toDateStr
        }
      })

      // Process orders data
      const orders = ordersData.orders || []
      
      // Calculate daily breakdown
      const dailyMap = new Map<string, any>()
      
      orders.forEach((order: any) => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd')
        const existing = dailyMap.get(date) || {
          date,
          sales: 0,
          orders: 0,
          refunds: 0,
          netRevenue: 0
        }
        
        existing.orders++
        existing.sales += order.total || 0
        
        if (order.status === 'refunded') {
          existing.refunds++
          existing.netRevenue -= order.total || 0
        } else {
          existing.netRevenue += order.total || 0
        }
        
        dailyMap.set(date, existing)
      })

      // Convert to array and sort by date
      const daily = Array.from(dailyMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Calculate summary
      const summary = daily.reduce((acc, day) => {
        acc.totalSales += day.sales
        acc.totalOrders += day.orders
        acc.refunds += day.refunds
        acc.netRevenue += day.netRevenue
        return acc
      }, {
        totalSales: 0,
        totalOrders: 0,
        refunds: 0,
        netRevenue: 0
      })

      // Calculate averages
      summary.averageOrderValue = summary.totalOrders > 0 
        ? Math.round((summary.totalSales / summary.totalOrders) * 100) / 100 
        : 0

      // Calculate conversion rate (this would need traffic data from your analytics)
      summary.conversionRate = 0 // Placeholder - would need traffic data

      const response: ThriveCartResponse = {
        success: true,
        data: {
          summary,
          daily,
          timeRange: `${fromDateStr} to ${toDateStr}`
        }
      }

      res.status(200).json(response)

    } catch (apiError) {
      console.error('ThriveCart API error:', apiError)
      throw new Error(`Failed to fetch data from ThriveCart: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`)
    }

  } catch (error) {
    console.error('ThriveCart API error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
} 
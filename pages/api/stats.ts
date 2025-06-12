import type { NextApiRequest, NextApiResponse } from 'next'
import { format, subDays } from 'date-fns'

export interface StatsResponse {
  success: boolean
  data?: {
    summary: {
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
    byTag: Array<{
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
    }>
    daily: Array<{
      date: string
      sent: number
      delivered: number
      opened: number
      clicked: number
      bounced: number
      spam: number
      unsubscribed: number
    }>
    timeRange: string
  }
  error?: string
}

async function makePostmarkRequest(endpoint: string): Promise<any> {
  const token = process.env.POSTMARK_SERVER_TOKEN
  if (!token) {
    throw new Error('POSTMARK_SERVER_TOKEN environment variable not set')
  }

  const response = await fetch(`https://api.postmarkapp.com${endpoint}`, {
    headers: {
      'Accept': 'application/json',
      'X-Postmark-Server-Token': token
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Postmark API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
}

function calculateRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 10000) / 100 // Round to 2 decimal places
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
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
    const baseParams = `?fromdate=${fromDateStr}&todate=${toDateStr}`

    console.log(`Fetching Postmark stats from ${fromDateStr} to ${toDateStr}`)

    try {
      // HYBRID APPROACH:
      // 1. Use overview endpoint for accurate summary totals (matches Postmark dashboard)
      // 2. Use individual endpoints for proper daily breakdown data for charts
      
      const [overviewData, sendsData, opensData, clicksData, bounceData] = await Promise.all([
        makePostmarkRequest(`/stats/outbound${baseParams}`),
        makePostmarkRequest(`/stats/outbound/sends${baseParams}`),
        makePostmarkRequest(`/stats/outbound/opens${baseParams}`).catch(() => ({ Days: [] })),
        makePostmarkRequest(`/stats/outbound/clicks${baseParams}`).catch(() => ({ Days: [] })),
        makePostmarkRequest(`/stats/outbound/bounces${baseParams}`).catch(() => ({ Days: [] }))
      ])

      console.log('Overview data:', JSON.stringify(overviewData, null, 2))

      // Create daily data map for charts using individual endpoint data
      const dailyMap = new Map<string, any>()
      
      // Initialize with sent data
      if (sendsData.Days) {
        sendsData.Days.forEach((day: any) => {
          dailyMap.set(day.Date, {
            date: day.Date,
            sent: day.Sent || 0,
            delivered: 0, // Will calculate below
            opened: 0,
            clicked: 0,
            bounced: 0,
            spam: 0,
            unsubscribed: 0
          })
        })
      }

      // Add opens data (use unique opens for consistency)
      if (opensData.Days) {
        opensData.Days.forEach((day: any) => {
          const existing = dailyMap.get(day.Date)
          if (existing) {
            existing.opened = day.Unique || day.Opens || 0
          }
        })
      }

      // Add clicks data (use unique clicks for consistency)
      if (clicksData.Days) {
        clicksData.Days.forEach((day: any) => {
          const existing = dailyMap.get(day.Date)
          if (existing) {
            existing.clicked = day.Unique || day.Clicks || 0
          }
        })
      }

      // Add bounce data (use actual bounces, not SMTP errors)
      if (bounceData.Days) {
        bounceData.Days.forEach((day: any) => {
          const existing = dailyMap.get(day.Date)
          if (existing) {
            // Only count hard bounces and soft bounces, not SMTP API errors
            existing.bounced = (day.HardBounce || 0) + (day.SoftBounce || 0) + (day.Transient || 0)
          }
        })
      }

      // Calculate delivered for each day (sent - bounced)
      dailyMap.forEach((day) => {
        day.delivered = Math.max(0, day.sent - day.bounced)
      })

      // Convert to array and sort by date
      const dailyData = Array.from(dailyMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Calculate delivered emails (sent - bounced) from overview
      const delivered = Math.max(0, (overviewData.Sent || 0) - (overviewData.Bounced || 0))

      // Create summary using overview data (matches Postmark dashboard exactly)
      const summary = {
        sent: overviewData.Sent || 0,
        delivered: delivered,
        opened: overviewData.UniqueOpens || 0, // Use unique opens for proper rate calculation
        clicked: overviewData.UniqueLinksClicked || 0, // Use unique clicks
        bounced: overviewData.Bounced || 0, // This matches Postmark dashboard exactly
        spam: overviewData.SpamComplaints || 0,
        unsubscribed: 0, // Would require suppressions API access
        openRate: calculateRate(overviewData.UniqueOpens || 0, overviewData.Sent || 0),
        clickRate: calculateRate(overviewData.UniqueLinksClicked || 0, overviewData.Sent || 0),
        bounceRate: calculateRate(overviewData.Bounced || 0, overviewData.Sent || 0)
      }

      console.log('Calculated summary:', JSON.stringify(summary, null, 2))
      console.log('Daily data sample:', JSON.stringify(dailyData.slice(0, 3), null, 2))

      // Create empty byTag data (would require tag-specific API calls)
      const byTag: any[] = []

      const response: StatsResponse = {
        success: true,
        data: {
          summary,
          byTag,
          daily: dailyData,
          timeRange: `${fromDateStr} to ${toDateStr}`
        }
      }

      res.status(200).json(response)

    } catch (apiError) {
      console.error('Postmark API error:', apiError)
      throw new Error(`Failed to fetch data from Postmark: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`)
    }

  } catch (error) {
    console.error('Stats API error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
} 
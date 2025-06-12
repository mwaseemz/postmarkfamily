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
      // Use the overview endpoint that matches Postmark dashboard exactly
      const [overviewData, sendsData] = await Promise.all([
        makePostmarkRequest(`/stats/outbound${baseParams}`),
        makePostmarkRequest(`/stats/outbound/sends${baseParams}`)
      ])

      console.log('Overview data:', JSON.stringify(overviewData, null, 2))

      // Extract daily data from sends endpoint for charts
      const dailyData = sendsData.Days?.map((day: any) => ({
        date: day.Date,
        sent: day.Sent || 0,
        delivered: Math.max(0, (day.Sent || 0) - (overviewData.Bounced || 0) / (sendsData.Days?.length || 1)),
        opened: 0, // Overview doesn't provide daily breakdown
        clicked: 0,
        bounced: Math.round((overviewData.Bounced || 0) / (sendsData.Days?.length || 1)),
        spam: Math.round((overviewData.SpamComplaints || 0) / (sendsData.Days?.length || 1)),
        unsubscribed: 0
      })) || []

      // Calculate delivered emails (sent - bounced)
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
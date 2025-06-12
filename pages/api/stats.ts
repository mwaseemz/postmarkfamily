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
    lastUpdated: string
  }
  error?: string
  rateLimited?: boolean
}

function calculateRate(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100 * 100) / 100 : 0
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { from, to, days } = req.query
    
    // Handle time framing - either from/to dates or days parameter
    let fromDate: Date
    let toDate: Date
    
    if (days) {
      const daysNum = parseInt(days as string, 10)
      toDate = new Date()
      fromDate = subDays(toDate, daysNum)
    } else {
      fromDate = from ? new Date(from as string) : subDays(new Date(), 30)
      toDate = to ? new Date(to as string) : new Date()
    }
    
    const fromDateStr = format(fromDate, 'yyyy-MM-dd')
    const toDateStr = format(toDate, 'yyyy-MM-dd')

    console.log(`Fetching Postmark data from ${fromDateStr} to ${toDateStr}`)

    try {
      // Fetch data from multiple Postmark endpoints for comprehensive stats
      const baseParams = `?fromdate=${fromDateStr}&todate=${toDateStr}`
      
      const [
        sentStats,
        bounceStats,
        spamStats,
        openStats,
        clickStats,
        suppressions
      ] = await Promise.all([
        makePostmarkRequest(`/stats/outbound/sends${baseParams}`),
        makePostmarkRequest(`/stats/outbound/bounces${baseParams}`),
        makePostmarkRequest(`/stats/outbound/spam${baseParams}`),
        makePostmarkRequest(`/stats/outbound/opens${baseParams}`),
        makePostmarkRequest(`/stats/outbound/clicks${baseParams}`),
        makePostmarkRequest('/suppressions/dump')
      ])

      console.log('API responses received:', {
        sent: sentStats,
        bounces: bounceStats,
        spam: spamStats,
        opens: openStats,
        clicks: clickStats,
        suppressions: suppressions?.suppressions?.length || 0
      })

      // Process daily data by combining all sources
      const dailyMap = new Map<string, any>()
      
      // Initialize daily data from sent stats
      if (sentStats.Days) {
        sentStats.Days.forEach((day: any) => {
          dailyMap.set(day.Date, {
            date: day.Date,
            sent: day.Sent || 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            spam: 0,
            unsubscribed: 0
          })
        })
      }

      // Add bounce data
      if (bounceStats.Days) {
        bounceStats.Days.forEach((day: any) => {
          const existing = dailyMap.get(day.Date) || { 
            date: day.Date, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0 
          }
          existing.bounced = (day.HardBounce || 0) + (day.SoftBounce || 0) + (day.Transient || 0) + (day.SMTPApiError || 0)
          dailyMap.set(day.Date, existing)
        })
      }

      // Add spam data
      if (spamStats.Days) {
        spamStats.Days.forEach((day: any) => {
          const existing = dailyMap.get(day.Date) || { 
            date: day.Date, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0 
          }
          existing.spam = day.SpamComplaint || 0
          dailyMap.set(day.Date, existing)
        })
      }

      // Add open data
      if (openStats.Days) {
        openStats.Days.forEach((day: any) => {
          const existing = dailyMap.get(day.Date) || { 
            date: day.Date, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0 
          }
          existing.opened = day.Opens || 0
          dailyMap.set(day.Date, existing)
        })
      }

      // Add click data
      if (clickStats.Days) {
        clickStats.Days.forEach((day: any) => {
          const existing = dailyMap.get(day.Date) || { 
            date: day.Date, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0 
          }
          existing.clicked = day.Clicks || 0
          dailyMap.set(day.Date, existing)
        })
      }

      // Calculate delivered and process unsubscribes from suppressions
      let totalUnsubscribed = 0
      if (suppressions?.Suppressions) {
        // Count suppressions with reason 'ManualSuppression' as unsubscribes
        suppressions.Suppressions.forEach((suppression: any) => {
          if (suppression.SuppressionReason === 'ManualSuppression') {
            totalUnsubscribed++
            // For daily breakdown, we'd need the created date of the suppression
            // Postmark doesn't provide this in the dump, so we'll add to the latest day
            const sortedDays = Array.from(dailyMap.keys()).sort()
            if (sortedDays.length > 0) {
              const latestDay = dailyMap.get(sortedDays[sortedDays.length - 1])
              if (latestDay) {
                latestDay.unsubscribed = Math.floor(totalUnsubscribed / sortedDays.length)
              }
            }
          }
        })
      }

      // Calculate delivered = sent - bounced for each day
      dailyMap.forEach((day) => {
        day.delivered = Math.max(0, day.sent - day.bounced)
      })

      // Convert map to array and sort by date
      const daily = Array.from(dailyMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Calculate totals
      const totals = daily.reduce((acc, day) => {
        acc.sent += day.sent
        acc.delivered += day.delivered
        acc.opened += day.opened
        acc.clicked += day.clicked
        acc.bounced += day.bounced
        acc.spam += day.spam
        acc.unsubscribed += day.unsubscribed
        return acc
      }, {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        spam: 0,
        unsubscribed: totalUnsubscribed
      })

      // Create summary
      const summary = {
        sent: totals.sent,
        delivered: totals.delivered,
        opened: totals.opened,
        clicked: totals.clicked,
        bounced: totals.bounced,
        spam: totals.spam,
        unsubscribed: totals.unsubscribed,
        openRate: calculateRate(totals.opened, totals.delivered),
        clickRate: calculateRate(totals.clicked, totals.delivered),
        bounceRate: calculateRate(totals.bounced, totals.sent)
      }

      // Create by tag data (overall for now)
      const byTag = [{
        tag: 'overall',
        ...summary
      }]

      console.log('Final summary:', summary)

      res.status(200).json({
        success: true,
        data: {
          summary,
          byTag,
          daily,
          lastUpdated: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Failed to fetch data from Postmark:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Detailed error:', errorMessage)
      
      if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        return res.status(429).json({ 
          success: false, 
          error: errorMessage,
          rateLimited: true
        })
      }
      
      return res.status(500).json({ 
        success: false, 
        error: `Postmark API error: ${errorMessage}`
      })
    }

  } catch (error) {
    console.error('Stats API error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
} 
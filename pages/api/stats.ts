import type { NextApiRequest, NextApiResponse } from 'next'
import { getPostmarkClient } from '@/lib/postmark'
import { format, subDays } from 'date-fns'

// Remove Prisma for Netlify compatibility - use direct API calls
// const prisma = new PrismaClient()

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { from, to } = req.query
    
    // Default to last 30 days if no dates provided
    const fromDate = from ? new Date(from as string) : subDays(new Date(), 30)
    const toDate = to ? new Date(to as string) : new Date()
    
    const fromDateStr = format(fromDate, 'yyyy-MM-dd')
    const toDateStr = format(toDate, 'yyyy-MM-dd')

    // Get fresh data from Postmark (no caching for serverless)
    const postmark = getPostmarkClient()
    
    try {
      // Get overall stats first
      const overallStats = await postmark.getStatsWithRetry(fromDateStr, toDateStr)
      
      // For now, we'll just show overall stats as one "overall" tag
      // In future, you can enhance this to fetch multiple tags
      const tags = ['overall']
      
      // Process the data
      let totalSent = 0
      let totalDelivered = 0
      let totalOpened = 0
      let totalClicked = 0
      let totalBounced = 0
      let totalSpam = 0
      let totalUnsubscribed = 0

      // Calculate totals from daily data
      overallStats.Days.forEach((day) => {
        totalSent += day.Sent
        totalDelivered += day.Delivered
        totalOpened += day.Opened
        totalClicked += day.Clicked
        totalBounced += day.Bounced
        totalSpam += day.SpamComplaints
        totalUnsubscribed += day.Unsubscribed
      })

      // Create summary
      const summary = {
        sent: totalSent,
        delivered: totalDelivered,
        opened: totalOpened,
        clicked: totalClicked,
        bounced: totalBounced,
        spam: totalSpam,
        unsubscribed: totalUnsubscribed,
        openRate: calculateRate(totalOpened, totalDelivered),
        clickRate: calculateRate(totalClicked, totalDelivered),
        bounceRate: calculateRate(totalBounced, totalSent)
      }

      // Create by tag data (just overall for now)
      const byTag = [{
        tag: 'overall',
        sent: totalSent,
        delivered: totalDelivered,
        opened: totalOpened,
        clicked: totalClicked,
        bounced: totalBounced,
        spam: totalSpam,
        unsubscribed: totalUnsubscribed,
        openRate: calculateRate(totalOpened, totalDelivered),
        clickRate: calculateRate(totalClicked, totalDelivered),
        bounceRate: calculateRate(totalBounced, totalSent)
      }]

      // Create daily data
      const daily = overallStats.Days.map(day => ({
        date: day.Date,
        sent: day.Sent,
        delivered: day.Delivered,
        opened: day.Opened,
        clicked: day.Clicked,
        bounced: day.Bounced,
        spam: day.SpamComplaints,
        unsubscribed: day.Unsubscribed
      }))

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
      
      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('Rate limit')) {
        return res.status(429).json({ 
          success: false, 
          error: error.message,
          rateLimited: true
        })
      }
      
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch data from Postmark API' 
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
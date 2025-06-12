import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getPostmarkClient } from '@/lib/postmark'
import { format, subDays, isAfter, parseISO } from 'date-fns'

const prisma = new PrismaClient()

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
    const { from, to, refresh } = req.query
    
    // Default to last 30 days if no dates provided
    const fromDate = from ? new Date(from as string) : subDays(new Date(), 30)
    const toDate = to ? new Date(to as string) : new Date()
    
    const fromDateStr = format(fromDate, 'yyyy-MM-dd')
    const toDateStr = format(toDate, 'yyyy-MM-dd')

    // Check cache freshness (15 minutes TTL)
    const cacheThreshold = new Date(Date.now() - 15 * 60 * 1000)
    const needsRefresh = refresh === 'true'
    
    const cachedData = await prisma.statSnapshot.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate
        },
        updatedAt: needsRefresh ? undefined : {
          gte: cacheThreshold
        }
      }
    })

    // Determine if we need to fetch fresh data
    const shouldFetchFresh = needsRefresh || cachedData.length === 0 || 
      cachedData.some(record => record.updatedAt < cacheThreshold)

    if (shouldFetchFresh) {
      try {
        // Get fresh data from Postmark
        const postmark = getPostmarkClient()
        
        // Get overall stats
        const overallStats = await postmark.getStatsWithRetry(fromDateStr, toDateStr)
        
        // Get unique tags from existing data (in production, you'd maintain a tag list)
        const existingTags = await prisma.statSnapshot.groupBy({
          by: ['tag'],
          _count: { tag: true }
        })

        const tags = ['overall', ...existingTags.map(t => t.tag).filter(tag => tag !== 'overall')]
        
        // Fetch stats for each tag
        const taggedStatsPromises = tags.map(async (tag) => {
          try {
            if (tag === 'overall') {
              return { tag, stats: overallStats }
            }
            const tagStats = await postmark.getStatsWithRetry(fromDateStr, toDateStr, tag)
            return { tag, stats: tagStats }
          } catch (error) {
            console.error(`Failed to fetch stats for tag ${tag}:`, error)
            return null
          }
        })

        const taggedResults = await Promise.allSettled(taggedStatsPromises)
        
        // Update cache
        const upsertPromises: any[] = []
        
        taggedResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            const { tag, stats } = result.value
            
            stats.Days.forEach((day) => {
              upsertPromises.push(
                prisma.statSnapshot.upsert({
                  where: {
                    tag_date: {
                      tag,
                      date: parseISO(day.Date)
                    }
                  },
                  update: {
                    sent: day.Sent,
                    delivered: day.Delivered,
                    opened: day.Opened,
                    clicked: day.Clicked,
                    bounced: day.Bounced,
                    spam: day.SpamComplaints,
                    unsubscribed: day.Unsubscribed,
                    updatedAt: new Date()
                  },
                  create: {
                    tag,
                    date: parseISO(day.Date),
                    sent: day.Sent,
                    delivered: day.Delivered,
                    opened: day.Opened,
                    clicked: day.Clicked,
                    bounced: day.Bounced,
                    spam: day.SpamComplaints,
                    unsubscribed: day.Unsubscribed
                  }
                })
              )
            })
          }
        })

        await Promise.all(upsertPromises)
        
      } catch (error) {
        console.error('Failed to fetch fresh data from Postmark:', error)
        
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('Rate limit')) {
          return res.status(429).json({ 
            success: false, 
            error: error.message,
            rateLimited: true
          })
        }
        
        // If we have some cached data, use it; otherwise return error
        if (cachedData.length === 0) {
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch data and no cached data available' 
          })
        }
      }
    }

    // Fetch the latest cached data
    const finalData = await prisma.statSnapshot.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate
        }
      },
      orderBy: [
        { tag: 'asc' },
        { date: 'asc' }
      ]
    })

    // Aggregate data
    const summary = finalData.reduce((acc, record) => {
      acc.sent += record.sent
      acc.delivered += record.delivered
      acc.opened += record.opened
      acc.clicked += record.clicked
      acc.bounced += record.bounced
      acc.spam += record.spam
      acc.unsubscribed += record.unsubscribed
      return acc
    }, {
      sent: 0, delivered: 0, opened: 0, clicked: 0, 
      bounced: 0, spam: 0, unsubscribed: 0,
      openRate: 0, clickRate: 0, bounceRate: 0
    })

    // Calculate rates
    summary.openRate = calculateRate(summary.opened, summary.delivered)
    summary.clickRate = calculateRate(summary.clicked, summary.delivered)
    summary.bounceRate = calculateRate(summary.bounced, summary.sent)

    // Group by tag
    const byTagMap = new Map()
    finalData.forEach(record => {
      if (!byTagMap.has(record.tag)) {
        byTagMap.set(record.tag, {
          tag: record.tag,
          sent: 0, delivered: 0, opened: 0, clicked: 0,
          bounced: 0, spam: 0, unsubscribed: 0,
          openRate: 0, clickRate: 0, bounceRate: 0
        })
      }
      
      const tagData = byTagMap.get(record.tag)
      tagData.sent += record.sent
      tagData.delivered += record.delivered
      tagData.opened += record.opened
      tagData.clicked += record.clicked
      tagData.bounced += record.bounced
      tagData.spam += record.spam
      tagData.unsubscribed += record.unsubscribed
    })

    const byTag = Array.from(byTagMap.values()).map(tagData => ({
      ...tagData,
      openRate: calculateRate(tagData.opened, tagData.delivered),
      clickRate: calculateRate(tagData.clicked, tagData.delivered),
      bounceRate: calculateRate(tagData.bounced, tagData.sent)
    }))

    // Group by date
    const dailyMap = new Map()
    finalData.forEach(record => {
      const dateKey = format(record.date, 'yyyy-MM-dd')
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          sent: 0, delivered: 0, opened: 0, clicked: 0,
          bounced: 0, spam: 0, unsubscribed: 0
        })
      }
      
      const dailyData = dailyMap.get(dateKey)
      dailyData.sent += record.sent
      dailyData.delivered += record.delivered
      dailyData.opened += record.opened
      dailyData.clicked += record.clicked
      dailyData.bounced += record.bounced
      dailyData.spam += record.spam
      dailyData.unsubscribed += record.unsubscribed
    })

    const daily = Array.from(dailyMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const lastUpdated = finalData.length > 0 
      ? Math.max(...finalData.map(r => r.updatedAt.getTime()))
      : Date.now()

    res.status(200).json({
      success: true,
      data: {
        summary,
        byTag,
        daily,
        lastUpdated: new Date(lastUpdated).toISOString()
      }
    })

  } catch (error) {
    console.error('Stats API error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    })
  } finally {
    await prisma.$disconnect()
  }
} 
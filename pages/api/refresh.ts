import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getPostmarkClient } from '@/lib/postmark'
import { format, subDays, parseISO } from 'date-fns'

const prisma = new PrismaClient()

export interface RefreshResponse {
  success: boolean
  message?: string
  error?: string
  rateLimited?: boolean
  recordsUpdated?: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RefreshResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { from, to, tags } = req.body
    
    // Default to last 30 days if no dates provided
    const fromDate = from ? new Date(from) : subDays(new Date(), 30)
    const toDate = to ? new Date(to) : new Date()
    
    const fromDateStr = format(fromDate, 'yyyy-MM-dd')
    const toDateStr = format(toDate, 'yyyy-MM-dd')

    const postmark = getPostmarkClient()
    
    // If specific tags provided, use them; otherwise get all tags from existing data
    let tagsToUpdate: string[] = []
    
    if (tags && Array.isArray(tags)) {
      tagsToUpdate = tags
    } else {
      // Get existing tags from database
      const existingTags = await prisma.statSnapshot.groupBy({
        by: ['tag'],
        _count: { tag: true }
      })
      tagsToUpdate = ['overall', ...existingTags.map(t => t.tag).filter(tag => tag !== 'overall')]
    }

    if (tagsToUpdate.length === 0) {
      tagsToUpdate = ['overall'] // At minimum, get overall stats
    }

    let recordsUpdated = 0
    const errors: string[] = []

    // Fetch stats for each tag
    for (const tag of tagsToUpdate) {
      try {
        let stats
        if (tag === 'overall') {
          stats = await postmark.getStatsWithRetry(fromDateStr, toDateStr)
        } else {
          stats = await postmark.getStatsWithRetry(fromDateStr, toDateStr, tag)
        }

        // Update cache for this tag
        for (const day of stats.Days) {
          await prisma.statSnapshot.upsert({
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
          recordsUpdated++
        }

        // Add a small delay between tag requests to be respectful of rate limits
        if (tagsToUpdate.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Tag "${tag}": ${errorMessage}`)
        
        // If it's a rate limit error, stop processing and return immediately
        if (errorMessage.includes('Rate limit')) {
          return res.status(429).json({
            success: false,
            error: 'Rate limited while refreshing data',
            rateLimited: true
          })
        }
      }
    }

    if (errors.length > 0) {
      return res.status(207).json({
        success: true,
        message: `Partially updated ${recordsUpdated} records. Some tags failed: ${errors.join(', ')}`,
        recordsUpdated
      })
    }

    res.status(200).json({
      success: true,
      message: `Successfully refreshed ${recordsUpdated} records for ${tagsToUpdate.length} tags`,
      recordsUpdated
    })

  } catch (error) {
    console.error('Refresh API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    if (errorMessage.includes('Rate limit')) {
      return res.status(429).json({
        success: false,
        error: errorMessage,
        rateLimited: true
      })
    }

    res.status(500).json({ 
      success: false, 
      error: errorMessage
    })
  } finally {
    await prisma.$disconnect()
  }
} 
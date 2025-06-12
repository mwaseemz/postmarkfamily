import type { NextApiRequest, NextApiResponse } from 'next'
import { getPostmarkClient } from '@/lib/postmark'
import { format, subDays } from 'date-fns'

export interface RefreshResponse {
  success: boolean
  message?: string
  error?: string
  rateLimited?: boolean
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RefreshResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { from, to } = req.body
    
    // Default to last 30 days if no dates provided
    const fromDate = from ? new Date(from) : subDays(new Date(), 30)
    const toDate = to ? new Date(to) : new Date()
    
    const fromDateStr = format(fromDate, 'yyyy-MM-dd')
    const toDateStr = format(toDate, 'yyyy-MM-dd')

    const postmark = getPostmarkClient()
    
    try {
      // Test the connection by fetching overall stats
      const stats = await postmark.getStatsWithRetry(fromDateStr, toDateStr)
      
      res.status(200).json({
        success: true,
        message: `Successfully refreshed data for ${stats.Days.length} days`
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // If it's a rate limit error, return appropriate response
      if (errorMessage.includes('Rate limit')) {
        return res.status(429).json({
          success: false,
          error: 'Rate limited while refreshing data',
          rateLimited: true
        })
      }

      return res.status(500).json({
        success: false,
        error: `Failed to refresh data: ${errorMessage}`
      })
    }

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
  }
} 
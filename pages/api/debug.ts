import type { NextApiRequest, NextApiResponse } from 'next'
import { format, subDays } from 'date-fns'

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
  res: NextApiResponse
) {
  try {
    const toDate = new Date()
    const fromDate = subDays(toDate, 30)
    const fromDateStr = format(fromDate, 'yyyy-MM-dd')
    const toDateStr = format(toDate, 'yyyy-MM-dd')
    const baseParams = `?fromdate=${fromDateStr}&todate=${toDateStr}`

    console.log(`Debug: Fetching from ${fromDateStr} to ${toDateStr}`)

    // Test different endpoints
    const [overview, sends, bounces] = await Promise.all([
      makePostmarkRequest(`/stats/outbound${baseParams}`),
      makePostmarkRequest(`/stats/outbound/sends${baseParams}`),
      makePostmarkRequest(`/stats/outbound/bounces${baseParams}`)
    ])

    res.json({
      dateRange: `${fromDateStr} to ${toDateStr}`,
      overview: {
        sent: overview.Sent,
        bounced: overview.Bounced,
        bounceRate: overview.BounceRate,
        spamComplaints: overview.SpamComplaints,
        opens: overview.Opens,
        uniqueOpens: overview.UniqueOpens,
        totalClicks: overview.TotalClicks,
        uniqueLinksClicked: overview.UniqueLinksClicked
      },
      sends: {
        totalSent: sends.Sent,
        dailyCount: sends.Days?.length || 0
      },
      bounces: {
        hardBounce: bounces.HardBounce,
        softBounce: bounces.SoftBounce,
        transient: bounces.Transient,
        smtpApiError: bounces.SMTPApiError,
        total: (bounces.HardBounce || 0) + (bounces.SoftBounce || 0) + (bounces.Transient || 0) + (bounces.SMTPApiError || 0),
        dailyCount: bounces.Days?.length || 0
      }
    })
  } catch (error) {
    console.error('Debug API error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
} 
import { z } from 'zod'

// Alternative Postmark API client using multiple endpoints
export class PostmarkMultiAPI {
  private baseUrl = 'https://api.postmarkapp.com'
  private serverToken: string

  constructor(serverToken: string) {
    if (!serverToken) {
      throw new Error('Postmark server token is required')
    }
    this.serverToken = serverToken
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'X-Postmark-Server-Token': this.serverToken
      }
    })

    if (!response.ok) {
      throw new Error(`Postmark API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getCompleteStats(fromDate: string, toDate: string, tag?: string): Promise<any> {
    const baseParams = `?fromdate=${fromDate}&todate=${toDate}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`
    
    try {
      // Call multiple endpoints in parallel according to Postmark API docs
      const [
        sentStats,
        bounceStats, 
        spamStats,
        openStats,
        clickStats
      ] = await Promise.all([
        this.makeRequest(`/stats/outbound/sends${baseParams}`),
        this.makeRequest(`/stats/outbound/bounces${baseParams}`),
        this.makeRequest(`/stats/outbound/spam${baseParams}`),
        this.makeRequest(`/stats/outbound/opens${baseParams}`),
        this.makeRequest(`/stats/outbound/clicks${baseParams}`)
      ])

      console.log('Sent stats:', sentStats)
      console.log('Bounce stats:', bounceStats)
      console.log('Spam stats:', spamStats)
      console.log('Open stats:', openStats)
      console.log('Click stats:', clickStats)

      // Combine all the data
      const combinedData = {
        Sent: sentStats.Sent || 0,
        Delivered: (sentStats.Sent || 0) - (bounceStats.HardBounce || 0) - (bounceStats.SoftBounce || 0) - (bounceStats.Transient || 0),
        Opened: openStats.Opens || 0,
        Clicked: clickStats.Clicks || 0,
        Bounced: (bounceStats.HardBounce || 0) + (bounceStats.SoftBounce || 0) + (bounceStats.Transient || 0),
        SpamComplaints: spamStats.SpamComplaint || 0,
        Unsubscribed: 0 // Would need subscription API
      }

      // Create daily format
      return {
        Days: [{
          Date: toDate,
          ...combinedData
        }]
      }

    } catch (error) {
      console.error('Error fetching multiple stats:', error)
      throw error
    }
  }
}

export function getPostmarkMultiClient(): PostmarkMultiAPI {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN
  
  if (!serverToken) {
    throw new Error('POSTMARK_SERVER_TOKEN environment variable is not set')
  }

  return new PostmarkMultiAPI(serverToken)
} 
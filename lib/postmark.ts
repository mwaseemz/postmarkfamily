import { z } from 'zod'

// Postmark API Types
export const PostmarkStatsSchema = z.object({
  Sent: z.number(),
  Delivered: z.number(),
  Opened: z.number(),
  Clicked: z.number(),
  Bounced: z.number(),
  SpamComplaints: z.number(),
  Unsubscribed: z.number()
})

export const PostmarkStatsResponseSchema = z.object({
  Days: z.array(z.object({
    Date: z.string(),
    Sent: z.number(),
    Delivered: z.number(),
    Opened: z.number(),
    Clicked: z.number(),
    Bounced: z.number(),
    SpamComplaints: z.number(),
    Unsubscribed: z.number()
  }))
})

export const PostmarkErrorSchema = z.object({
  ErrorCode: z.number(),
  Message: z.string()
})

export type PostmarkStats = z.infer<typeof PostmarkStatsSchema>
export type PostmarkStatsResponse = z.infer<typeof PostmarkStatsResponseSchema>
export type PostmarkError = z.infer<typeof PostmarkErrorSchema>

export interface TaggedStats extends PostmarkStats {
  tag: string
  date: string
}

// Rate limiting state
interface RateLimitState {
  requests: number
  windowStart: number
  backoffUntil?: number
}

class PostmarkAPI {
  private baseUrl = 'https://api.postmarkapp.com'
  private serverToken: string
  private rateLimitState: RateLimitState = {
    requests: 0,
    windowStart: Date.now()
  }

  // Rate limiting configuration
  private readonly maxRequestsPerWindow = parseInt(process.env.POSTMARK_RATE_LIMIT_REQUESTS || '500')
  private readonly windowMs = parseInt(process.env.POSTMARK_RATE_LIMIT_WINDOW_MS || '60000')
  private readonly maxRetries = 3
  private readonly baseBackoffMs = 1000

  constructor(serverToken: string) {
    if (!serverToken) {
      throw new Error('Postmark server token is required')
    }
    this.serverToken = serverToken
  }

  private async makeRequest<T>(endpoint: string, schema: z.ZodSchema<T>): Promise<T> {
    await this.checkRateLimit()

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'X-Postmark-Server-Token': this.serverToken
      }
    })

    this.updateRateLimitState()

    if (!response.ok) {
      const errorText = await response.text()
      let error: PostmarkError
      
      try {
        error = PostmarkErrorSchema.parse(JSON.parse(errorText))
      } catch {
        error = { ErrorCode: response.status, Message: errorText || response.statusText }
      }

      if (response.status === 429) {
        await this.handleRateLimit()
        throw new Error(`Rate limited: ${error.Message}`)
      }

      throw new Error(`Postmark API error: ${error.Message} (${error.ErrorCode})`)
    }

    const data = await response.json()
    return schema.parse(data)
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now()

    // Check if we're in a backoff period
    if (this.rateLimitState.backoffUntil && now < this.rateLimitState.backoffUntil) {
      const waitTime = this.rateLimitState.backoffUntil - now
      throw new Error(`Rate limited, wait ${Math.ceil(waitTime / 1000)} seconds`)
    }

    // Reset window if needed
    if (now - this.rateLimitState.windowStart >= this.windowMs) {
      this.rateLimitState.requests = 0
      this.rateLimitState.windowStart = now
    }

    // Check if we've hit the limit
    if (this.rateLimitState.requests >= this.maxRequestsPerWindow) {
      const waitTime = this.windowMs - (now - this.rateLimitState.windowStart)
      throw new Error(`Rate limit exceeded, wait ${Math.ceil(waitTime / 1000)} seconds`)
    }
  }

  private updateRateLimitState(): void {
    this.rateLimitState.requests++
  }

  private async handleRateLimit(): Promise<void> {
    const backoffTime = this.baseBackoffMs * Math.pow(2, Math.min(this.rateLimitState.requests, 5))
    this.rateLimitState.backoffUntil = Date.now() + backoffTime
  }

  async getStats(fromDate: string, toDate: string, tag?: string): Promise<PostmarkStatsResponse> {
    await this.checkRateLimit()

    let endpoint = `/stats/outbound?fromdate=${fromDate}&todate=${toDate}`
    if (tag) {
      endpoint += `&tag=${encodeURIComponent(tag)}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'X-Postmark-Server-Token': this.serverToken
      }
    })

    this.updateRateLimitState()

    if (!response.ok) {
      if (response.status === 429) {
        await this.handleRateLimit()
        throw new Error(`Rate limited: ${response.statusText}`)
      }
      throw new Error(`Postmark API error: ${response.status} ${response.statusText}`)
    }

    const rawData = await response.json()
    console.log('Raw Postmark response:', JSON.stringify(rawData, null, 2))

    // Try to parse with schema, but handle the case where it might be different
    try {
      return PostmarkStatsResponseSchema.parse(rawData)
    } catch (parseError) {
      console.error('Schema parse error:', parseError)
      
      // If the response doesn't have Days, create a compatible structure
      if (!rawData.Days) {
        // Create a single day entry from the aggregate data
        const singleDay = {
          Date: toDate,
          Sent: rawData.Sent || 0,
          Delivered: rawData.Delivered || 0,
          Opened: rawData.Opened || 0,
          Clicked: rawData.Clicked || 0,
          Bounced: rawData.Bounced || 0,
          SpamComplaints: rawData.SpamComplaints || 0,
          Unsubscribed: rawData.Unsubscribed || 0
        }
        
        return { Days: [singleDay] }
      }
      
      throw parseError
    }
  }

  async getStatsWithRetry(fromDate: string, toDate: string, tag?: string, retries = 0): Promise<PostmarkStatsResponse> {
    try {
      return await this.getStats(fromDate, toDate, tag)
    } catch (error) {
      if (retries < this.maxRetries && error instanceof Error) {
        const isRateLimit = error.message.includes('Rate limit')
        const isServerError = error.message.includes('5')
        
        if (isRateLimit || isServerError) {
          const backoffTime = this.baseBackoffMs * Math.pow(2, retries)
          await new Promise(resolve => setTimeout(resolve, backoffTime))
          return this.getStatsWithRetry(fromDate, toDate, tag, retries + 1)
        }
      }
      throw error
    }
  }

  // Helper method to get all available tags (requires iterating through messages or maintaining a tag list)
  async getAllTags(): Promise<string[]> {
    // In a real implementation, you might need to maintain a list of tags
    // or iterate through message events to discover tags
    // For now, return empty array - this can be enhanced later
    return []
  }
}

// Singleton instance
let postmarkInstance: PostmarkAPI | null = null

export function getPostmarkClient(): PostmarkAPI {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN
  
  if (!serverToken) {
    throw new Error('POSTMARK_SERVER_TOKEN environment variable is not set')
  }

  if (!postmarkInstance) {
    postmarkInstance = new PostmarkAPI(serverToken)
  }

  return postmarkInstance
}

export default PostmarkAPI 
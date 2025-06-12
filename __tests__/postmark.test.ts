import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PostmarkAPI, { getPostmarkClient } from '@/lib/postmark'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('PostmarkAPI', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with valid token', () => {
      const api = new PostmarkAPI('valid-token')
      expect(api).toBeInstanceOf(PostmarkAPI)
    })

    it('should throw error with invalid token', () => {
      expect(() => new PostmarkAPI('')).toThrow('Postmark server token is required')
    })
  })

  describe('getStats', () => {
    let api: PostmarkAPI

    beforeEach(() => {
      api = new PostmarkAPI('test-token')
    })

    it('should fetch stats successfully', async () => {
      const mockResponse = {
        Days: [
          {
            Date: '2023-01-01',
            Sent: 100,
            Delivered: 95,
            Opened: 30,
            Clicked: 10,
            Bounced: 5,
            SpamComplaints: 0,
            Unsubscribed: 1
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await api.getStats('2023-01-01', '2023-01-01')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.postmarkapp.com/stats/outbound?fromdate=2023-01-01&todate=2023-01-01',
        {
          headers: {
            'Accept': 'application/json',
            'X-Postmark-Server-Token': 'test-token'
          }
        }
      )
      
      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors', async () => {
      const errorResponse = {
        ErrorCode: 422,
        Message: 'Invalid date range'
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: () => Promise.resolve(JSON.stringify(errorResponse))
      })

      await expect(api.getStats('invalid', 'dates')).rejects.toThrow(
        'Postmark API error: Invalid date range (422)'
      )
    })
  })
}) 
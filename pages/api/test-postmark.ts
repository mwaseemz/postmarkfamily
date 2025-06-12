import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check environment variable
    const token = process.env.POSTMARK_SERVER_TOKEN
    if (!token) {
      return res.status(200).json({
        success: false,
        error: 'POSTMARK_SERVER_TOKEN environment variable not set',
        hasToken: false
      })
    }

    // Test basic fetch to Postmark
    const response = await fetch('https://api.postmarkapp.com/server', {
      headers: {
        'Accept': 'application/json',
        'X-Postmark-Server-Token': token
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(200).json({
        success: false,
        error: `Postmark API returned ${response.status}: ${errorText}`,
        hasToken: true,
        tokenLength: token.length,
        tokenStart: token.substring(0, 8) + '...'
      })
    }

    const data = await response.json()
    
    return res.status(200).json({
      success: true,
      message: 'Postmark connection successful',
      hasToken: true,
      tokenLength: token.length,
      tokenStart: token.substring(0, 8) + '...',
      serverInfo: data.Name || 'Unknown server'
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return res.status(200).json({
      success: false,
      error: `Network error: ${errorMessage}`,
      hasToken: !!process.env.POSTMARK_SERVER_TOKEN
    })
  }
} 
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const serverToken = process.env.POSTMARK_SERVER_TOKEN
    
    if (!serverToken) {
      return NextResponse.json({ error: 'POSTMARK_SERVER_TOKEN not configured' }, { status: 500 })
    }

    console.log('Testing Postmark API with server token:', serverToken.substring(0, 10) + '...')

    // Test the basic connectivity first
    const testUrl = 'https://api.postmarkapp.com/stats/outbound?fromdate=2024-01-01&todate=2024-12-31'
    console.log('Making request to:', testUrl)

    const response = await fetch(testUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Postmark-Server-Token': serverToken
      }
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      return NextResponse.json({ 
        error: `API request failed: ${response.status} ${response.statusText}`,
        details: errorText,
        url: testUrl
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('Success response:', data)

    return NextResponse.json({
      status: 'success',
      endpoint: testUrl,
      responseStatus: response.status,
      data: data
    })

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
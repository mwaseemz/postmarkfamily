import type { NextApiRequest, NextApiResponse } from 'next'

interface TestResponse {
  success: boolean
  message: string
  timestamp: string
  environment: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  res.status(200).json({
    success: true,
    message: 'API routes are working correctly!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown'
  })
} 
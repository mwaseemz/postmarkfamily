import { NextApiRequest, NextApiResponse } from 'next';
import { ThriveCartService } from '@/lib/thrivecart';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const service = ThriveCartService.getInstance();
    const forceRefresh = req.method === 'POST';
    
    const stats = await service.fetchData(forceRefresh);
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error in ThriveCart API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ThriveCart data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
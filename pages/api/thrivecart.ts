import { NextApiRequest, NextApiResponse } from 'next';
import { ThriveCartService, DateRange } from '@/lib/thrivecart';
import { format, subDays } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const service = ThriveCartService.getInstance();
    const forceRefresh = req.method === 'POST';
    
    // Parse query parameters for date filtering
    const { days, from, to } = req.query;
    
    let dateRange: DateRange | undefined;
    
    if (from && to) {
      // Custom date range
      dateRange = {
        from: from as string,
        to: to as string
      };
    } else if (days) {
      // Preset days range
      const daysNum = parseInt(days as string);
      const toDate = new Date();
      const fromDate = subDays(toDate, daysNum);
      
      dateRange = {
        from: format(fromDate, 'yyyy-MM-dd'),
        to: format(toDate, 'yyyy-MM-dd')
      };
    }
    // If no date parameters, fetch all data (dateRange remains undefined)
    
    const stats = await service.fetchData(forceRefresh, dateRange);
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error in ThriveCart API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ThriveCart data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
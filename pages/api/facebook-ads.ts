import { NextApiRequest, NextApiResponse } from 'next';
import { FacebookAdsService, DateRange } from '@/lib/facebook-ads';
import { format, subDays } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get Facebook access token from environment or request headers
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || req.headers['x-facebook-token'] as string;
    
    if (!accessToken) {
      return res.status(400).json({ 
        error: 'Facebook access token is required',
        message: 'Please provide FACEBOOK_ACCESS_TOKEN in environment variables or x-facebook-token header'
      });
    }

    const service = FacebookAdsService.getInstance(accessToken);
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
    // If no date parameters, fetch default data (last 30 days)
    try {
      const stats = await service.fetchData(forceRefresh, dateRange);
      res.status(200).json(stats);
    } catch (fbError) {
      console.error('Facebook API error:', fbError);
      res.status(500).json({
        error: 'Failed to fetch Facebook Ads data',
        message: fbError instanceof Error ? fbError.message : String(fbError)
      });
    }
  } catch (error) {
    console.error('Error in Facebook Ads API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Facebook Ads data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
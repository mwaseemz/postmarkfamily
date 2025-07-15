import { NextApiRequest, NextApiResponse } from 'next';
import { FacebookAdsService, DateRange } from '@/lib/facebook-ads';
import { format, subDays } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get Facebook access token from environment or request headers
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || req.headers['x-facebook-token'] as string;
    
    // Debug logging (remove in production)
    console.log('🔍 Facebook API Debug:');
    console.log('- Environment token exists:', !!process.env.FACEBOOK_ACCESS_TOKEN);
    console.log('- Header token exists:', !!req.headers['x-facebook-token']);
    console.log('- Token length:', accessToken ? accessToken.length : 0);
    console.log('- Token prefix:', accessToken ? accessToken.substring(0, 10) + '...' : 'none');
    
    if (!accessToken) {
      return res.status(400).json({ 
        error: 'Facebook access token is required',
        message: 'Please provide FACEBOOK_ACCESS_TOKEN in environment variables or x-facebook-token header. See FACEBOOK_SETUP.md for detailed instructions.'
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
      
      // Provide specific guidance for common errors
      let errorMessage = fbError instanceof Error ? fbError.message : String(fbError);
      let statusCode = 500;
      
      if (errorMessage.includes('access token could not be decrypted') || errorMessage.includes('code":190')) {
        statusCode = 401;
        errorMessage = 'Facebook access token is invalid or expired. Please generate a new token from https://developers.facebook.com/tools/explorer/ and update your environment variable.';
      } else if (errorMessage.includes('No ad accounts found')) {
        statusCode = 403;
        errorMessage = 'No ad accounts found for this user. The token must belong to a user with access to Facebook ad accounts.';
      }
      
      res.status(statusCode).json({
        error: 'Failed to fetch Facebook Ads data',
        message: errorMessage,
        setupGuide: 'See FACEBOOK_SETUP.md for detailed setup instructions'
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
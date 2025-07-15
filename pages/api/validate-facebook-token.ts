import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || req.headers['x-facebook-token'] as string;
    
    if (!accessToken) {
      return res.status(400).json({ 
        error: 'No token provided',
        message: 'Please provide a Facebook access token'
      });
    }

    console.log('🔍 Token Validation Debug:');
    console.log('- Token length:', accessToken.length);
    console.log('- Token prefix:', accessToken.substring(0, 15) + '...');
    console.log('- Environment token:', !!process.env.FACEBOOK_ACCESS_TOKEN ? 'SET' : 'NOT SET');

    // Test the token by calling Facebook's debug endpoint
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    
    const debugResponse = await fetch(debugUrl);
    const debugData = await debugResponse.json();
    
    console.log('📊 Facebook Debug Response:', JSON.stringify(debugData, null, 2));

    if (debugData.error) {
      return res.status(400).json({
        error: 'Token validation failed',
        facebookError: debugData.error,
        message: debugData.error.message,
        suggestion: 'Please generate a new token from https://developers.facebook.com/tools/explorer/'
      });
    }

    // Test ad accounts access
    const adAccountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}&fields=id,name,account_status`;
    
    const adAccountsResponse = await fetch(adAccountsUrl);
    const adAccountsData = await adAccountsResponse.json();
    
    console.log('📋 Ad Accounts Response:', JSON.stringify(adAccountsData, null, 2));

    return res.status(200).json({
      success: true,
      tokenInfo: debugData.data,
      adAccounts: adAccountsData,
      message: 'Token validation complete'
    });

  } catch (error) {
    console.error('❌ Token validation error:', error);
    return res.status(500).json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
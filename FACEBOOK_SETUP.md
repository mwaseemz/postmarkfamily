# Facebook Ads Integration Setup Guide

## Current Issue
The error "The access token could not be decrypted" (code 190) indicates that your Facebook access token is invalid or has expired.

## How to Fix This

### Step 1: Get a New Facebook Access Token

1. **Go to Facebook Graph API Explorer**: https://developers.facebook.com/tools/explorer/

2. **Select your app** (or create a new one if needed)

3. **Add Required Permissions**:
   - `ads_read` - Required to read ad account data
   - `read_insights` - Required to read ad performance data
   - `ads_management` - Optional, for more detailed data

4. **Generate Access Token**: Click "Generate Access Token"

5. **Copy the token**: The token will look like: `EAAi0V09Ebq0BPPg4ufX903P4c8WoZCPhUhTjllPvOZBVurz7qG9Ys0DGVpmZCd3nXzf8eQN8CzoQ4zVEZBCgbcZCu5WhcqzeBZBHlZAhDCisEyT2rLwHWE8ZCtq7DQWXRvDAcK56P15Rj0NHuGt62zoXCF77SpUMKgps7ZBJZA7eZCi0DZAjQUEpG2y0mWTxaM1zH5XXBgb7NMaCzM4NuH7XzCkZD`

### Step 2: Set Up Environment Variable

#### For Local Development:
1. Create a `.env.local` file in your project root
2. Add your token:
   ```
   FACEBOOK_ACCESS_TOKEN=your_new_token_here
   ```

#### For Netlify Deployment:
1. Go to your Netlify dashboard
2. Navigate to Site Settings > Environment Variables
3. Add a new variable:
   - Key: `FACEBOOK_ACCESS_TOKEN`
   - Value: Your new Facebook access token

### Step 3: Verify Token Permissions

Make sure the token belongs to a user who has access to Facebook ad accounts with active data.

1. **Check Ad Account Access**: The user must have access to at least one ad account
2. **Verify Data Availability**: The ad account must have active campaigns with data in the selected date range
3. **Test Token**: Use the Graph API Explorer to test your token with this endpoint:
   ```
   GET /me/adaccounts
   ```

### Step 4: Common Issues and Solutions

#### Issue: "No ad accounts found"
**Solution**: The token user doesn't have access to any ad accounts. Ask your client to:
- Add you as an admin to their Facebook ad account, OR
- Provide a token from a user who has ad account access

#### Issue: "Token expired"
**Solution**: Facebook tokens expire. You need to:
- Generate a new token from Graph API Explorer
- Update your environment variable
- Consider using a long-lived token or implementing token refresh

#### Issue: "Insufficient permissions"
**Solution**: Make sure your token has all required permissions:
- `ads_read`
- `read_insights`

### Step 5: Testing Your Setup

1. **Restart your development server** (if running locally)
2. **Refresh your dashboard**
3. **Check the debug info** - it should show:
   - Ad Accounts Found: > 0
   - Data Points: > 0
   - No errors

### Step 6: For Production (Netlify)

After setting the environment variable in Netlify:
1. Trigger a new deployment
2. The dashboard should now show Facebook data

## Security Notes

- **Never commit tokens to version control**
- **Use environment variables for all sensitive data**
- **Rotate tokens regularly**
- **Use the minimum required permissions**

## Need Help?

If you're still having issues:
1. Check the browser console for detailed error messages
2. Verify your token in the Graph API Explorer
3. Ensure you have ad account access
4. Contact your Facebook ad account administrator 
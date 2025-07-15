import { format, subDays, parseISO } from 'date-fns';

export interface FacebookAdsMetrics {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  reach: number;
  frequency: number;
  cpp: number; // Cost per purchase
  purchases: number;
  purchaseValue: number;
  leads: number;
  costPerLead: number;
  linkClicks: number;
  costPerClick: number;
}

export interface FacebookCampaignData {
  campaignId: string;
  campaignName: string;
  adsetId?: string;
  adsetName?: string;
  adId?: string;
  adName?: string;
  metrics: FacebookAdsMetrics;
}

export interface FacebookAdsStats {
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalLeads: number;
  totalPurchases: number;
  totalPurchaseValue: number;
  averageCtr: number;
  averageCpc: number;
  averageCostPerLead: number;
  averageCostPerPurchase: number;
  dailyStats: FacebookAdsMetrics[];
  campaignStats: FacebookCampaignData[];
  timeRange: string;
  lastUpdated: string;
  debug?: {
    adAccountsFound: number;
    insightsDataPoints: number;
    apiErrors?: string[];
  };
}

export interface DateRange {
  from: string;
  to: string;
}

export class FacebookAdsService {
  private static instance: FacebookAdsService;
  private cache: Map<string, { data: FacebookAdsStats; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';
  private accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error('Facebook access token is required');
    }
    this.accessToken = accessToken;
  }

  static getInstance(accessToken?: string): FacebookAdsService {
    if (!FacebookAdsService.instance && accessToken) {
      FacebookAdsService.instance = new FacebookAdsService(accessToken);
    } else if (!FacebookAdsService.instance) {
      throw new Error('FacebookAdsService requires access token for initialization');
    }
    return FacebookAdsService.instance;
  }

  async fetchData(forceRefresh = false, dateRange?: DateRange): Promise<FacebookAdsStats> {
    const now = Date.now();
    
    // Create cache key based on date range
    const cacheKey = dateRange ? `${dateRange.from}-${dateRange.to}` : 'all';
    const cached = this.cache.get(cacheKey);
    
    if (!forceRefresh && cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    const debug: { adAccountsFound: number; insightsDataPoints: number; apiErrors?: string[] } = {
      adAccountsFound: 0,
      insightsDataPoints: 0,
      apiErrors: []
    };

    try {
      console.log('🔍 Fetching Facebook Ads data...');
      
      // Get user's ad accounts
      const adAccounts = await this.getAdAccounts();
      debug.adAccountsFound = adAccounts.length;
      
      console.log(`📊 Found ${adAccounts.length} ad accounts`);
      
      if (adAccounts.length === 0) {
        throw new Error('No ad accounts found for this user. Make sure the access token is for a user with ad account access.');
      }

      // Use the first ad account for now
      const adAccountId = adAccounts[0].id;
      console.log(`🎯 Using ad account: ${adAccountId}`);
      
      // Fetch insights data
      const insights = await this.getAdAccountInsights(adAccountId, dateRange);
      debug.insightsDataPoints = insights.length;
      
      console.log(`📈 Found ${insights.length} data points`);
      
      const stats = this.calculateStats(insights, dateRange, debug);
      
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: now
      });

      return stats;
    } catch (error) {
      console.error('❌ Error fetching Facebook Ads data:', error);
      debug.apiErrors?.push(error instanceof Error ? error.message : String(error));
      
      // Return cached data if available, otherwise return empty stats
      if (cached) {
        console.log('🔄 Returning cached data due to error');
        return cached.data;
      }
      
      return this.getEmptyStats(dateRange, debug);
    }
  }

  private async getAdAccounts(): Promise<any[]> {
    const url = `${this.baseUrl}/me/adaccounts?access_token=${this.accessToken}&fields=id,name,account_status`;
    
    console.log('🔗 Fetching ad accounts from:', url.replace(this.accessToken, '[TOKEN]'));
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ad accounts API error:', response.status, errorText);
      throw new Error(`Failed to fetch ad accounts: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📋 Ad accounts response:', JSON.stringify(data, null, 2));
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }
    
    return data.data || [];
  }

  private async getAdAccountInsights(adAccountId: string, dateRange?: DateRange): Promise<any[]> {
    const fields = [
      'date_start',
      'date_stop',
      'spend',
      'impressions',
      'clicks',
      'ctr',
      'cpc',
      'reach',
      'frequency',
      'actions',
      'action_values',
      'cost_per_action_type'
    ].join(',');

    let timeRange = '';
    if (dateRange) {
      timeRange = `&time_range={'since':'${dateRange.from}','until':'${dateRange.to}'}`;
    } else {
      // Default to last 30 days
      const toDate = new Date();
      const fromDate = subDays(toDate, 30);
      timeRange = `&time_range={'since':'${format(fromDate, 'yyyy-MM-dd')}','until':'${format(toDate, 'yyyy-MM-dd')}'}`;
    }

    const url = `${this.baseUrl}/${adAccountId}/insights?access_token=${this.accessToken}&fields=${fields}&time_increment=1&level=account${timeRange}`;
    
    console.log('🔗 Fetching insights from:', url.replace(this.accessToken, '[TOKEN]'));
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Insights API error:', response.status, errorText);
      throw new Error(`Failed to fetch insights: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📊 Insights response:', JSON.stringify(data, null, 2));
    
    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }
    
    return data.data || [];
  }

  private calculateStats(insights: any[], dateRange?: DateRange, debug?: any): FacebookAdsStats {
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalLeads = 0;
    let totalPurchases = 0;
    let totalPurchaseValue = 0;

    const dailyStats: FacebookAdsMetrics[] = insights.map(insight => {
      const spend = parseFloat(insight.spend || '0');
      const clicks = parseInt(insight.clicks || '0');
      const impressions = parseInt(insight.impressions || '0');
      const ctr = parseFloat(insight.ctr || '0');
      const cpc = parseFloat(insight.cpc || '0');
      const reach = parseInt(insight.reach || '0');
      const frequency = parseFloat(insight.frequency || '0');

      // Extract leads from actions
      const leads = this.extractActionValue(insight.actions, 'lead');
      const purchases = this.extractActionValue(insight.actions, 'purchase');
      const purchaseValue = this.extractActionValue(insight.action_values, 'purchase');

      // Extract cost per actions
      const costPerLead = this.extractCostPerAction(insight.cost_per_action_type, 'lead');
      const costPerClick = parseFloat(insight.cpc || '0');

      // Update totals
      totalSpend += spend;
      totalClicks += clicks;
      totalImpressions += impressions;
      totalLeads += leads;
      totalPurchases += purchases;
      totalPurchaseValue += purchaseValue;

      return {
        date: insight.date_start,
        spend,
        impressions,
        clicks,
        ctr,
        cpc,
        reach,
        frequency,
        cpp: purchases > 0 ? spend / purchases : 0,
        purchases,
        purchaseValue,
        leads,
        costPerLead,
        linkClicks: clicks, // Facebook API doesn't separate link clicks in basic insights
        costPerClick
      };
    });

    // Calculate averages
    const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const averageCostPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const averageCostPerPurchase = totalPurchases > 0 ? totalSpend / totalPurchases : 0;

    // Generate time range string
    let timeRange = 'Last 30 days';
    if (dateRange) {
      timeRange = `${format(parseISO(dateRange.from), 'MMM d, yyyy')} to ${format(parseISO(dateRange.to), 'MMM d, yyyy')}`;
    }

    console.log(`💰 Calculated totals: $${totalSpend} spend, ${totalClicks} clicks, ${totalLeads} leads`);

    return {
      totalSpend,
      totalClicks,
      totalImpressions,
      totalLeads,
      totalPurchases,
      totalPurchaseValue,
      averageCtr,
      averageCpc,
      averageCostPerLead,
      averageCostPerPurchase,
      dailyStats: dailyStats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      campaignStats: [], // Would need separate API call for campaign-level data
      timeRange,
      lastUpdated: new Date().toISOString(),
      debug
    };
  }

  private extractActionValue(actions: any[], actionType: string): number {
    if (!actions || !Array.isArray(actions)) return 0;
    
    const action = actions.find(a => a.action_type === actionType);
    return action ? parseInt(action.value || '0') : 0;
  }

  private extractCostPerAction(costPerActions: any[], actionType: string): number {
    if (!costPerActions || !Array.isArray(costPerActions)) return 0;
    
    const action = costPerActions.find(a => a.action_type === actionType);
    return action ? parseFloat(action.value || '0') : 0;
  }

  private getEmptyStats(dateRange?: DateRange, debug?: any): FacebookAdsStats {
    let timeRange = 'Last 30 days';
    if (dateRange) {
      timeRange = `${format(parseISO(dateRange.from), 'MMM d, yyyy')} to ${format(parseISO(dateRange.to), 'MMM d, yyyy')}`;
    }

    return {
      totalSpend: 0,
      totalClicks: 0,
      totalImpressions: 0,
      totalLeads: 0,
      totalPurchases: 0,
      totalPurchaseValue: 0,
      averageCtr: 0,
      averageCpc: 0,
      averageCostPerLead: 0,
      averageCostPerPurchase: 0,
      dailyStats: [],
      campaignStats: [],
      timeRange,
      lastUpdated: new Date().toISOString(),
      debug
    };
  }
} 
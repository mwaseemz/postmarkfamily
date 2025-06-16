import Papa from 'papaparse';

export interface ThriveCartTransaction {
  event: 'purchase' | 'upsellaccept' | 'abandon' | 'refund';
  item_name: string;
  item_plan_name: string;
  date: string;
  checkbox_confirmation: boolean;
  price: number;
}

export interface ThriveCartStats {
  totalRevenue: number;
  totalTransactions: number;
  totalPurchases: number;
  totalUpsells: number;
  totalAbandoned: number;
  conversionRate: number;
  upsellConversionRate: number;
  averageOrderValue: number;
  dailyStats: DailyStats[];
  productStats: ProductStats[];
  recentTransactions: ThriveCartTransaction[];
}

export interface DailyStats {
  date: string;
  revenue: number;
  transactions: number;
  purchases: number;
  upsells: number;
}

export interface ProductStats {
  name: string;
  revenue: number;
  quantity: number;
  averagePrice: number;
}

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSTi7NRqAnk8OxsPdaUURzmpO63lufSWoufd5PNfUBE18xLHwdKqSDZU9l_EIgBmN5CSv3r0U_YAlk6/pub?gid=0&single=true&output=csv';

export class ThriveCartService {
  private static instance: ThriveCartService;
  private cache: { data: ThriveCartStats | null; timestamp: number } = {
    data: null,
    timestamp: 0
  };
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ThriveCartService {
    if (!ThriveCartService.instance) {
      ThriveCartService.instance = new ThriveCartService();
    }
    return ThriveCartService.instance;
  }

  async fetchData(forceRefresh = false): Promise<ThriveCartStats> {
    const now = Date.now();
    
    if (!forceRefresh && this.cache.data && (now - this.cache.timestamp) < this.CACHE_DURATION) {
      return this.cache.data;
    }

    try {
      const response = await fetch(CSV_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      const parsed = Papa.parse<string[]>(csvText, {
        header: false,
        skipEmptyLines: true
      });

      if (parsed.errors.length > 0) {
        console.warn('CSV parsing warnings:', parsed.errors);
      }

      const transactions = this.parseTransactions(parsed.data);
      const stats = this.calculateStats(transactions);
      
      this.cache = {
        data: stats,
        timestamp: now
      };

      return stats;
    } catch (error) {
      console.error('Error fetching ThriveCart data:', error);
      
      // Return cached data if available, otherwise return empty stats
      if (this.cache.data) {
        return this.cache.data;
      }
      
      return this.getEmptyStats();
    }
  }

  private parseTransactions(data: string[][]): ThriveCartTransaction[] {
    if (data.length < 2) return [];
    
    // Skip header row
    const rows = data.slice(1);
    const transactions: ThriveCartTransaction[] = [];

    for (const row of rows) {
      if (row.length < 6) continue;

      try {
        const transaction: ThriveCartTransaction = {
          event: this.parseEvent(row[0]),
          item_name: row[1] || '',
          item_plan_name: row[2] || '',
          date: row[3] || '',
          checkbox_confirmation: row[4]?.toLowerCase() === 'true',
          price: this.parsePrice(row[5])
        };

        transactions.push(transaction);
      } catch (error) {
        console.warn('Error parsing transaction row:', row, error);
      }
    }

    return transactions;
  }

  private parseEvent(event: string): ThriveCartTransaction['event'] {
    const normalized = event?.toLowerCase().trim();
    switch (normalized) {
      case 'purchase':
        return 'purchase';
      case 'upsellaccept':
        return 'upsellaccept';
      case 'abandon':
        return 'abandon';
      case 'refund':
        return 'refund';
      default:
        return 'purchase'; // Default fallback
    }
  }

  private parsePrice(price: string | number): number {
    if (typeof price === 'number') return price;
    if (!price) return 0;
    
    // Remove currency symbols and parse
    const cleaned = price.toString().replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  private calculateStats(transactions: ThriveCartTransaction[]): ThriveCartStats {
    const purchases = transactions.filter(t => t.event === 'purchase');
    const upsells = transactions.filter(t => t.event === 'upsellaccept');
    const abandoned = transactions.filter(t => t.event === 'abandon');
    
    const totalRevenue = transactions
      .filter(t => t.event === 'purchase' || t.event === 'upsellaccept')
      .reduce((sum, t) => sum + t.price, 0);
    
    const totalTransactions = purchases.length + upsells.length;
    const totalPurchases = purchases.length;
    const totalUpsells = upsells.length;
    const totalAbandoned = abandoned.length;
    
    const conversionRate = totalAbandoned > 0 
      ? (totalPurchases / (totalPurchases + totalAbandoned)) * 100 
      : 100;
    
    const upsellConversionRate = totalPurchases > 0 
      ? (totalUpsells / totalPurchases) * 100 
      : 0;
    
    const averageOrderValue = totalTransactions > 0 
      ? totalRevenue / totalTransactions 
      : 0;

    return {
      totalRevenue,
      totalTransactions,
      totalPurchases,
      totalUpsells,
      totalAbandoned,
      conversionRate,
      upsellConversionRate,
      averageOrderValue,
      dailyStats: this.calculateDailyStats(transactions),
      productStats: this.calculateProductStats(transactions),
      recentTransactions: transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
    };
  }

  private calculateDailyStats(transactions: ThriveCartTransaction[]): DailyStats[] {
    const dailyMap = new Map<string, DailyStats>();

    for (const transaction of transactions) {
      if (!transaction.date) continue;
      
      const date = transaction.date.split(' ')[0]; // Get date part only
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          revenue: 0,
          transactions: 0,
          purchases: 0,
          upsells: 0
        });
      }

      const dayStats = dailyMap.get(date)!;
      
      if (transaction.event === 'purchase' || transaction.event === 'upsellaccept') {
        dayStats.revenue += transaction.price;
        dayStats.transactions += 1;
      }
      
      if (transaction.event === 'purchase') {
        dayStats.purchases += 1;
      } else if (transaction.event === 'upsellaccept') {
        dayStats.upsells += 1;
      }
    }

    return Array.from(dailyMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private calculateProductStats(transactions: ThriveCartTransaction[]): ProductStats[] {
    const productMap = new Map<string, ProductStats>();

    for (const transaction of transactions) {
      if (transaction.event !== 'purchase' && transaction.event !== 'upsellaccept') continue;
      
      const name = transaction.item_name;
      
      if (!productMap.has(name)) {
        productMap.set(name, {
          name,
          revenue: 0,
          quantity: 0,
          averagePrice: 0
        });
      }

      const productStats = productMap.get(name)!;
      productStats.revenue += transaction.price;
      productStats.quantity += 1;
      productStats.averagePrice = productStats.revenue / productStats.quantity;
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue);
  }

  private getEmptyStats(): ThriveCartStats {
    return {
      totalRevenue: 0,
      totalTransactions: 0,
      totalPurchases: 0,
      totalUpsells: 0,
      totalAbandoned: 0,
      conversionRate: 0,
      upsellConversionRate: 0,
      averageOrderValue: 0,
      dailyStats: [],
      productStats: [],
      recentTransactions: []
    };
  }
} 
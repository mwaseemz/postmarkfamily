# Analytics Dashboard

A comprehensive analytics dashboard built with Next.js 14, TypeScript, and Tailwind CSS, featuring both **Postmark email analytics** and **ThriveCart sales analytics** with real-time data synchronization.

## 🚀 Features

### Postmark Email Analytics
- **Real-time email metrics**: Sent, delivered, opened, clicked, bounced, spam complaints
- **Interactive charts**: Line and bar charts showing email performance trends
- **Advanced filtering**: Date range selection with preset options (7, 30, 90 days)
- **Rate limiting**: Built-in protection against API rate limits with exponential backoff
- **Data caching**: Intelligent caching to minimize API calls and improve performance
- **Dark mode**: Full dark/light theme support with system preference detection

### ThriveCart Sales Analytics
- **Automated data sync**: Fetches data directly from Google Sheets CSV export
- **Comprehensive metrics**: Revenue, transactions, conversion rates, upsell performance
- **Product performance**: Detailed breakdown by product with revenue and quantity metrics
- **Transaction history**: Searchable and filterable transaction table with pagination
- **Visual analytics**: Interactive charts showing daily sales trends and patterns
- **Real-time updates**: Auto-refresh functionality with manual refresh option

## 🛠 Tech Stack

- **Framework**: Next.js 14 (Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Data Processing**: Papa Parse (CSV parsing)
- **Date Handling**: date-fns
- **Testing**: Jest + React Testing Library

## 📊 Dashboard Overview

### Postmark Dashboard (`/`)
- Email delivery and engagement metrics
- Time-series charts for trend analysis
- Detailed statistics table with sorting and filtering
- Rate limiting indicators and error handling

### ThriveCart Dashboard (`/thrivecart`)
- Sales revenue and transaction analytics
- Product performance breakdown
- Upsell conversion tracking
- Customer transaction history

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Postmark account with Server API Token
- ThriveCart data exported to Google Sheets (CSV format)

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Postmark Configuration
POSTMARK_SERVER_TOKEN=your_postmark_server_token_here

# Optional: Database (if using Prisma caching)
DATABASE_URL="file:./dev.db"
```

### Installation Steps

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd dashboardcustom
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
# Edit .env.local with your actual tokens
```

3. **Run development server**:
```bash
npm run dev
```

4. **Access the dashboards**:
- Postmark Analytics: http://localhost:3000
- ThriveCart Analytics: http://localhost:3000/thrivecart

## 📈 ThriveCart Integration

### Google Sheets Setup

The ThriveCart dashboard automatically fetches data from a Google Sheets CSV export. Your sheet should have the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| `event` | Transaction type | `purchase`, `upsellaccept`, `abandon`, `refund` |
| `item_name` | Product name | `"The $4,000,000 Client-Getting Google Doc System"` |
| `item_plan_name` | Plan/variant name | `"The $4,000,000 Client-Getting Google Doc System"` |
| `date` | Transaction date | `2025-06-13 14:46:08` |
| `checkbox_confirmation` | Checkbox status | `FALSE` |
| `Price` | Transaction amount | `8` |

### Data Source Configuration

The dashboard fetches data from this Google Sheets CSV URL:
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vSTi7NRqAnk8OxsPdaUURzmpO63lufSWoufd5PNfUBE18xLHwdKqSDZU9l_EIgBmN5CSv3r0U_YAlk6/pub?gid=0&single=true&output=csv
```

To use your own data:
1. Export your ThriveCart data to Google Sheets
2. Publish the sheet as CSV (File → Share → Publish to web → CSV)
3. Update the `CSV_URL` in `lib/thrivecart.ts`

### Supported Metrics

- **Revenue Metrics**: Total revenue, average order value, net revenue
- **Transaction Metrics**: Total purchases, upsells, conversion rates
- **Product Analytics**: Revenue by product, quantity sold, average prices
- **Time-based Analysis**: Daily sales trends, transaction patterns

## 🔌 API Endpoints

### Postmark API
- `GET /api/stats` - Fetch email analytics with optional date filtering
- `POST /api/refresh` - Force refresh cached data

### ThriveCart API  
- `GET /api/thrivecart` - Fetch sales analytics (cached for 5 minutes)
- `POST /api/thrivecart` - Force refresh sales data

### Query Parameters

Both APIs support date filtering:
```
GET /api/stats?days=30
GET /api/stats?from=2024-01-01&to=2024-01-31
```

## 🎨 UI Components

### Shared Components
- `KpiCard` - Metric display cards with icons and formatting
- `StatsChart` - Recharts wrapper for line/bar charts
- `StatsTable` - Data table with sorting, filtering, and pagination

### ThriveCart Components
- `ThriveCartKpiCard` - Sales-specific metric cards
- `ThriveCartChart` - Revenue and transaction charts
- `ThriveCartTable` - Transaction history table

## 🧪 Testing

Run the test suite:
```bash
npm test
npm run test:watch  # Watch mode
```

Tests cover:
- API endpoint functionality
- Data processing and calculations
- Component rendering and interactions
- Error handling scenarios

## 🚀 Deployment

### Netlify Deployment

The project is configured for Netlify deployment:

1. **Build configuration** (netlify.toml):
```toml
[build]
  command = "npm install && npm run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "18"
```

2. **Environment variables**: Set in Netlify dashboard
   - `POSTMARK_SERVER_TOKEN`

3. **Deploy**: 
```bash
git push origin main  # Auto-deploys via Netlify
```

### Manual Deployment

```bash
npm run build
npm start
```

## 📊 Data Flow Architecture

### Postmark Integration
```
Postmark API → Rate Limiting → Data Processing → Caching → Dashboard
```

### ThriveCart Integration  
```
Google Sheets CSV → Papa Parse → Data Processing → Caching → Dashboard
```

### Caching Strategy
- **Postmark**: 5-minute cache with rate limit protection
- **ThriveCart**: 5-minute cache with automatic refresh
- **Client-side**: React state management with error boundaries

## 🔍 Monitoring & Analytics

### Performance Metrics
- API response times tracked
- Cache hit/miss ratios logged
- Error rates monitored
- User interaction analytics

### Error Handling
- Graceful API failure recovery
- User-friendly error messages
- Automatic retry mechanisms
- Fallback data display

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use Tailwind CSS for styling
- Write tests for new features
- Update documentation for API changes

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for common solutions
- Review the test files for usage examples

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies** 
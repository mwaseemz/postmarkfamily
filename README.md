# Postmark Analytics Dashboard

A lightweight, self-hosted dashboard that surfaces all key analytics for campaign emails sent from Postmark. Built with Next.js 14, TypeScript, Tailwind CSS, Prisma, and SQLite.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Dashboard+Preview)

## Features

- 📊 **Comprehensive Analytics**: Track delivery, open, click, bounce, spam complaint, and unsubscribe metrics
- 🏷️ **Tag-based Analysis**: Break down metrics by Postmark Tag (each GHL campaign uses a unique tag)
- 📈 **Interactive Charts**: Visual trends using Recharts with customizable date ranges
- 📋 **Sortable Tables**: Filter and sort campaign performance data
- 🌙 **Dark Mode**: Toggle between light and dark themes
- ⚡ **Smart Caching**: 15-minute SQLite cache with rate limit protection
- 🔄 **Auto-refresh**: Automatic data updates with manual refresh option
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **Database**: SQLite with Prisma ORM
- **Charts**: Recharts for interactive visualizations
- **Icons**: Lucide React
- **Testing**: Vitest with React Testing Library
- **Deployment**: Optimized for Netlify

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Postmark account with Server Token

### Installation

```bash
# Clone and install dependencies
git clone <your-repo-url>
cd postmark-analytics-dashboard
pnpm install

# Set up environment variables
cp .env.example .env.local

# Initialize database
pnpm db:generate
pnpm db:push

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your dashboard.

## Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# Postmark Configuration
POSTMARK_SERVER_TOKEN="your_postmark_server_token_here"

# Optional: Rate limiting settings (defaults provided)
POSTMARK_RATE_LIMIT_REQUESTS=500
POSTMARK_RATE_LIMIT_WINDOW_MS=60000
```

### Getting Your Postmark Server Token

1. Log in to your [Postmark account](https://postmarkapp.com)
2. Navigate to **Servers** in the left sidebar
3. Select your server
4. Go to the **API Tokens** tab
5. Copy your **Server Token** (starts with a UUID format)

![Postmark Server Token Location](https://via.placeholder.com/600x300?text=Postmark+API+Tokens+Tab)

## Database Schema

The application uses a single `StatSnapshot` model to cache Postmark data:

```prisma
model StatSnapshot {
  id           String   @id @default(cuid())
  tag          String   
  date         DateTime
  sent         Int      @default(0)
  delivered    Int      @default(0)
  opened       Int      @default(0)
  clicked      Int      @default(0)
  bounced      Int      @default(0)
  spam         Int      @default(0)
  unsubscribed Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([tag, date])
}
```

## API Endpoints

### GET /api/stats

Fetches analytics data with smart caching.

**Parameters:**
- `from` (optional): Start date (YYYY-MM-DD), defaults to 30 days ago
- `to` (optional): End date (YYYY-MM-DD), defaults to today
- `refresh` (optional): Set to 'true' to force cache refresh

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "sent": 1000,
      "delivered": 950,
      "opened": 300,
      "clicked": 100,
      "bounced": 50,
      "spam": 5,
      "unsubscribed": 10,
      "openRate": 31.58,
      "clickRate": 10.53,
      "bounceRate": 5.0
    },
    "byTag": [...],
    "daily": [...],
    "lastUpdated": "2023-12-01T12:00:00.000Z"
  }
}
```

### POST /api/refresh

Forces a complete data refresh from Postmark.

**Body:**
```json
{
  "from": "2023-11-01",
  "to": "2023-12-01",
  "tags": ["campaign-1", "campaign-2"] // optional
}
```

## Rate Limiting & Error Handling

The dashboard implements robust rate limiting and error handling:

- **Exponential Backoff**: Automatic retry with increasing delays
- **Rate Limit Detection**: Graceful handling of Postmark rate limits
- **Cache Strategy**: 15-minute TTL to minimize API calls
- **Error Notifications**: Toast notifications for API failures
- **Offline Graceful**: Falls back to cached data when API is unavailable

## Deployment

### Netlify Deployment

1. **Build Configuration**
   ```toml
   # netlify.toml
   [build]
     command = "pnpm build"
     publish = ".next"

   [build.environment]
     NODE_VERSION = "18"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Environment Variables**
   Set these in Netlify's dashboard under Site Settings > Environment Variables:
   ```
   DATABASE_URL=file:./prod.db
   POSTMARK_SERVER_TOKEN=your_production_token
   ```

3. **Deploy**
   ```bash
   # Build for production
   pnpm build
   
   # Or connect your Git repo to Netlify for automatic deployments
   ```

### Alternative: Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

For PlanetScale (MySQL) instead of SQLite:
```env
DATABASE_URL="mysql://username:password@host/database?sslaccept=strict"
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test postmark.test.ts
```

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test         # Run tests
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:migrate   # Create and run migrations
pnpm db:studio    # Open Prisma Studio
```

## Performance Features

- **Smart Caching**: SQLite cache with 15-minute TTL
- **Lazy Loading**: Components load only when needed
- **Optimistic UI**: Immediate feedback for user actions
- **Request Deduplication**: Prevents duplicate API calls
- **Responsive Images**: Optimized loading for all screen sizes

## Future Enhancements

The codebase includes TODO comments for future integrations:

```typescript
// TODO: Integrate with GHL API to match Postmark tags to GHL campaign names
// TODO: Add webhook support for real-time updates
// TODO: Implement user authentication and multi-tenant support
// TODO: Add export functionality (CSV, PDF reports)
// TODO: Implement campaign comparison features
```

## Troubleshooting

### Common Issues

1. **"No data available"**
   - Verify your `POSTMARK_SERVER_TOKEN` is correct
   - Check that your Postmark account has email data in the selected date range
   - Ensure your server has internet access to reach Postmark's API

2. **Rate Limiting Errors**
   - The dashboard handles rate limits automatically
   - If persistent, try reducing `POSTMARK_RATE_LIMIT_REQUESTS`
   - Consider implementing staggered refresh schedules

3. **Database Errors**
   - Run `pnpm db:push` to sync schema
   - Delete `dev.db` and run `pnpm db:push` to reset
   - Check file permissions on the database directory

### Debug Mode

Enable detailed logging by setting:
```env
NODE_ENV=development
DEBUG=postmark:*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `pnpm test`
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Create an issue in this repository
- Check the [Postmark API documentation](https://postmarkapp.com/developer)
- Review the [Next.js documentation](https://nextjs.org/docs)

---

Built with ❤️ for better email analytics 
# Job Scraper

Automated job collection system that scrapes job listings from LinkedIn and stores them in PostgreSQL database with Google Sheets integration.

## Features

- LinkedIn job scraping with intelligent duplicate detection
- PostgreSQL database for reliable data storage
- Google Sheets integration for easy viewing and management
- Email notifications for job collection summaries
- Automatic database schema creation
- Scheduled job collection every 2 hours
- Health check endpoints for monitoring
- Render.com deployment ready

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file with these variables:
```env
# Database (for local development)
DATABASE_URL=postgresql://username:password@localhost:5432/job_scraper

# Job Search Configuration
JOB_KEYWORDS=quant (remote)
JOB_LOCATION=Taiwan
JOB_GEO_ID=104187078
REQUEST_DELAY=3000

# Google Sheets (Optional)
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}
GOOGLE_SHEETS_SHEET_ID=your-sheet-id

# Email Notifications (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_TO=recipient@gmail.com
```

### 3. Run the Application
```bash
# Development with auto-restart
npm run dev

# Production
npm start

# Initialize database manually (optional)
npm run db:init
```

## Architecture

- **Main Entry Point**: `src/postgres-sheets-collector.js`
- **Database Service**: `src/services/PostgreSQLService.js`
- **Scraper**: `src/services/LinkedInScraper.js`
- **Google Sheets**: `src/services/SimpleGoogleSheetsService.js`
- **Email Service**: `src/services/EmailService.js`
- **Database Init**: `src/database/init.js`

## Deployment

For production deployment on Render.com, see: [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)

## Configuration Guides

- [Email Setup Guide](EMAIL_SETUP_GUIDE.md)
- [Google Sheets Setup](GOOGLE_SHEETS_SETUP.md)
- [LinkedIn Geo IDs](LINKEDIN_GEO_IDS.md)

## Health Checks

- `GET /` - Basic health check
- `GET /health` - Detailed health status

## Database

The application automatically creates the required database tables and indexes on startup. The database schema includes:
- Jobs table with full-text search capabilities
- Automatic timestamp updates
- Optimized indexes for performance
- Database views for statistics and recent jobs

## License

MIT License - see [LICENSE](LICENSE) file for details.
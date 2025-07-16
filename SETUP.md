# PostgreSQL Job Scraper Setup

## Quick Setup Guide

### 1. Install PostgreSQL
```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database user (if needed)
sudo -u postgres createuser --interactive
```

### 2. Setup Database
```bash
# Create database
createdb job_scraper

# Run schema setup
npm run db:setup
# OR manually:
psql -d job_scraper -f src/database/schema.sql
```

### 3. Configure Environment
```bash
# Update .env file with your database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_scraper
DB_USER=your_username
DB_PASSWORD=your_password
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Test Connection
```bash
# Test the scraper
npm run test:linkedin

# Test database connection
node -e "const db = require('./src/services/PostgreSQLService'); new db().testConnection()"
```

## Running the System

### Option 1: Full System (Recommended)
```bash
# Terminal 1: Start the scheduler (scrapes every 2 hours)
npm start

# Terminal 2: Start the web interface
npm run web

# Visit http://localhost:3000 on your phone/browser
```

### Option 2: Development Mode
```bash
# Terminal 1: Scheduler with auto-restart
npm run dev

# Terminal 2: Web server with auto-restart
npm run dev:web
```

### Option 3: Manual Collection
```bash
# One-time scraping
npm run collect:linkedin
```

## Mobile Access

### Local Network Access
1. Find your IP address: `ifconfig` (macOS) or `ip addr` (Linux)
2. Update your phone's browser to: `http://YOUR_IP:3000`
3. Example: `http://192.168.1.100:3000`

### Public Access Options
1. **Ngrok** (easiest): `npx ngrok http 3000`
2. **Port forwarding**: Configure router to forward port 3000
3. **Cloud deployment**: Deploy to Heroku, Railway, or DigitalOcean

## Features

### 🔄 Automated Scraping
- Runs every 2 hours automatically
- Scrapes your LinkedIn search URL
- Prevents duplicate entries
- Handles errors gracefully

### 📱 Mobile-Friendly Interface
- Responsive design for phones
- Search and filter jobs
- Real-time stats
- View job details

### 🗄️ PostgreSQL Database
- Full-text search capabilities
- Scalable to millions of jobs
- Complex queries and analytics
- Backup and restore support

### 📊 Analytics
- Job statistics dashboard
- Category breakdown
- Company analysis
- Trend tracking

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
brew services list | grep postgresql  # macOS
systemctl status postgresql          # Linux

# Test connection
psql -d job_scraper -c "SELECT NOW();"
```

### Permission Errors
```bash
# Fix PostgreSQL permissions
sudo -u postgres psql
ALTER USER your_username CREATEDB;
```

### Port Already in Use
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run web
```

### LinkedIn Blocking
- The scraper uses delays and proper headers
- If blocked, increase `REQUEST_DELAY` in .env
- Consider using proxy rotation for production

## Production Deployment

### 1. Environment Variables
```bash
NODE_ENV=production
DB_HOST=your_production_db_host
DB_PASSWORD=secure_password
REQUEST_DELAY=5000  # Increase delay for production
```

### 2. Process Management
```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start src/scheduler.js --name "job-scheduler"
pm2 start src/web/server.js --name "job-web"

# Save PM2 configuration
pm2 save
pm2 startup
```

### 3. Reverse Proxy (Optional)
```nginx
# Nginx configuration
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Backup & Maintenance

### Database Backup
```bash
# Create backup
pg_dump job_scraper > backup.sql

# Restore backup
psql job_scraper < backup.sql
```

### Log Rotation
```bash
# Install logrotate configuration
sudo nano /etc/logrotate.d/job-scraper
```

### Monitor Performance
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('job_scraper'));

-- Check table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(tablename::text)) 
FROM pg_tables WHERE schemaname = 'public';

-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;
```

## Next Steps

1. **Mobile Access**: Set up ngrok or port forwarding
2. **Notifications**: Add email/SMS alerts for new jobs
3. **More Sources**: Add other job boards
4. **Analytics**: Build custom dashboards
5. **Automation**: Set up alerts for specific keywords

## Support

Check the logs for detailed error information:
- Scheduler logs: Console output from `npm start`
- Web server logs: Console output from `npm run web`
- Database logs: Check PostgreSQL logs

For issues, review the troubleshooting section or check the source code comments.
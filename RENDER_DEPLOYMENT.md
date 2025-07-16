# Render Deployment Guide

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **PostgreSQL Database**: Create a PostgreSQL database on Render
3. **Environment Variables**: Set up all required environment variables

## Step 1: Create PostgreSQL Database

1. Go to Render Dashboard
2. Click "New" → "PostgreSQL"
3. Configure:
   - Name: `job-scraper-db`
   - Database Name: `job_scraper` (or any name you prefer)
   - User: `job_scraper_user` (or any username)
   - Region: Choose closest to your location
4. Click "Create Database"
5. **Important**: Save the connection details (DATABASE_URL will be provided)

## Step 2: Deploy Web Service

1. Go to Render Dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: `job-scraper-service`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free` (or `Starter` for better performance)

## Step 3: Environment Variables

Set these environment variables in your Render web service:

### Required Database Variables
```
DATABASE_URL=postgresql://username:password@hostname:port/database_name
```
*Note: This will be provided by your PostgreSQL database. Copy it from your database dashboard.*

### Job Scraping Configuration
```
JOB_KEYWORDS=quant (remote)
JOB_LOCATION=Taiwan
JOB_GEO_ID=104187078
REQUEST_DELAY=3000
```

### Google Sheets Integration (Optional)
```
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account","project_id":"your-project",...}
GOOGLE_SHEETS_SHEET_ID=your-sheet-id
```

### Email Notifications (Optional)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_TO=recipient@gmail.com
```

### Other Variables
```
NODE_ENV=production
PORT=3000
```

## Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Install dependencies
   - Create database tables (via our initialization script)
   - Start the service
   - Bind to the correct port

## Step 5: Verify Deployment

1. **Check Service Health**: Visit your service URL (e.g., `https://your-service.onrender.com`)
2. **Check Logs**: Monitor deployment logs for any errors
3. **Database Tables**: Tables will be created automatically on first start
4. **Job Collection**: Service will start collecting jobs every 2 hours

## Health Check Endpoints

- `GET /` - Basic health check
- `GET /health` - Detailed health status

## Common Issues & Solutions

### Issue: "relation 'jobs' does not exist"
**Solution**: The database initialization script should handle this automatically. If it persists:
1. Check DATABASE_URL is correct
2. Verify database connection
3. Run initialization manually: `npm run db:init`

### Issue: "Error: connect ECONNREFUSED"
**Solution**: 
1. Verify DATABASE_URL format
2. Check if PostgreSQL database is running
3. Ensure SSL is configured for production

### Issue: "Application failed to respond"
**Solution**:
1. Check if app is binding to correct port (`process.env.PORT`)
2. Verify app is listening on `0.0.0.0`, not `localhost`
3. Check if dependencies are installed correctly

### Issue: "Build failed"
**Solution**:
1. Ensure `package.json` has correct scripts
2. Check if all dependencies are listed
3. Verify Node.js version compatibility

## Manual Database Setup (if needed)

If automatic initialization fails, you can manually create tables:

```sql
-- Connect to your PostgreSQL database and run:
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  url VARCHAR(500) UNIQUE NOT NULL,
  description TEXT,
  summary TEXT,
  requirements TEXT,
  benefits TEXT,
  category VARCHAR(100),
  source VARCHAR(50),
  posted_time VARCHAR(100),
  application_status VARCHAR(100),
  job_type VARCHAR(50),
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Monitoring

- **Render Dashboard**: Monitor CPU, memory, and logs
- **Health Endpoints**: Set up uptime monitoring
- **Email Notifications**: Configure alerts for job collection status
- **Database Monitoring**: Monitor database usage and performance

## Scaling

- **Upgrade Instance**: Move from Free to Starter/Standard for better performance
- **Database Scaling**: Upgrade PostgreSQL instance for more connections
- **Cron Optimization**: Adjust collection frequency based on usage

## Support

If you encounter issues:
1. Check Render logs for error messages
2. Verify all environment variables are set correctly
3. Test database connection manually
4. Contact Render support if needed
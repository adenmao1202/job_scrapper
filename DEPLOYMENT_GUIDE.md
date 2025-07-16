# Automated Deployment and Email Notifications Guide

## Deployment Options

### Option 1: Cloud Hosting (Recommended)

#### **1. Railway.app (Simplest)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add postgresql
railway deploy
```

**Environment Variables to Set:**
- All variables from your `.env` file
- `DATABASE_URL` (automatically provided by Railway)

**Automatic Features:**
- Auto-restart on crashes
- Built-in PostgreSQL database
- Easy environment management
- Automatic HTTPS

#### **2. Heroku**
```bash
# Install Heroku CLI and deploy
heroku create your-job-scraper
heroku addons:create heroku-postgresql:mini
git push heroku main
```

#### **3. DigitalOcean App Platform**
- Connect GitHub repository
- Auto-deploy on commits
- Built-in database options

### Option 2: VPS Hosting

#### **Using PM2 for Process Management**
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
pm2 ecosystem
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'job-scraper',
    script: 'src/postgres-sheets-collector.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

**Deploy and manage:**
```bash
# Start the application
pm2 start ecosystem.config.js

# Monitor
pm2 monitor

# Auto-restart on boot
pm2 startup
pm2 save
```

### Option 3: Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  job-scraper:
    build: .
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/jobdb
    depends_on:
      - postgres
    restart: unless-stopped
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: jobdb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

## Email Notifications Setup

### Method 1: Add Email Service to Existing Code

**Install email package:**
```bash
npm install nodemailer
```

**Add to .env:**
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=luizmao1202@gmail.com
```

**Create email service:**
```javascript
// src/services/EmailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendJobSummary(stats) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: `Job Scraper Summary - ${stats.newJobs} New Jobs Found`,
      html: `
        <h2>Job Collection Completed</h2>
        <p><strong>New Jobs:</strong> ${stats.newJobs}</p>
        <p><strong>Total Jobs:</strong> ${stats.totalJobs}</p>
        <p><strong>Companies:</strong> ${stats.uniqueCompanies}</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><a href="${process.env.GOOGLE_SHEET_URL}">View Google Sheet</a></p>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }
}
```

### Method 2: Webhook Notifications

**Add webhook to existing code:**
```javascript
// In postgres-sheets-collector.js, after job collection
if (process.env.WEBHOOK_URL) {
  await fetch(process.env.WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Found ${newJobs.length} new jobs`,
      timestamp: new Date().toISOString(),
      sheetUrl: this.sheetsService.getSheetUrl()
    })
  });
}
```

## Monitoring and Health Checks

### Add Health Check Endpoint

**Create simple web server:**
```javascript
// src/web/health.js
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    lastRun: process.env.LAST_RUN || 'never',
    uptime: process.uptime()
  });
});

app.listen(process.env.PORT || 3000);
```

### Uptime Monitoring Services

1. **UptimeRobot** (Free)
   - Monitor your health endpoint
   - Email alerts on downtime

2. **Better Uptime**
   - Advanced monitoring
   - Slack/Discord integrations

## Automated Scheduling Verification

The current system runs every 2 hours automatically via `cron.schedule('0 */2 * * *')`.

**To modify schedule:**
- Edit line 25 in `src/postgres-sheets-collector.js`
- Cron format: `minute hour day month day-of-week`

**Common schedules:**
- Every 30 minutes: `'*/30 * * * *'`
- Daily at 9 AM: `'0 9 * * *'`
- Every 6 hours: `'0 */6 * * *'`

## Quick Setup Steps

1. **Choose deployment platform** (Railway recommended)
2. **Set environment variables** from your `.env`
3. **Add email configuration** if desired
4. **Deploy and test**
5. **Set up monitoring** (optional)

Your job scraper will now run continuously in the cloud, collecting jobs every 2 hours and updating your Google Sheet automatically!
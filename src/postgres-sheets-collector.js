require('dotenv').config();
const cron = require('node-cron');
const express = require('express');
const LinkedInScraper = require('./services/LinkedInScraper');
const PostgreSQLService = require('./services/PostgreSQLService');
const GoogleSheetsService = require('./services/SimpleGoogleSheetsService');
const EmailService = require('./services/EmailService');
const DatabaseInitializer = require('./database/init');
const { logger } = require('./utils/logger');
const { delay } = require('./utils/helpers');

class PostgresGoogleSheetsCollector {
  constructor() {
    this.scraper = new LinkedInScraper();
    this.dbService = new PostgreSQLService();
    this.sheetsService = new GoogleSheetsService();
    this.emailService = new EmailService();
    this.processedJobs = new Set();
    this.isRunning = false;
  }

  async start() {
    logger.info('🚀 Starting PostgreSQL + Google Sheets Job Collector...');
    
    // Initialize database schema first
    const dbInitializer = new DatabaseInitializer();
    await dbInitializer.initialize();
    await dbInitializer.close();
    
    // Initialize Google Sheets if configured
    await this.sheetsService.createJobsSheet();
    
    // Create Express app for health checks (required for Render)
    const app = express();
    const PORT = process.env.PORT || 3000;
    
    // Health check endpoint
    app.get('/', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'Job Collector',
        timestamp: new Date().toISOString(),
        running: this.isRunning
      });
    });
    
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'Job Collector',
        timestamp: new Date().toISOString(),
        running: this.isRunning
      });
    });
    
    // Start HTTP server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🌐 HTTP server listening on port ${PORT}`);
    });
    
    // Schedule job collection every 2 hours
    cron.schedule('0 */2 * * *', async () => {
      if (!this.isRunning) {
        await this.collectAndSyncJobs();
      } else {
        logger.warn('⚠️ Job collection already running, skipping this cycle');
      }
    });

    // Run immediately on startup
    logger.info('🔄 Running initial job collection...');
    setTimeout(() => this.collectAndSyncJobs(), 2000);

    logger.info('⏰ Job scheduler started - will run every 2 hours');
    logger.info('📊 PostgreSQL: Stores all job data');
    logger.info('📱 Google Sheets: ' + this.sheetsService.getSheetUrl());
  }

  async collectAndSyncJobs() {
    if (this.isRunning) {
      logger.warn('⚠️ Job collection already in progress');
      return;
    }

    this.isRunning = true;
    logger.info('🔍 Starting LinkedIn job collection...');

    try {
      // Build LinkedIn search URL from environment variables
      const keywords = process.env.JOB_KEYWORDS || 'quant (remote)';
      const location = process.env.JOB_LOCATION || 'Taiwan';
      const geoId = process.env.JOB_GEO_ID || '104187078'; // Taiwan's LinkedIn geo ID
      
      const linkedinUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&geoId=${geoId}&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true`;
      
      // Get existing jobs to prevent duplicates
      const existingJobs = await this.dbService.getExistingJobs();
      this.processedJobs = new Set(existingJobs.map(job => job.url));
      
      // Create composite keys for better duplicate detection
      this.processedJobsComposite = new Set(existingJobs.map(job => 
        `${(job.company || '').toLowerCase().trim()}-${(job.title || '').toLowerCase().trim()}-${(job.location || '').toLowerCase().trim()}`
      ));
      
      logger.info(`📋 Found ${existingJobs.length} existing jobs in PostgreSQL`);
      
      // Scrape jobs from LinkedIn
      const scrapedJobs = await this.scraper.scrapeLinkedInJobs(linkedinUrl);
      
      // Filter new jobs (check both URL and composite key - exclude if EITHER exists)
      const newJobs = scrapedJobs.filter(job => {
        const compositeKey = `${(job.company || '').toLowerCase().trim()}-${(job.title || '').toLowerCase().trim()}-${(job.location || '').toLowerCase().trim()}`;
        const isDuplicateUrl = this.processedJobs.has(job.url);
        const isDuplicateComposite = this.processedJobsComposite.has(compositeKey);
        
        if (isDuplicateUrl || isDuplicateComposite) {
          logger.info(`🔄 Skipping duplicate: ${job.title} at ${job.company} (${isDuplicateUrl ? 'URL' : 'Company+Title+Location'} match)`);
          return false;
        }
        return true;
      });
      
      logger.info(`✨ Found ${newJobs.length} new jobs to process`);
      
      // Process and store new jobs in PostgreSQL
      let processedCount = 0;
      let errorCount = 0;
      
      for (const job of newJobs) {
        try {
          await this.processJob(job);
          processedCount++;
          
          // Add delay between requests
          await delay(parseInt(process.env.REQUEST_DELAY) || 3000);
          
        } catch (error) {
          errorCount++;
          logger.error(`❌ Error processing job ${job.title}:`, error.message);
          
          // Stop if too many errors
          if (errorCount > 5) {
            logger.warn('⚠️ Too many errors, stopping job processing');
            break;
          }
        }
      }
      
      // Sync all jobs to Google Sheets
      await this.syncToGoogleSheets();
      
      // Get final stats
      const stats = await this.dbService.getJobStats();
      
      // Log summary
      const summary = {
        totalScraped: scrapedJobs.length,
        newJobs: newJobs.length,
        processed: processedCount,
        errors: errorCount,
        databaseStats: stats,
        timestamp: new Date().toISOString()
      };
      
      logger.info('📊 Job collection completed:', summary);
      logger.info('📱 View jobs: ' + this.sheetsService.getSheetUrl());
      
      // Send email notification
      await this.emailService.sendJobSummary(summary);
      
    } catch (error) {
      logger.error('❌ Error in job collection:', error);
    } finally {
      this.isRunning = false;
      logger.info('✅ Job collection cycle completed');
    }
  }

  async processJob(job) {
    try {
      logger.info(`⚙️ Processing: ${job.title} at ${job.company}`);
      
      // Get detailed job information
      const jobDetails = await this.scraper.getLinkedInJobDetails(job.url);
      
      // Create processed job object
      const processedJob = {
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        description: jobDetails.description || '',
        summary: this.createJobSummary(jobDetails.description),
        requirements: this.extractRequirements(jobDetails.description),
        benefits: this.extractBenefits(jobDetails.description),
        category: this.categorizeJob(job.title, jobDetails.description),
        source: job.source,
        postedTime: job.postedTime,
        applicationStatus: job.applicationStatus,
        jobType: job.jobType,
        scrapedAt: job.scrapedAt,
        dateAdded: new Date().toISOString(),
        status: 'new'
      };

      // Store in PostgreSQL
      const result = await this.dbService.createJob(processedJob);
      
      if (result) {
        logger.info(`✅ Stored in PostgreSQL: ${job.title}`);
      }
      
    } catch (error) {
      logger.error(`❌ Error processing job:`, error);
      throw error;
    }
  }

  async syncToGoogleSheets() {
    try {
      logger.info('📊 Syncing jobs to Google Sheets...');
      
      // Get recent jobs from PostgreSQL
      const recentJobs = await this.dbService.getRecentJobs(50); // Last 50 jobs
      
      if (recentJobs.length === 0) {
        logger.info('No jobs to sync to Google Sheets');
        return;
      }
      
      // Sync to Google Sheets
      await this.sheetsService.syncJobsToSheet(recentJobs);
      
      logger.info(`✅ Synced ${recentJobs.length} jobs to Google Sheets`);
      
    } catch (error) {
      logger.error('❌ Error syncing to Google Sheets:', error);
    }
  }

  createJobSummary(description) {
    if (!description) return '';
    
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyPoints = sentences.slice(0, 2).map(s => s.trim()).join('. ');
    
    return keyPoints.length > 200 ? keyPoints.substring(0, 200) + '...' : keyPoints;
  }

  categorizeJob(title, description) {
    const categories = {
      'Quantitative Research': ['quant', 'quantitative', 'research', 'analyst', 'brain', 'wqbrain'],
      'Machine Learning': ['machine learning', 'ml', 'ai', 'artificial intelligence', 'data science'],
      'Software Engineering': ['software', 'engineer', 'developer', 'programming', 'coding'],
      'Data Science': ['data scientist', 'data analyst', 'analytics', 'statistics'],
      'Finance': ['finance', 'financial', 'trading', 'investment', 'portfolio'],
      'Security': ['security', 'cybersecurity', 'assurance', 'risk'],
      'DevOps': ['devops', 'containerization', 'virtualization', 'kubernetes'],
      'Product Management': ['product manager', 'product owner', 'pm'],
      'Consulting': ['consultant', 'consulting', 'advisory']
    };

    const text = (title + ' ' + description).toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }

  extractRequirements(description) {
    if (!description) return '';
    
    const reqKeywords = ['require', 'qualification', 'must have', 'essential', 'mandatory'];
    const lines = description.split('\n');
    
    const requirements = lines.filter(line => 
      reqKeywords.some(keyword => line.toLowerCase().includes(keyword))
    ).join('\n');
    
    return requirements.substring(0, 500);
  }

  extractBenefits(description) {
    if (!description) return '';
    
    const benefitKeywords = ['benefit', 'offer', 'package', 'compensation', 'perk'];
    const lines = description.split('\n');
    
    const benefits = lines.filter(line => 
      benefitKeywords.some(keyword => line.toLowerCase().includes(keyword))
    ).join('\n');
    
    return benefits.substring(0, 500);
  }

  async stop() {
    logger.info('🛑 Stopping job collector...');
    await this.dbService.close();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start the collector
const collector = new PostgresGoogleSheetsCollector();
collector.start();

module.exports = PostgresGoogleSheetsCollector;
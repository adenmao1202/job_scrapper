require('dotenv').config();
const cron = require('node-cron');
const LinkedInScraper = require('./services/LinkedInScraper');
const AirtableJobService = require('./services/AirtableJobService');
const { logger } = require('./utils/logger');
const { delay } = require('./utils/helpers');

class AirtableJobCollector {
  constructor() {
    this.scraper = new LinkedInScraper();
    this.airtable = new AirtableJobService();
    this.processedJobs = new Set();
    this.isRunning = false;
  }

  async start() {
    logger.info('🚀 Starting Airtable Job Collector...');
    
    // Schedule job collection every 2 hours
    cron.schedule('0 */2 * * *', async () => {
      if (!this.isRunning) {
        await this.collectJobs();
      } else {
        logger.warn('⚠️ Job collection already running, skipping this cycle');
      }
    });

    // Run immediately on startup for testing
    logger.info('🔄 Running initial job collection...');
    setTimeout(() => this.collectJobs(), 2000);

    logger.info('⏰ Job scheduler started - will run every 2 hours');
    logger.info('📱 Airtable URL: ' + this.airtable.getAirtableViewUrl());
  }

  async collectJobs() {
    if (this.isRunning) {
      logger.warn('⚠️ Job collection already in progress');
      return;
    }

    this.isRunning = true;
    logger.info('🔍 Starting LinkedIn job collection...');

    try {
      // Your LinkedIn search URL
      const linkedinUrl = 'https://www.linkedin.com/jobs/search/?currentJobId=4194472113&geoId=104187078&keywords=quant%20%20(remote)&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true';
      
      // Get existing jobs to prevent duplicates
      const existingJobs = await this.airtable.getExistingJobs();
      this.processedJobs = new Set(existingJobs.map(job => job.url));
      
      logger.info(`📋 Found ${existingJobs.length} existing jobs in Airtable`);
      
      // Scrape jobs from LinkedIn
      const scrapedJobs = await this.scraper.scrapeLinkedInJobs(linkedinUrl);
      
      // Filter new jobs
      const newJobs = scrapedJobs.filter(job => !this.processedJobs.has(job.url));
      
      logger.info(`✨ Found ${newJobs.length} new jobs to process`);
      
      // Process and store new jobs
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
      
      // Get final stats
      const stats = await this.airtable.getJobStats();
      
      // Log summary
      const summary = {
        totalScraped: scrapedJobs.length,
        newJobs: newJobs.length,
        processed: processedCount,
        errors: errorCount,
        airtableStats: stats,
        timestamp: new Date().toISOString()
      };
      
      logger.info('📊 Job collection completed:', summary);
      logger.info('📱 View jobs in Airtable: ' + this.airtable.getAirtableViewUrl());
      
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
        category: this.categorizeJob(job.title, jobDetails.description),
        postedTime: job.postedTime,
        applicationStatus: job.applicationStatus,
        jobType: job.jobType
      };

      // Store in Airtable
      const result = await this.airtable.createJob(processedJob);
      
      if (result) {
        logger.info(`✅ Stored in Airtable: ${job.title}`);
      }
      
    } catch (error) {
      logger.error(`❌ Error processing job:`, error);
      throw error;
    }
  }

  createJobSummary(description) {
    if (!description) return '';
    
    // Extract key points from description
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

  async stop() {
    logger.info('🛑 Stopping Airtable job collector...');
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
const collector = new AirtableJobCollector();
collector.start();

module.exports = AirtableJobCollector;
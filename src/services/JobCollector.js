const JobScraper = require('./JobScraper');
const AirtableService = require('./AirtableService');
const { logger } = require('../utils/logger');
const { delay } = require('../utils/helpers');

class JobCollector {
  constructor() {
    this.scraper = new JobScraper();
    this.airtable = new AirtableService();
    this.processedJobs = new Set();
  }

  async collectJobs() {
    logger.info('Starting job collection process');
    
    try {
      // Get existing jobs from Airtable to prevent duplicates
      const existingJobs = await this.airtable.getExistingJobs();
      this.processedJobs = new Set(existingJobs.map(job => job.url));
      
      logger.info(`Found ${existingJobs.length} existing jobs in database`);
      
      // Scrape jobs from configured sources
      const allJobs = await this.scrapeAllSources();
      
      // Filter new jobs
      const newJobs = allJobs.filter(job => !this.processedJobs.has(job.url));
      
      logger.info(`Found ${newJobs.length} new jobs to process`);
      
      // Process and store new jobs
      for (const job of newJobs) {
        try {
          await this.processJob(job);
          await delay(parseInt(process.env.REQUEST_DELAY) || 2000);
        } catch (error) {
          logger.error(`Error processing job ${job.url}:`, error);
        }
      }
      
      logger.info('Job collection completed successfully');
      
    } catch (error) {
      logger.error('Error in job collection process:', error);
      throw error;
    }
  }

  async scrapeAllSources() {
    const sources = [
      { name: 'Indeed', url: process.env.INDEED_BASE_URL },
      { name: 'LinkedIn', url: process.env.LINKEDIN_BASE_URL }
    ];

    const allJobs = [];

    for (const source of sources) {
      try {
        logger.info(`Scraping jobs from ${source.name}...`);
        const jobs = await this.scraper.scrapeJobs(source);
        allJobs.push(...jobs);
        logger.info(`Found ${jobs.length} jobs from ${source.name}`);
      } catch (error) {
        logger.error(`Error scraping ${source.name}:`, error);
      }
    }

    return allJobs;
  }

  async processJob(job) {
    try {
      // Get detailed job information
      const jobDetails = await this.scraper.getJobDetails(job.url);
      
      // Create job summary
      const processedJob = {
        ...job,
        ...jobDetails,
        summary: this.createJobSummary(jobDetails.description),
        category: this.categorizeJob(job.title, jobDetails.description),
        dateAdded: new Date().toISOString(),
        status: 'new'
      };

      // Store in Airtable
      await this.airtable.createJob(processedJob);
      
      logger.info(`Successfully processed job: ${job.title} at ${job.company}`);
      
    } catch (error) {
      logger.error(`Error processing job ${job.url}:`, error);
      throw error;
    }
  }

  createJobSummary(description) {
    if (!description) return '';
    
    // Simple text summarization - take first 200 words
    const words = description.split(' ');
    const summary = words.slice(0, 200).join(' ');
    
    return summary.length < description.length ? summary + '...' : summary;
  }

  categorizeJob(title, description) {
    const categories = {
      'Software Development': ['developer', 'engineer', 'programmer', 'coding', 'software'],
      'Data Science': ['data scientist', 'analyst', 'machine learning', 'ai', 'analytics'],
      'DevOps': ['devops', 'infrastructure', 'deployment', 'cloud', 'kubernetes'],
      'Product Management': ['product manager', 'product owner', 'pm', 'product'],
      'Design': ['designer', 'ui', 'ux', 'design', 'creative'],
      'Marketing': ['marketing', 'seo', 'content', 'social media', 'growth'],
      'Sales': ['sales', 'account manager', 'business development', 'sales rep']
    };

    const text = (title + ' ' + description).toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }
}

module.exports = JobCollector;
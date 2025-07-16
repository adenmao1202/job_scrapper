require('dotenv').config();
const LinkedInScraper = require('./services/LinkedInScraper');
const PostgreSQLService = require('./services/PostgreSQLService');
const { logger } = require('./utils/logger');
const { delay } = require('./utils/helpers');

class PostgresJobCollector {
  constructor() {
    this.scraper = new LinkedInScraper();
    this.dbService = new PostgreSQLService();
    this.processedJobs = new Set();
  }

  async collectJobs() {
    logger.info('🚀 Starting PostgreSQL job collection test...');
    
    try {
      // Your LinkedIn search URL
      const linkedinUrl = 'https://www.linkedin.com/jobs/search/?currentJobId=4194472113&geoId=104187078&keywords=quant%20%20(remote)&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true';
      
      // Get existing jobs to prevent duplicates
      const existingJobs = await this.dbService.getExistingJobs();
      this.processedJobs = new Set(existingJobs.map(job => job.url));
      
      logger.info(`📋 Found ${existingJobs.length} existing jobs in database`);
      
      // Scrape jobs from LinkedIn
      const scrapedJobs = await this.scraper.scrapeLinkedInJobs(linkedinUrl);
      
      // Filter new jobs
      const newJobs = scrapedJobs.filter(job => !this.processedJobs.has(job.url));
      
      logger.info(`✨ Found ${newJobs.length} new jobs to process`);
      
      // Process first 5 jobs for testing
      const testJobs = newJobs.slice(0, 5);
      let processedCount = 0;
      
      for (const job of testJobs) {
        try {
          await this.processJob(job);
          processedCount++;
          
          // Add delay between requests
          await delay(2000);
          
        } catch (error) {
          logger.error(`❌ Error processing job ${job.title}:`, error.message);
        }
      }
      
      logger.info(`✅ Successfully processed ${processedCount} jobs`);
      
      // Show results
      await this.showResults();
      
    } catch (error) {
      logger.error('❌ Error in job collection:', error);
      throw error;
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

      // Store in database
      const result = await this.dbService.createJob(processedJob);
      
      if (result) {
        logger.info(`✅ Stored in database: ${job.title}`);
      }
      
    } catch (error) {
      logger.error(`❌ Error processing job:`, error);
      throw error;
    }
  }

  createJobSummary(description) {
    if (!description) return '';
    
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyPoints = sentences.slice(0, 3).map(s => s.trim()).join('. ');
    
    return keyPoints.length > 300 ? keyPoints.substring(0, 300) + '...' : keyPoints;
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

  async showResults() {
    logger.info('\n📊 Collection Results:');
    
    // Get updated stats
    const stats = await this.dbService.getJobStats();
    logger.info(`📈 Database Stats:`, stats);
    
    // Get recent jobs
    const recentJobs = await this.dbService.getRecentJobs(5);
    logger.info(`\n📋 Recent Jobs (${recentJobs.length}):`);
    
    recentJobs.forEach((job, index) => {
      logger.info(`${index + 1}. ${job.title} at ${job.company}`);
      logger.info(`   Category: ${job.category}`);
      logger.info(`   Location: ${job.location}`);
      logger.info(`   Posted: ${job.posted_time}`);
      logger.info(`   URL: ${job.url}`);
      logger.info('');
    });
    
    // Get categories
    const categories = await this.dbService.getCategories();
    logger.info('📊 Job Categories:');
    categories.forEach(cat => {
      logger.info(`  ${cat.category}: ${cat.count} jobs`);
    });
  }
}

// Run the test
const collector = new PostgresJobCollector();
collector.collectJobs()
  .then(() => logger.info('🎉 Job collection test completed!'))
  .catch(error => logger.error('❌ Test failed:', error));
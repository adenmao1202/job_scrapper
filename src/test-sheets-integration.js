require('dotenv').config();
const LinkedInScraper = require('./services/LinkedInScraper');
const PostgreSQLService = require('./services/PostgreSQLService');
const GoogleSheetsService = require('./services/GoogleSheetsService');
const { logger } = require('./utils/logger');
const { delay } = require('./utils/helpers');

class SheetsIntegrationTest {
  constructor() {
    this.scraper = new LinkedInScraper();
    this.dbService = new PostgreSQLService();
    this.sheetsService = new GoogleSheetsService();
  }

  async runTest() {
    logger.info('🧪 Testing PostgreSQL + Google Sheets Integration...');
    
    try {
      // Test 1: Database Connection
      logger.info('\n📊 Test 1: PostgreSQL Connection');
      const stats = await this.dbService.getJobStats();
      logger.info(`✅ PostgreSQL connected. Current jobs: ${stats.total_jobs}`);
      
      // Test 2: LinkedIn Scraping
      logger.info('\n🔍 Test 2: LinkedIn Scraping');
      const linkedinUrl = 'https://www.linkedin.com/jobs/search/?currentJobId=4194472113&geoId=104187078&keywords=quant%20%20(remote)&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true';
      const scrapedJobs = await this.scraper.scrapeLinkedInJobs(linkedinUrl);
      logger.info(`✅ Scraped ${scrapedJobs.length} jobs from LinkedIn`);
      
      // Test 3: Process and Store Jobs
      logger.info('\n💾 Test 3: Processing and Storing Jobs');
      const existingJobs = await this.dbService.getExistingJobs();
      const existingUrls = new Set(existingJobs.map(job => job.url));
      const newJobs = scrapedJobs.filter(job => !existingUrls.has(job.url));
      
      logger.info(`Found ${newJobs.length} new jobs to process`);
      
      // Process first 3 jobs for testing
      const testJobs = newJobs.slice(0, 3);
      let processedCount = 0;
      
      for (const job of testJobs) {
        try {
          await this.processJob(job);
          processedCount++;
          await delay(1000); // Short delay for testing
        } catch (error) {
          logger.error(`Error processing job ${job.title}:`, error.message);
        }
      }
      
      logger.info(`✅ Processed ${processedCount} jobs to PostgreSQL`);
      
      // Test 4: Google Sheets Sync
      logger.info('\n📊 Test 4: Google Sheets Sync');
      await this.testGoogleSheetsSync();
      
      // Test 5: Show Final Results
      logger.info('\n📈 Test 5: Final Results');
      await this.showResults();
      
      logger.info('\n🎉 All tests completed successfully!');
      
    } catch (error) {
      logger.error('❌ Test failed:', error);
    }
  }

  async processJob(job) {
    const jobDetails = await this.scraper.getLinkedInJobDetails(job.url);
    
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

    const result = await this.dbService.createJob(processedJob);
    
    if (result) {
      logger.info(`✅ Stored: ${job.title} at ${job.company}`);
    }
  }

  async testGoogleSheetsSync() {
    try {
      // Get recent jobs from PostgreSQL
      const recentJobs = await this.dbService.getRecentJobs(10);
      
      if (recentJobs.length === 0) {
        logger.warn('No jobs found in PostgreSQL to sync');
        return;
      }
      
      logger.info(`Syncing ${recentJobs.length} jobs to Google Sheets...`);
      
      // Initialize Google Sheets (will work in mock mode if not configured)
      await this.sheetsService.createJobsSheet();
      
      // Sync jobs to Google Sheets
      await this.sheetsService.syncJobsToSheet(recentJobs);
      
      logger.info('✅ Google Sheets sync completed');
      
    } catch (error) {
      logger.error('❌ Google Sheets sync failed:', error);
    }
  }

  async showResults() {
    // Get updated database stats
    const stats = await this.dbService.getJobStats();
    logger.info(`📊 Database Stats:`, stats);
    
    // Get top companies
    const topCompanies = await this.dbService.getTopCompanies(5);
    logger.info(`🏢 Top Companies:`, topCompanies);
    
    // Get categories
    const categories = await this.dbService.getCategories();
    logger.info(`📋 Categories:`, categories);
    
    // Google Sheets info
    logger.info(`📱 Google Sheets URL: ${this.sheetsService.getSheetUrl()}`);
    
    logger.info('\n🎯 Next Steps:');
    logger.info('1. Set up Google Sheets API (optional - works in mock mode)');
    logger.info('2. Run: npm start (starts 2-hour automated collection)');
    logger.info('3. Access jobs on mobile via Google Sheets app');
    logger.info('4. PostgreSQL stores all data, Google Sheets shows latest jobs');
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
}

// Run the test
const test = new SheetsIntegrationTest();
test.runTest()
  .then(() => {
    logger.info('🎉 Integration test completed!');
    process.exit(0);
  })
  .catch(error => {
    logger.error('❌ Integration test failed:', error);
    process.exit(1);
  });
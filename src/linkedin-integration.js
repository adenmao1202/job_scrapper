require('dotenv').config();
const LinkedInScraper = require('./services/LinkedInScraper');
const MockAirtableService = require('./services/MockAirtableService');
const { logger } = require('./utils/logger');
const { delay } = require('./utils/helpers');

class LinkedInJobCollector {
  constructor() {
    this.scraper = new LinkedInScraper();
    this.airtable = new MockAirtableService(); // Use mock for testing
    this.processedJobs = new Set();
  }

  async collectLinkedInJobs(searchUrl) {
    logger.info('🚀 Starting LinkedIn job collection...');
    
    try {
      // Get existing jobs to prevent duplicates
      const existingJobs = await this.airtable.getExistingJobs();
      this.processedJobs = new Set(existingJobs.map(job => job.url));
      
      logger.info(`📋 Found ${existingJobs.length} existing jobs in database`);
      
      // Scrape jobs from LinkedIn
      const scrapedJobs = await this.scraper.scrapeLinkedInJobs(searchUrl);
      
      // Filter new jobs
      const newJobs = scrapedJobs.filter(job => !this.processedJobs.has(job.url));
      
      logger.info(`✨ Found ${newJobs.length} new jobs to process`);
      
      // Process and store new jobs
      let processedCount = 0;
      for (const job of newJobs) {
        try {
          await this.processJob(job);
          processedCount++;
          
          // Add delay between requests to be respectful
          await delay(parseInt(process.env.REQUEST_DELAY) || 3000);
          
        } catch (error) {
          logger.error(`❌ Error processing job ${job.title}:`, error.message);
        }
      }
      
      logger.info(`✅ Successfully processed ${processedCount} jobs from LinkedIn`);
      
      // Generate summary
      const summary = await this.generateSummary();
      logger.info('📊 Collection Summary:', summary);
      
      return {
        success: true,
        totalScraped: scrapedJobs.length,
        newJobs: newJobs.length,
        processed: processedCount,
        summary: summary
      };
      
    } catch (error) {
      logger.error('❌ Error in LinkedIn job collection:', error);
      throw error;
    }
  }

  async processJob(job) {
    try {
      logger.info(`⚙️ Processing job: ${job.title} at ${job.company}`);
      
      // Get detailed job information
      const jobDetails = await this.scraper.getLinkedInJobDetails(job.url);
      
      // Create processed job object
      const processedJob = {
        ...job,
        ...jobDetails,
        summary: this.createJobSummary(jobDetails.description),
        category: this.categorizeJob(job.title, jobDetails.description),
        requirements: this.extractRequirements(jobDetails.description),
        benefits: this.extractBenefits(jobDetails.description),
        dateAdded: new Date().toISOString(),
        status: 'new'
      };

      // Store in database
      await this.airtable.createJob(processedJob);
      
      logger.info(`✅ Successfully processed: ${job.title}`);
      
    } catch (error) {
      logger.error(`❌ Error processing job ${job.url}:`, error);
      throw error;
    }
  }

  createJobSummary(description) {
    if (!description) return '';
    
    // Extract key points from description
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyPoints = sentences.slice(0, 3).map(s => s.trim()).join('. ');
    
    return keyPoints.length > 300 ? keyPoints.substring(0, 300) + '...' : keyPoints;
  }

  categorizeJob(title, description) {
    const categories = {
      'Quantitative Research': ['quant', 'quantitative', 'research', 'analyst', 'brain'],
      'Machine Learning': ['machine learning', 'ml', 'ai', 'artificial intelligence', 'data science'],
      'Software Engineering': ['software', 'engineer', 'developer', 'programming', 'coding'],
      'Data Science': ['data scientist', 'data analyst', 'analytics', 'statistics'],
      'Finance': ['finance', 'financial', 'trading', 'investment', 'portfolio'],
      'Security': ['security', 'cybersecurity', 'assurance', 'risk'],
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

  async generateSummary() {
    const allJobs = this.airtable.getAllJobs();
    const categories = {};
    const companies = {};
    
    allJobs.forEach(job => {
      categories[job.category] = (categories[job.category] || 0) + 1;
      companies[job.company] = (companies[job.company] || 0) + 1;
    });
    
    return {
      totalJobs: allJobs.length,
      topCategories: Object.entries(categories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      topCompanies: Object.entries(companies)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      recentJobs: allJobs
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        .slice(0, 3)
        .map(job => ({ title: job.title, company: job.company }))
    };
  }
}

// Main execution
async function main() {
  const collector = new LinkedInJobCollector();
  const linkedinUrl = 'https://www.linkedin.com/jobs/search/?currentJobId=4194472113&geoId=104187078&keywords=quant%20%20(remote)&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true';
  
  try {
    const result = await collector.collectLinkedInJobs(linkedinUrl);
    
    if (result.success) {
      logger.info('🎉 LinkedIn job collection completed successfully!');
      logger.info(`📈 Results: ${result.processed}/${result.newJobs} new jobs processed`);
    }
    
  } catch (error) {
    logger.error('❌ LinkedIn job collection failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = LinkedInJobCollector;
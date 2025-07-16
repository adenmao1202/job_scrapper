require('dotenv').config();
const LinkedInScraper = require('./services/LinkedInScraper');
const { logger } = require('./utils/logger');
const { delay } = require('./utils/helpers');

// Mock Airtable Service for testing
class MockAirtableService {
  constructor() {
    this.jobs = [];
    this.recordIdCounter = 1;
    logger.info('📋 Using Mock Airtable Service for testing');
  }

  async getExistingJobs() {
    return this.jobs.map(job => ({
      id: job.id,
      url: job.url,
      title: job.title,
      company: job.company
    }));
  }

  async createJob(jobData) {
    const record = {
      id: `rec${this.recordIdCounter++}`,
      fields: {
        'Job Title': jobData.title,
        'Company': jobData.company,
        'Location': jobData.location,
        'Job URL': jobData.url,
        'Description': jobData.description || '',
        'Summary': jobData.summary || '',
        'Category': jobData.category || 'Other',
        'Source': 'LinkedIn',
        'Posted Time': jobData.postedTime || '',
        'Application Status': jobData.applicationStatus || '',
        'Job Type': jobData.jobType || 'Full-time',
        'Date Added': new Date().toISOString().split('T')[0],
        'Status': 'New',
        'Score': this.calculateJobScore(jobData),
        'Priority': this.determinePriority(jobData),
        'Tags': this.generateTags(jobData)
      },
      ...jobData
    };
    
    this.jobs.push(record);
    logger.info(`✅ Mock Airtable: Created ${jobData.title} at ${jobData.company}`);
    return record;
  }

  calculateJobScore(jobData) {
    let score = 0;
    const title = (jobData.title || '').toLowerCase();
    const description = (jobData.description || '').toLowerCase();
    
    if (title.includes('quant') || title.includes('researcher')) score += 50;
    if (title.includes('ai') || title.includes('machine learning')) score += 40;
    if (title.includes('senior') || title.includes('lead')) score += 30;
    if (title.includes('remote')) score += 20;
    
    const company = (jobData.company || '').toLowerCase();
    if (company.includes('worldquant') || company.includes('citadel')) score += 40;
    
    const postedTime = (jobData.postedTime || '').toLowerCase();
    if (postedTime.includes('hour') || postedTime.includes('day')) score += 30;
    if (postedTime.includes('week')) score += 20;
    
    return Math.min(score, 100);
  }

  determinePriority(jobData) {
    const score = this.calculateJobScore(jobData);
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  }

  generateTags(jobData) {
    const tags = [];
    const title = (jobData.title || '').toLowerCase();
    const description = (jobData.description || '').toLowerCase();
    
    if (title.includes('remote') || description.includes('remote')) tags.push('Remote');
    if (title.includes('quant')) tags.push('Quantitative');
    if (title.includes('ai') || title.includes('machine learning')) tags.push('AI/ML');
    if (title.includes('senior') || title.includes('lead')) tags.push('Senior');
    if (title.includes('intern')) tags.push('Internship');
    if (jobData.location && jobData.location.includes('Taiwan')) tags.push('Taiwan');
    
    return tags.join(', ');
  }

  async getJobStats() {
    return {
      total: this.jobs.length,
      new: this.jobs.filter(j => j.fields.Status === 'New').length,
      today: this.jobs.filter(j => j.fields['Date Added'] === new Date().toISOString().split('T')[0]).length,
      thisWeek: this.jobs.length,
      highPriority: this.jobs.filter(j => j.fields.Priority === 'High').length
    };
  }

  getAirtableViewUrl() {
    return 'https://airtable.com/YOUR_BASE_ID/YOUR_TABLE_NAME (configure in .env)';
  }

  getAllJobs() {
    return this.jobs;
  }
}

class AirtableTestCollector {
  constructor() {
    this.scraper = new LinkedInScraper();
    this.airtable = new MockAirtableService();
    this.processedJobs = new Set();
  }

  async testCollection() {
    logger.info('🚀 Testing Airtable Job Collection...');
    
    try {
      // Your LinkedIn search URL
      const linkedinUrl = 'https://www.linkedin.com/jobs/search/?currentJobId=4194472113&geoId=104187078&keywords=quant%20%20(remote)&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true';
      
      // Get existing jobs
      const existingJobs = await this.airtable.getExistingJobs();
      this.processedJobs = new Set(existingJobs.map(job => job.url));
      
      logger.info(`📋 Found ${existingJobs.length} existing jobs`);
      
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
          await delay(1000); // Shorter delay for testing
        } catch (error) {
          logger.error(`❌ Error processing job ${job.title}:`, error.message);
        }
      }
      
      // Show results
      await this.showResults();
      
      logger.info(`✅ Successfully processed ${processedCount} jobs`);
      
    } catch (error) {
      logger.error('❌ Error in test collection:', error);
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

      // Store in mock Airtable
      await this.airtable.createJob(processedJob);
      
    } catch (error) {
      logger.error(`❌ Error processing job:`, error);
      throw error;
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

  async showResults() {
    logger.info('\n📊 Airtable Test Results:');
    
    // Get stats
    const stats = await this.airtable.getJobStats();
    logger.info(`📈 Stats:`, stats);
    
    // Show sample jobs
    const jobs = this.airtable.getAllJobs();
    logger.info(`\n📋 Sample Jobs in Airtable Format:`);
    
    jobs.forEach((job, index) => {
      const fields = job.fields;
      logger.info(`\n${index + 1}. ${fields['Job Title']}`);
      logger.info(`   Company: ${fields['Company']}`);
      logger.info(`   Location: ${fields['Location']}`);
      logger.info(`   Category: ${fields['Category']}`);
      logger.info(`   Priority: ${fields['Priority']}`);
      logger.info(`   Score: ${fields['Score']}`);
      logger.info(`   Tags: ${fields['Tags']}`);
      logger.info(`   Status: ${fields['Status']}`);
      logger.info(`   Posted: ${fields['Posted Time']}`);
    });
    
    logger.info('\n🎯 Next Steps:');
    logger.info('1. Set up your Airtable base with these fields:');
    logger.info('   - Job Title, Company, Location, Job URL, Description');
    logger.info('   - Summary, Category, Priority, Score, Tags, Status');
    logger.info('   - Posted Time, Application Status, Job Type, Date Added');
    logger.info('2. Update .env with your Airtable API key and base ID');
    logger.info('3. Run: npm start');
  }
}

// Run the test
const testCollector = new AirtableTestCollector();
testCollector.testCollection()
  .then(() => logger.info('🎉 Airtable test completed!'))
  .catch(error => logger.error('❌ Test failed:', error));
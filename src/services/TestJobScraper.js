const { logger } = require('../utils/logger');
const { delay } = require('../utils/helpers');

class TestJobScraper {
  constructor() {
    this.mockJobs = [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        url: 'https://example.com/job1',
        source: 'test_scraping',
        scrapedAt: new Date().toISOString()
      },
      {
        title: 'Full Stack Developer',
        company: 'StartupXYZ',
        location: 'Remote',
        url: 'https://example.com/job2',
        source: 'test_scraping',
        scrapedAt: new Date().toISOString()
      },
      {
        title: 'Data Scientist',
        company: 'DataCorp',
        location: 'New York, NY',
        url: 'https://example.com/job3',
        source: 'test_scraping',
        scrapedAt: new Date().toISOString()
      }
    ];
  }

  async scrapeJobs(source) {
    logger.info(`TestScraper: Scraping jobs from ${source.name}...`);
    
    // Simulate network delay
    await delay(1000);
    
    // Return mock jobs
    const jobs = this.mockJobs.slice(0, 2); // Return first 2 jobs
    logger.info(`TestScraper: Found ${jobs.length} jobs from ${source.name}`);
    
    return jobs;
  }

  async getJobDetails(jobUrl) {
    logger.info(`TestScraper: Getting job details for ${jobUrl}`);
    
    // Simulate network delay
    await delay(500);
    
    // Return mock job details
    const mockDetails = {
      description: 'This is a sample job description with requirements for software development skills, experience with JavaScript, Node.js, and database management. The role involves building scalable web applications and working with cross-functional teams.',
      requirements: 'Bachelor\'s degree in Computer Science, 3+ years of experience, proficiency in JavaScript, Node.js, React, and SQL databases.',
      benefits: 'Health insurance, dental coverage, 401k matching, flexible work hours, remote work options.',
      fullDetails: true
    };
    
    return mockDetails;
  }
}

module.exports = TestJobScraper;
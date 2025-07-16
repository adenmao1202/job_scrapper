require('dotenv').config();
const JobScraper = require('./services/JobScraper');
const { logger } = require('./utils/logger');

async function testRealScraper() {
  logger.info('🌐 Testing Real Job Scraper...');
  
  const scraper = new JobScraper();
  
  // Test with a simple HTML page that won't block us
  const testSource = {
    name: 'Test Site',
    url: 'https://httpbin.org/html'
  };
  
  try {
    logger.info('📡 Testing HTTP request functionality...');
    const jobs = await scraper.scrapeJobs(testSource);
    logger.info(`✅ HTTP request successful. Found ${jobs.length} jobs (expected: 0 for this test site)`);
    
    // Test job details fetching
    logger.info('📄 Testing job details fetching...');
    const jobDetails = await scraper.getJobDetails('https://httpbin.org/html');
    logger.info('✅ Job details fetching successful');
    logger.info(`Description length: ${jobDetails.description.length}`);
    logger.info(`Full details: ${jobDetails.fullDetails}`);
    
    // Test with a real job site (be careful with rate limits)
    logger.info('🔍 Testing with a real job site (limited test)...');
    
    // Using a more scraper-friendly approach with a simple job site
    const realTestSource = {
      name: 'Remote OK',
      url: 'https://remoteok.io/'
    };
    
    try {
      const realJobs = await scraper.scrapeJobs(realTestSource);
      logger.info(`🎯 Real site test: Found ${realJobs.length} jobs`);
      
      if (realJobs.length > 0) {
        logger.info('Sample job:', realJobs[0]);
      }
    } catch (error) {
      logger.warn('Real site test failed (expected - many sites block scrapers):', error.message);
    }
    
  } catch (error) {
    logger.error('❌ Scraper test failed:', error);
  }
}

// Run the test
testRealScraper();
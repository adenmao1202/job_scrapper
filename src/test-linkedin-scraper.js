require('dotenv').config();
const LinkedInScraper = require('./services/LinkedInScraper');
const { logger } = require('./utils/logger');

async function testLinkedInScraper() {
  logger.info('🚀 Testing LinkedIn Scraper...');
  
  const scraper = new LinkedInScraper();
  const linkedinUrl = 'https://www.linkedin.com/jobs/search/?currentJobId=4194472113&geoId=104187078&keywords=quant%20%20(remote)&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true';
  
  try {
    // Test job listing scraping
    logger.info('📋 Testing job listing scraping...');
    const jobs = await scraper.scrapeLinkedInJobs(linkedinUrl);
    
    logger.info(`✅ Successfully scraped ${jobs.length} jobs from LinkedIn`);
    
    // Display first few jobs
    if (jobs.length > 0) {
      logger.info('\n📊 Sample Jobs:');
      jobs.slice(0, 5).forEach((job, index) => {
        logger.info(`\n${index + 1}. ${job.title}`);
        logger.info(`   Company: ${job.company}`);
        logger.info(`   Location: ${job.location}`);
        logger.info(`   URL: ${job.url}`);
        logger.info(`   Posted: ${job.postedTime || 'N/A'}`);
        logger.info(`   Status: ${job.applicationStatus || 'N/A'}`);
        logger.info(`   Type: ${job.jobType || 'N/A'}`);
      });
    }
    
    // Test job details scraping
    if (jobs.length > 0) {
      logger.info('\n📄 Testing job details scraping...');
      const firstJob = jobs[0];
      
      try {
        const jobDetails = await scraper.getLinkedInJobDetails(firstJob.url);
        
        logger.info(`✅ Successfully got job details for: ${firstJob.title}`);
        logger.info(`   Description length: ${jobDetails.description.length}`);
        logger.info(`   Has criteria: ${Object.keys(jobDetails.criteria).length > 0}`);
        logger.info(`   Has company info: ${Object.keys(jobDetails.companyInfo).length > 0}`);
        logger.info(`   Full details: ${jobDetails.fullDetails}`);
        
        if (jobDetails.description) {
          logger.info(`   Description preview: "${jobDetails.description.substring(0, 150)}..."`);
        }
        
        if (Object.keys(jobDetails.criteria).length > 0) {
          logger.info('   Job criteria:', jobDetails.criteria);
        }
        
        if (Object.keys(jobDetails.companyInfo).length > 0) {
          logger.info('   Company info:', jobDetails.companyInfo);
        }
        
      } catch (error) {
        logger.error(`❌ Error getting job details: ${error.message}`);
      }
    }
    
    // Test data quality
    logger.info('\n📊 Data Quality Analysis:');
    const validJobs = jobs.filter(job => job.title && job.company && job.url);
    const jobsWithLocation = jobs.filter(job => job.location);
    const jobsWithMetadata = jobs.filter(job => job.postedTime || job.applicationStatus);
    
    logger.info(`   Valid jobs (title, company, URL): ${validJobs.length}/${jobs.length}`);
    logger.info(`   Jobs with location: ${jobsWithLocation.length}/${jobs.length}`);
    logger.info(`   Jobs with metadata: ${jobsWithMetadata.length}/${jobs.length}`);
    
    // Test for common issues
    logger.info('\n⚠️ Potential Issues:');
    const duplicateUrls = jobs.filter((job, index) => 
      jobs.findIndex(j => j.url === job.url) !== index
    );
    
    if (duplicateUrls.length > 0) {
      logger.warn(`   Found ${duplicateUrls.length} duplicate URLs`);
    }
    
    const emptyTitles = jobs.filter(job => !job.title);
    if (emptyTitles.length > 0) {
      logger.warn(`   Found ${emptyTitles.length} jobs with empty titles`);
    }
    
    const emptyCompanies = jobs.filter(job => !job.company);
    if (emptyCompanies.length > 0) {
      logger.warn(`   Found ${emptyCompanies.length} jobs with empty companies`);
    }
    
    logger.info('\n🎉 LinkedIn scraper test completed!');
    
    return {
      success: true,
      jobCount: jobs.length,
      validJobs: validJobs.length,
      sample: jobs.slice(0, 3)
    };
    
  } catch (error) {
    logger.error('❌ LinkedIn scraper test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testLinkedInScraper()
  .then(result => {
    if (result.success) {
      logger.info(`✅ Test completed successfully! Found ${result.jobCount} jobs (${result.validJobs} valid)`);
    } else {
      logger.error(`❌ Test failed: ${result.error}`);
    }
  })
  .catch(error => {
    logger.error('❌ Test execution failed:', error.message);
  });
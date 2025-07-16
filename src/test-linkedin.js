require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { logger } = require('./utils/logger');

async function testLinkedInAccess() {
  logger.info('🔍 Testing LinkedIn URL accessibility...');
  
  const linkedinUrl = 'https://www.linkedin.com/jobs/search/?currentJobId=4194472113&geoId=104187078&keywords=quant%20%20(remote)&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true';
  
  try {
    // Test basic HTTP request
    const response = await axios.get(linkedinUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000
    });
    
    logger.info(`✅ HTTP Status: ${response.status}`);
    logger.info(`📄 Content Length: ${response.data.length}`);
    
    // Check if we got actual content or were blocked
    if (response.data.includes('linkedin.com')) {
      logger.info('✅ Successfully accessed LinkedIn page');
    } else {
      logger.warn('⚠️ May have been redirected or blocked');
    }
    
    // Parse HTML to understand structure
    const $ = cheerio.load(response.data);
    
    // Check for common LinkedIn job elements
    const jobCards = $('.job-search-card, .jobs-search-results__list-item, .job-card-container').length;
    const jobTitles = $('.job-card-list__title, .job-card-container__job-title, h3[data-test-id="job-title"]').length;
    const companies = $('.job-card-container__company-name, .job-card-list__company-name').length;
    
    logger.info(`📊 Found ${jobCards} job cards`);
    logger.info(`📊 Found ${jobTitles} job titles`);
    logger.info(`📊 Found ${companies} company names`);
    
    // Sample some text to understand the structure
    const pageText = $('body').text().substring(0, 500);
    logger.info('📝 Page sample:', pageText);
    
    // Look for specific selectors
    const possibleSelectors = [
      '.job-search-card',
      '.jobs-search-results__list-item',
      '.job-card-container',
      '.job-card-list__title',
      '.job-card-container__job-title',
      '[data-test-id="job-title"]',
      '.job-card-container__company-name',
      '.job-card-list__company-name'
    ];
    
    logger.info('🔍 Testing selectors:');
    possibleSelectors.forEach(selector => {
      const count = $(selector).length;
      if (count > 0) {
        logger.info(`  ✅ ${selector}: ${count} elements`);
        // Get sample text
        const sampleText = $(selector).first().text().trim();
        if (sampleText) {
          logger.info(`     Sample: "${sampleText.substring(0, 50)}..."`);
        }
      } else {
        logger.info(`  ❌ ${selector}: 0 elements`);
      }
    });
    
    // Check if we need to handle authentication or anti-bot measures
    if (response.data.includes('challenge') || response.data.includes('security') || response.data.includes('captcha')) {
      logger.warn('⚠️ LinkedIn may have anti-bot protection active');
    }
    
    return response.data;
    
  } catch (error) {
    logger.error('❌ Error accessing LinkedIn:', error.message);
    
    if (error.response) {
      logger.error(`HTTP Status: ${error.response.status}`);
      logger.error(`Response headers:`, error.response.headers);
    }
    
    throw error;
  }
}

// Run the test
testLinkedInAccess()
  .then(() => logger.info('✅ LinkedIn access test completed'))
  .catch(error => logger.error('❌ LinkedIn access test failed:', error.message));
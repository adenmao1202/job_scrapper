require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { logger } = require('./utils/logger');

async function analyzeLinkedInStructure() {
  logger.info('🔍 Analyzing LinkedIn job page structure...');
  
  const linkedinUrl = 'https://www.linkedin.com/jobs/search/?currentJobId=4194472113&geoId=104187078&keywords=quant%20%20(remote)&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true';
  
  try {
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
    
    const $ = cheerio.load(response.data);
    
    // Save HTML for debugging
    fs.writeFileSync('linkedin-debug.html', response.data);
    logger.info('💾 Saved HTML to linkedin-debug.html for analysis');
    
    // Analyze job cards
    const jobCards = $('.job-search-card');
    logger.info(`📊 Found ${jobCards.length} job cards`);
    
    if (jobCards.length > 0) {
      jobCards.each((index, element) => {
        if (index >= 3) return; // Only analyze first 3 jobs
        
        const $card = $(element);
        logger.info(`\n📋 Analyzing Job Card ${index + 1}:`);
        
        // Try different selectors for job title
        const titleSelectors = [
          '.job-card-list__title',
          '.job-card-container__job-title',
          'h3',
          '.job-card-list__title-text',
          '[data-test-id="job-title"]',
          'a[data-test-id="job-title"]',
          '.job-card-list__title a',
          '.artdeco-entity-lockup__title'
        ];
        
        let title = '';
        titleSelectors.forEach(selector => {
          const titleEl = $card.find(selector);
          if (titleEl.length > 0 && !title) {
            title = titleEl.text().trim();
            logger.info(`  ✅ Title (${selector}): "${title}"`);
          }
        });
        
        // Try different selectors for company
        const companySelectors = [
          '.job-card-container__company-name',
          '.job-card-list__company-name',
          '.artdeco-entity-lockup__subtitle',
          '.job-card-container__primary-description',
          '.job-card-list__company-name-text'
        ];
        
        let company = '';
        companySelectors.forEach(selector => {
          const companyEl = $card.find(selector);
          if (companyEl.length > 0 && !company) {
            company = companyEl.text().trim();
            logger.info(`  ✅ Company (${selector}): "${company}"`);
          }
        });
        
        // Try different selectors for location
        const locationSelectors = [
          '.job-card-container__metadata-item',
          '.job-card-list__metadata',
          '.artdeco-entity-lockup__caption',
          '.job-card-container__secondary-description'
        ];
        
        let location = '';
        locationSelectors.forEach(selector => {
          const locationEl = $card.find(selector);
          if (locationEl.length > 0 && !location) {
            location = locationEl.text().trim();
            logger.info(`  ✅ Location (${selector}): "${location}"`);
          }
        });
        
        // Try to get the job URL
        const urlSelectors = [
          'a[data-test-id="job-title"]',
          '.job-card-list__title a',
          '.artdeco-entity-lockup__title a',
          'a[href*="/jobs/view/"]'
        ];
        
        let jobUrl = '';
        urlSelectors.forEach(selector => {
          const urlEl = $card.find(selector);
          if (urlEl.length > 0 && !jobUrl) {
            const href = urlEl.attr('href');
            if (href) {
              jobUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
              logger.info(`  ✅ URL (${selector}): "${jobUrl}"`);
            }
          }
        });
        
        // Get raw HTML snippet for debugging
        const htmlSnippet = $card.html().substring(0, 200);
        logger.info(`  📝 HTML snippet: ${htmlSnippet}...`);
        
        // Get all text content
        const allText = $card.text().replace(/\s+/g, ' ').trim();
        logger.info(`  📄 Full text: "${allText.substring(0, 150)}..."`);
      });
    }
    
    // Look for pagination or load more elements
    const paginationSelectors = [
      '.jobs-search-pagination',
      '.artdeco-pagination',
      '[data-test-id="pagination"]',
      '.jobs-search-results__pagination'
    ];
    
    logger.info('\n🔄 Checking for pagination:');
    paginationSelectors.forEach(selector => {
      const paginationEl = $(selector);
      if (paginationEl.length > 0) {
        logger.info(`  ✅ Found pagination: ${selector}`);
      }
    });
    
    // Check for infinite scroll or load more
    const loadMoreSelectors = [
      '[data-test-id="load-more-button"]',
      '.jobs-search-results__load-more',
      '.artdeco-button--load-more'
    ];
    
    logger.info('\n⬇️ Checking for load more:');
    loadMoreSelectors.forEach(selector => {
      const loadMoreEl = $(selector);
      if (loadMoreEl.length > 0) {
        logger.info(`  ✅ Found load more: ${selector}`);
      }
    });
    
    return {
      success: true,
      jobCount: jobCards.length,
      mainSelector: '.job-search-card'
    };
    
  } catch (error) {
    logger.error('❌ Error analyzing LinkedIn structure:', error.message);
    throw error;
  }
}

// Run the analysis
analyzeLinkedInStructure()
  .then(result => {
    logger.info('✅ LinkedIn structure analysis completed');
    logger.info(`📊 Summary: Found ${result.jobCount} jobs using selector: ${result.mainSelector}`);
  })
  .catch(error => logger.error('❌ LinkedIn analysis failed:', error.message));
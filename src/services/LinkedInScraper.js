const axios = require('axios');
const cheerio = require('cheerio');
const { logger } = require('../utils/logger');
const { delay, sanitizeText } = require('../utils/helpers');

class LinkedInScraper {
  constructor() {
    this.axiosInstance = axios.create({
      timeout: parseInt(process.env.TIMEOUT) || 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
  }

  async scrapeLinkedInJobs(searchUrl) {
    try {
      logger.info(`🔍 Scraping LinkedIn jobs from: ${searchUrl}`);
      
      const response = await this.axiosInstance.get(searchUrl);
      const $ = cheerio.load(response.data);
      
      const jobs = [];
      const jobCards = $('.job-search-card');
      
      logger.info(`📊 Found ${jobCards.length} job cards on LinkedIn`);
      
      jobCards.each((index, element) => {
        try {
          const job = this.extractLinkedInJobData($, element);
          if (job && job.title && job.url) {
            jobs.push(job);
          }
        } catch (error) {
          logger.error(`Error extracting job data from card ${index}:`, error.message);
        }
      });
      
      logger.info(`✅ Successfully extracted ${jobs.length} jobs from LinkedIn`);
      return jobs;
      
    } catch (error) {
      logger.error('❌ Error scraping LinkedIn jobs:', error.message);
      return [];
    }
  }

  extractLinkedInJobData($, element) {
    const $card = $(element);
    
    // Extract job title
    const title = this.extractTitle($card);
    
    // Extract company name
    const company = this.extractCompany($card);
    
    // Extract location
    const location = this.extractLocation($card);
    
    // Extract job URL
    const url = this.extractJobUrl($card);
    
    // Extract additional metadata
    const metadata = this.extractMetadata($card);
    
    return {
      title: sanitizeText(title),
      company: sanitizeText(company),
      location: sanitizeText(location),
      url: url,
      source: 'linkedin',
      scrapedAt: new Date().toISOString(),
      ...metadata
    };
  }

  extractTitle($card) {
    const titleSelectors = [
      '.base-search-card__title a',
      '.base-search-card__title',
      '.job-search-card__title',
      'h3',
      '.job-card-list__title',
      '.job-card-container__job-title',
      '.job-card-list__title-text',
      '[data-test-id="job-title"]',
      '.artdeco-entity-lockup__title'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = $card.find(selector);
      if (titleElement.length > 0) {
        const title = titleElement.text().trim();
        if (title) return title;
      }
    }
    
    return '';
  }

  extractCompany($card) {
    const companySelectors = [
      '.base-search-card__subtitle a',
      '.base-search-card__subtitle',
      '.job-search-card__company-name',
      '.job-card-container__company-name',
      '.job-card-list__company-name',
      '.artdeco-entity-lockup__subtitle',
      '.job-card-container__primary-description',
      '.job-card-list__company-name-text'
    ];
    
    for (const selector of companySelectors) {
      const companyElement = $card.find(selector);
      if (companyElement.length > 0) {
        const company = companyElement.text().trim();
        if (company) return company;
      }
    }
    
    // Fallback: try to extract company from full text
    const fullText = $card.text();
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line);
    
    // Company is often the second line after title
    if (lines.length >= 2) {
      const potentialCompany = lines[1];
      if (potentialCompany && 
          !potentialCompany.includes('ago') && 
          !potentialCompany.includes('applicant') &&
          !potentialCompany.includes('hour') &&
          !potentialCompany.includes('day') &&
          !potentialCompany.includes('week') &&
          !potentialCompany.includes('month') &&
          potentialCompany.length > 2 &&
          potentialCompany.length < 100) {
        return potentialCompany;
      }
    }
    
    // Try third line if second line failed
    if (lines.length >= 3) {
      const potentialCompany = lines[2];
      if (potentialCompany && 
          !potentialCompany.includes('ago') && 
          !potentialCompany.includes('applicant') &&
          !potentialCompany.includes('hour') &&
          !potentialCompany.includes('day') &&
          !potentialCompany.includes('week') &&
          !potentialCompany.includes('month') &&
          potentialCompany.length > 2 &&
          potentialCompany.length < 100) {
        return potentialCompany;
      }
    }
    
    logger.warn(`⚠️ Could not extract company name from job card`);
    return 'Unknown Company';
  }

  extractLocation($card) {
    const locationSelectors = [
      '.job-search-card__location',
      '.base-search-card__metadata',
      '.job-card-container__metadata-item',
      '.job-card-list__metadata',
      '.artdeco-entity-lockup__caption',
      '.job-card-container__secondary-description'
    ];
    
    for (const selector of locationSelectors) {
      const locationElement = $card.find(selector);
      if (locationElement.length > 0) {
        const location = locationElement.text().trim();
        if (location && !location.includes('ago')) {
          return location;
        }
      }
    }
    
    // Fallback: extract from full text
    const fullText = $card.text();
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line);
    
    // Look for location patterns
    for (const line of lines) {
      if (line.includes('Taiwan') || line.includes('Taipei') || line.includes('Remote') || 
          line.includes('City') || line.includes('County') || line.includes('District')) {
        return line;
      }
    }
    
    return '';
  }

  extractJobUrl($card) {
    const urlSelectors = [
      '.base-card__full-link',
      '.base-search-card__title a',
      'a[href*="/jobs/view/"]',
      'a[data-test-id="job-title"]',
      '.job-card-list__title a',
      '.artdeco-entity-lockup__title a'
    ];
    
    for (const selector of urlSelectors) {
      const urlElement = $card.find(selector);
      if (urlElement.length > 0) {
        const href = urlElement.attr('href');
        if (href) {
          // Convert relative URLs to absolute
          if (href.startsWith('/')) {
            return `https://www.linkedin.com${href}`;
          }
          return href;
        }
      }
    }
    
    return '';
  }

  extractMetadata($card) {
    const fullText = $card.text();
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line);
    
    const metadata = {};
    
    // Extract posting time
    for (const line of lines) {
      if (line.includes('ago') || line.includes('week') || line.includes('day') || line.includes('hour')) {
        metadata.postedTime = line;
        break;
      }
    }
    
    // Extract application status
    for (const line of lines) {
      if (line.includes('applicant') || line.includes('Actively Hiring') || line.includes('early applicant')) {
        metadata.applicationStatus = line;
        break;
      }
    }
    
    // Extract job type hints
    if (fullText.toLowerCase().includes('remote')) {
      metadata.jobType = 'remote';
    } else if (fullText.toLowerCase().includes('hybrid')) {
      metadata.jobType = 'hybrid';
    } else {
      metadata.jobType = 'on-site';
    }
    
    return metadata;
  }

  async getLinkedInJobDetails(jobUrl) {
    try {
      logger.info(`📄 Fetching LinkedIn job details: ${jobUrl}`);
      
      // Add delay to respect rate limits
      await delay(parseInt(process.env.REQUEST_DELAY) || 2000);
      
      const response = await this.axiosInstance.get(jobUrl);
      const $ = cheerio.load(response.data);
      
      // Extract job description
      const description = this.extractJobDescription($);
      
      // Extract job criteria
      const criteria = this.extractJobCriteria($);
      
      // Extract company info
      const companyInfo = this.extractCompanyInfo($);
      
      return {
        description: sanitizeText(description),
        criteria: criteria,
        companyInfo: companyInfo,
        fullDetails: true
      };
      
    } catch (error) {
      logger.error(`❌ Error fetching LinkedIn job details for ${jobUrl}:`, error.message);
      return {
        description: '',
        criteria: {},
        companyInfo: {},
        fullDetails: false
      };
    }
  }

  extractJobDescription($) {
    const descriptionSelectors = [
      '.jobs-box__html-content .jobs-description-content__text',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '.jobs-description__content',
      '.jobs-description-content__text div',
      '.description__text',
      '[data-job-description-container]',
      '.jobs-box-list-container',
      '.jobs-box__html-content div'
    ];

    for (const selector of descriptionSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }

    return '';
  }

  extractJobCriteria($) {
    const criteria = {};
    
    // Look for job criteria section
    const criteriaSelectors = [
      '.jobs-unified-top-card__job-insight',
      '.jobs-box__group',
      '.jobs-unified-top-card__job-insight-view-model'
    ];
    
    criteriaSelectors.forEach(selector => {
      $(selector).each((index, element) => {
        const text = $(element).text().trim();
        if (text.includes('Employment type')) {
          criteria.employmentType = text;
        } else if (text.includes('Job function')) {
          criteria.jobFunction = text;
        } else if (text.includes('Industries')) {
          criteria.industries = text;
        } else if (text.includes('Seniority level')) {
          criteria.seniorityLevel = text;
        }
      });
    });
    
    return criteria;
  }

  extractCompanyInfo($) {
    const companyInfo = {};
    
    // Extract company name
    const companyNameSelectors = [
      '.jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__subtitle-primary',
      '.jobs-company__box .jobs-company__name'
    ];
    
    companyNameSelectors.forEach(selector => {
      const element = $(selector);
      if (element.length > 0 && !companyInfo.name) {
        companyInfo.name = element.text().trim();
      }
    });
    
    // Extract company size/industry
    const companyMetaSelectors = [
      '.jobs-unified-top-card__subtitle-secondary',
      '.jobs-company__box .jobs-company__industry'
    ];
    
    companyMetaSelectors.forEach(selector => {
      const element = $(selector);
      if (element.length > 0) {
        companyInfo.industry = element.text().trim();
      }
    });
    
    return companyInfo;
  }
}

module.exports = LinkedInScraper;
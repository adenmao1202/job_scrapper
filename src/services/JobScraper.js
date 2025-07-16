const axios = require('axios');
const cheerio = require('cheerio');
const { logger } = require('../utils/logger');
const { delay } = require('../utils/helpers');

class JobScraper {
  constructor() {
    this.axiosInstance = axios.create({
      timeout: parseInt(process.env.TIMEOUT) || 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
  }

  async scrapeJobs(source) {
    try {
      const jobs = [];
      
      // This is a simplified example - in practice, you'd need specific selectors for each job site
      const response = await this.axiosInstance.get(source.url);
      const $ = cheerio.load(response.data);
      
      // Example selectors (would need to be customized for each site)
      const jobSelectors = this.getJobSelectors(source.name);
      
      $(jobSelectors.container).each((index, element) => {
        try {
          const job = this.extractJobData($, element, jobSelectors);
          if (job && job.title && job.company) {
            jobs.push(job);
          }
        } catch (error) {
          logger.error(`Error extracting job data:`, error);
        }
      });
      
      return jobs;
      
    } catch (error) {
      logger.error(`Error scraping jobs from ${source.name}:`, error);
      return [];
    }
  }

  getJobSelectors(sourceName) {
    const selectors = {
      'Indeed': {
        container: '[data-jk]',
        title: 'h2.jobTitle a span',
        company: '.companyName',
        location: '.companyLocation',
        url: 'h2.jobTitle a'
      },
      'LinkedIn': {
        container: '.job-search-card',
        title: '.job-search-card__title',
        company: '.job-search-card__subtitle-primary',
        location: '.job-search-card__location',
        url: '.job-search-card__title'
      }
    };

    return selectors[sourceName] || selectors['Indeed'];
  }

  extractJobData($, element, selectors) {
    try {
      const $element = $(element);
      
      return {
        title: $element.find(selectors.title).text().trim(),
        company: $element.find(selectors.company).text().trim(),
        location: $element.find(selectors.location).text().trim(),
        url: this.getJobUrl($element.find(selectors.url).attr('href')),
        source: 'web_scraping',
        scrapedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error extracting job data from element:', error);
      return null;
    }
  }

  getJobUrl(href) {
    if (!href) return '';
    
    // Handle relative URLs
    if (href.startsWith('/')) {
      return `https://www.indeed.com${href}`;
    }
    
    return href;
  }

  async getJobDetails(jobUrl) {
    try {
      const response = await this.axiosInstance.get(jobUrl);
      const $ = cheerio.load(response.data);
      
      // Extract job description and other details
      const description = this.extractJobDescription($);
      const requirements = this.extractJobRequirements($);
      const benefits = this.extractJobBenefits($);
      
      return {
        description,
        requirements,
        benefits,
        fullDetails: true
      };
      
    } catch (error) {
      logger.error(`Error getting job details for ${jobUrl}:`, error);
      return {
        description: '',
        requirements: '',
        benefits: '',
        fullDetails: false
      };
    }
  }

  extractJobDescription($) {
    // Try multiple common selectors for job descriptions
    const selectors = [
      '.jobsearch-jobDescriptionText',
      '.job-description',
      '[data-testid="job-description"]',
      '.description'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }

    return '';
  }

  extractJobRequirements($) {
    const requirementSelectors = [
      '.requirements',
      '.job-requirements',
      '[data-testid="requirements"]'
    ];

    for (const selector of requirementSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }

    return '';
  }

  extractJobBenefits($) {
    const benefitSelectors = [
      '.benefits',
      '.job-benefits',
      '[data-testid="benefits"]'
    ];

    for (const selector of benefitSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }

    return '';
  }
}

module.exports = JobScraper;
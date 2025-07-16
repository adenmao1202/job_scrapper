const { google } = require('googleapis');
const { logger } = require('../utils/logger');

class SimpleGoogleSheetsService {
  constructor() {
    // Load environment variables
    require('dotenv').config();
    
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    this.privateKeyPath = process.env.GOOGLE_PRIVATE_KEY_PATH;
    this.serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    this.sheets = null;
    
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      if (!this.privateKeyPath || !this.spreadsheetId) {
        logger.warn('⚠️ Google Sheets service account or Sheet ID not configured, using mock mode');
        this.sheets = null;
        return;
      }

      // Use service account authentication
      if (this.serviceAccountJson) {
        // Production: use JSON from environment variable
        this.auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(this.serviceAccountJson),
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else {
        // Development: use key file
        this.auth = new google.auth.GoogleAuth({
          keyFile: this.privateKeyPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      logger.info('✅ Google Sheets API initialized with service account');
    } catch (error) {
      logger.warn('⚠️ Google Sheets auth failed, using mock mode:', error.message);
      this.sheets = null;
    }
  }

  async testConnection() {
    if (!this.sheets) {
      logger.info('📝 Google Sheets in mock mode - no service account configured');
      return false;
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      logger.info(`✅ Connected to Google Sheet: ${response.data.properties.title}`);
      return true;
    } catch (error) {
      logger.error('❌ Google Sheets connection failed:', error.message);
      this.sheets = null;
      return false;
    }
  }

  async createJobsSheet() {
    if (!this.sheets) {
      logger.info('📝 Mock mode: Would create Google Sheets headers');
      return;
    }

    try {
      // Create the header row
      const headers = [
        'Job Title',
        'Company', 
        'Location',
        'Category',
        'Priority',
        'Score',
        'Posted Time',
        'Status',
        'Job URL',
        'Summary',
        'Date Added',
        'Tags'
      ];

      // Set headers (use generic range that works with any sheet name)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'A1:L1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      logger.info('✅ Google Sheets headers created');
    } catch (error) {
      logger.error('❌ Error creating Google Sheets headers:', error.message);
      this.sheets = null;
    }
  }

  async syncJobsToSheet(jobs) {
    if (!this.sheets) {
      logger.info('📝 Mock mode: Would sync jobs to Google Sheets');
      this.mockSyncJobs(jobs);
      return;
    }

    try {
      logger.info(`📊 Syncing ${jobs.length} jobs to Google Sheets...`);

      // Sort jobs by score (highest first) for better ranking
      const sortedJobs = jobs.sort((a, b) => {
        const scoreA = this.calculateScore(a);
        const scoreB = this.calculateScore(b);
        return scoreB - scoreA; // Descending order (highest score first)
      });

      // Prepare all job data
      const rowsData = sortedJobs.map(job => {
        const priority = this.calculatePriority(job);
        const score = this.calculateScore(job);
        const tags = this.generateTags(job);
        
        // Handle date_added properly
        let dateAdded = '';
        if (job.date_added) {
          if (typeof job.date_added === 'string') {
            dateAdded = job.date_added.includes('T') ? job.date_added.split('T')[0] : job.date_added;
          } else if (job.date_added instanceof Date) {
            dateAdded = job.date_added.toISOString().split('T')[0];
          }
        } else {
          dateAdded = new Date().toISOString().split('T')[0];
        }

        return [
          job.title || '',
          job.company || '',
          job.location || '',
          job.category || '',
          priority,
          score,
          job.posted_time || '',
          job.status || 'New',
          job.url || '',
          (job.summary || '').substring(0, 100) + (job.summary && job.summary.length > 100 ? '...' : ''),
          dateAdded,
          tags
        ];
      });

      // Clear existing data (except headers)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'A2:L1000'
      });

      // Add all jobs at once
      if (rowsData.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'A2',
          valueInputOption: 'RAW',
          requestBody: {
            values: rowsData
          }
        });
      }

      logger.info(`✅ Successfully synced ${jobs.length} jobs to Google Sheets`);
    } catch (error) {
      logger.error('❌ Error syncing jobs to Google Sheets:', error.message);
      this.sheets = null;
    }
  }

  mockSyncJobs(jobs) {
    logger.info('\n📊 Mock Google Sheets Preview:');
    logger.info('=' .repeat(90));
    logger.info('| Job Title                    | Company          | Priority | Score | Status |');
    logger.info('=' .repeat(90));
    
    jobs.slice(0, 10).forEach(job => {
      const priority = this.calculatePriority(job);
      const score = this.calculateScore(job);
      
      logger.info(`| ${(job.title || '').substring(0, 28).padEnd(28)} | ${(job.company || '').substring(0, 16).padEnd(16)} | ${priority.padEnd(8)} | ${score.toString().padEnd(5)} | ${(job.status || 'New').padEnd(6)} |`);
    });
    
    logger.info('=' .repeat(90));
    logger.info(`📊 Total jobs: ${jobs.length}`);
    logger.info('📱 To see in real Google Sheets, follow the setup guide in GOOGLE_SHEETS_SETUP.md');
  }

  calculatePriority(job) {
    const score = this.calculateScore(job);
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  }

  calculateScore(job) {
    let score = 0;
    
    const title = (job.title || '').toLowerCase();
    const description = (job.description || '').toLowerCase();
    const company = (job.company || '').toLowerCase();
    const postedTime = (job.posted_time || '').toLowerCase();
    
    // Perfect match keywords (highest priority)
    if (title.includes('quantitative researcher') || title.includes('quant researcher')) score += 70;
    if (title.includes('quantitative analyst') || title.includes('quant analyst')) score += 60;
    if (title.includes('research analyst') && title.includes('quant')) score += 65;
    
    // Core quant keywords
    if (title.includes('quant') && !title.includes('senior')) score += 50;
    if (title.includes('researcher') && !title.includes('senior')) score += 40;
    if (title.includes('analyst') && !title.includes('senior')) score += 35;
    
    // Remote work bonus
    if (title.includes('remote') || description.includes('remote')) score += 25;
    
    // Junior-friendly positions (BONUS for junior level)
    if (title.includes('junior') || title.includes('entry') || title.includes('associate')) score += 30;
    if (title.includes('intern') || title.includes('internship')) score += 40;
    if (title.includes('graduate') || title.includes('new grad')) score += 35;
    
    // Experience level penalties (REDUCE score for senior positions)
    if (title.includes('senior') || title.includes('lead') || title.includes('principal')) score -= 40;
    if (title.includes('director') || title.includes('head') || title.includes('chief')) score -= 50;
    if (title.includes('vp') || title.includes('vice president')) score -= 60;
    
    // Skills matching
    if (title.includes('python') || description.includes('python')) score += 15;
    if (title.includes('r ') || description.includes(' r ') || title.includes('r,')) score += 15;
    if (title.includes('statistics') || title.includes('statistical')) score += 20;
    if (title.includes('mathematics') || title.includes('math')) score += 20;
    if (title.includes('finance') || title.includes('financial')) score += 15;
    
    // AI/ML bonus (relevant for modern quant roles)
    if (title.includes('machine learning') || title.includes('ai')) score += 25;
    if (title.includes('data science') || title.includes('data scientist')) score += 20;
    
    // Company reputation (quant-focused firms)
    if (company.includes('worldquant') || company.includes('citadel')) score += 50;
    if (company.includes('two sigma') || company.includes('renaissance')) score += 50;
    if (company.includes('de shaw') || company.includes('aqr')) score += 45;
    if (company.includes('point72') || company.includes('millennium')) score += 45;
    if (company.includes('jump trading') || company.includes('optiver')) score += 40;
    if (company.includes('jane street') || company.includes('susquehanna')) score += 40;
    
    // Tech companies with quant teams
    if (company.includes('google') || company.includes('meta')) score += 25;
    if (company.includes('amazon') || company.includes('microsoft')) score += 20;
    
    // Recent postings bonus
    if (postedTime.includes('hour') || postedTime.includes('hours')) score += 20;
    if (postedTime.includes('day') || postedTime.includes('days')) score += 15;
    if (postedTime.includes('week')) score += 10;
    
    // Location bonus for remote or flexible
    if (description.includes('work from home') || description.includes('wfh')) score += 15;
    if (description.includes('hybrid') || description.includes('flexible')) score += 10;
    
    // Ensure score is within bounds
    return Math.max(0, Math.min(score, 100));
  }

  generateTags(job) {
    const tags = [];
    const title = (job.title || '').toLowerCase();
    const description = (job.description || '').toLowerCase();
    
    if (title.includes('remote') || description.includes('remote')) tags.push('Remote');
    if (title.includes('quant')) tags.push('Quant');
    if (title.includes('ai') || title.includes('machine learning')) tags.push('AI/ML');
    if (title.includes('senior') || title.includes('lead')) tags.push('Senior');
    if (title.includes('intern')) tags.push('Intern');
    if (job.location && job.location.includes('Taiwan')) tags.push('Taiwan');
    
    return tags.join(', ');
  }

  getSheetUrl() {
    if (this.spreadsheetId && this.spreadsheetId !== 'your_google_sheet_id_here') {
      return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`;
    }
    return 'Configure Google Sheets to get direct link';
  }
}

module.exports = SimpleGoogleSheetsService;
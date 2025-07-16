const { google } = require('googleapis');
const path = require('path');
const { logger } = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    // Load environment variables
    require('dotenv').config();
    
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.sheets = null;
    this.auth = null;
    
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      // For testing, we'll use a simple API key approach
      // In production, you'd use service account credentials
      this.auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_PRIVATE_KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      logger.info('✅ Google Sheets API initialized');
    } catch (error) {
      logger.warn('⚠️ Google Sheets auth not configured, using mock mode');
      this.sheets = null;
    }
  }

  async createJobsSheet() {
    if (!this.sheets) {
      logger.warn('Google Sheets not configured, skipping sheet creation');
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

      // Clear and set headers
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:Z'
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      // Format header row
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: headers.length
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.6, blue: 1.0 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                  }
                },
                fields: 'userEnteredFormat'
              }
            }
          ]
        }
      });

      logger.info('✅ Google Sheets headers created and formatted');
    } catch (error) {
      logger.error('Error creating Google Sheets headers:', error);
    }
  }

  async addJobToSheet(job) {
    if (!this.sheets) {
      // Mock mode - just log what would be added
      logger.info(`📝 Mock Sheets: Would add ${job.title} at ${job.company}`);
      return;
    }

    try {
      const priority = this.calculatePriority(job);
      const score = this.calculateScore(job);
      const tags = this.generateTags(job);

      const rowData = [
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
        new Date().toISOString().split('T')[0], // Date added
        tags
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:L',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData]
        }
      });

      logger.info(`✅ Added to Google Sheets: ${job.title}`);
    } catch (error) {
      logger.error('Error adding job to Google Sheets:', error);
    }
  }

  async syncJobsToSheet(jobs) {
    if (!this.sheets) {
      logger.info('📝 Mock Sheets: Would sync jobs to Google Sheets');
      this.mockSyncJobs(jobs);
      return;
    }

    try {
      logger.info(`📊 Syncing ${jobs.length} jobs to Google Sheets...`);

      // Prepare all job data
      const rowsData = jobs.map(job => {
        const priority = this.calculatePriority(job);
        const score = this.calculateScore(job);
        const tags = this.generateTags(job);

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
          job.date_added ? job.date_added.split('T')[0] : new Date().toISOString().split('T')[0],
          tags
        ];
      });

      // Clear existing data (except headers)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A2:Z'
      });

      // Add all jobs at once
      if (rowsData.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Sheet1!A2',
          valueInputOption: 'RAW',
          requestBody: {
            values: rowsData
          }
        });
      }

      // Apply formatting for better mobile viewing
      await this.formatSheet(jobs.length + 1);

      logger.info(`✅ Successfully synced ${jobs.length} jobs to Google Sheets`);
    } catch (error) {
      logger.error('Error syncing jobs to Google Sheets:', error);
    }
  }

  mockSyncJobs(jobs) {
    logger.info('\n📊 Mock Google Sheets Preview:');
    logger.info('=' .repeat(80));
    logger.info('| Job Title              | Company      | Priority | Score | Status |');
    logger.info('=' .repeat(80));
    
    jobs.slice(0, 5).forEach(job => {
      const priority = this.calculatePriority(job);
      const score = this.calculateScore(job);
      
      logger.info(`| ${(job.title || '').substring(0, 22).padEnd(22)} | ${(job.company || '').substring(0, 12).padEnd(12)} | ${priority.padEnd(8)} | ${score.toString().padEnd(5)} | ${(job.status || 'New').padEnd(6)} |`);
    });
    
    logger.info('=' .repeat(80));
    logger.info(`Total jobs: ${jobs.length}`);
    logger.info('📱 Access on mobile: Open Google Sheets app → Your spreadsheet');
  }

  async formatSheet(lastRow) {
    if (!this.sheets) return;

    try {
      const requests = [
        // Auto-resize columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: 0,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 12
            }
          }
        },
        // Freeze header row
        {
          updateSheetProperties: {
            properties: {
              sheetId: 0,
              gridProperties: {
                frozenRowCount: 1
              }
            },
            fields: 'gridProperties.frozenRowCount'
          }
        },
        // Apply conditional formatting for priorities
        {
          addConditionalFormatRule: {
            rule: {
              ranges: [{ sheetId: 0, startRowIndex: 1, endRowIndex: lastRow, startColumnIndex: 4, endColumnIndex: 5 }],
              booleanRule: {
                condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'High' }] },
                format: { backgroundColor: { red: 1, green: 0.6, blue: 0.6 } }
              }
            },
            index: 0
          }
        },
        {
          addConditionalFormatRule: {
            rule: {
              ranges: [{ sheetId: 0, startRowIndex: 1, endRowIndex: lastRow, startColumnIndex: 4, endColumnIndex: 5 }],
              booleanRule: {
                condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Medium' }] },
                format: { backgroundColor: { red: 1, green: 1, blue: 0.6 } }
              }
            },
            index: 1
          }
        }
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests }
      });

      logger.info('✅ Applied Google Sheets formatting');
    } catch (error) {
      logger.error('Error formatting Google Sheets:', error);
    }
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
    
    // High value keywords
    if (title.includes('quant') || title.includes('researcher')) score += 50;
    if (title.includes('ai') || title.includes('machine learning')) score += 40;
    if (title.includes('senior') || title.includes('lead')) score += 30;
    if (title.includes('remote')) score += 20;
    
    // Company reputation
    const company = (job.company || '').toLowerCase();
    if (company.includes('worldquant') || company.includes('citadel')) score += 40;
    if (company.includes('google') || company.includes('meta')) score += 35;
    
    // Recent postings
    const postedTime = (job.posted_time || '').toLowerCase();
    if (postedTime.includes('hour') || postedTime.includes('day')) score += 30;
    if (postedTime.includes('week')) score += 20;
    
    return Math.min(score, 100);
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
    return 'Configure GOOGLE_SHEET_ID in .env to get direct link';
  }
}

module.exports = GoogleSheetsService;
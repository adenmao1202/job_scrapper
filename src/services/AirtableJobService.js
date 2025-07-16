const Airtable = require('airtable');
const { logger } = require('../utils/logger');

class AirtableJobService {
  constructor() {
    // Load environment variables
    require('dotenv').config();
    
    this.base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);
    
    this.table = this.base(process.env.AIRTABLE_TABLE_NAME || 'Jobs');
  }

  async getExistingJobs() {
    try {
      const records = await this.table.select({
        fields: ['Job URL', 'Job Title', 'Company'],
        maxRecords: 1000
      }).all();

      return records.map(record => ({
        id: record.id,
        url: record.get('Job URL'),
        title: record.get('Job Title'),
        company: record.get('Company')
      }));
      
    } catch (error) {
      logger.error('Error fetching existing jobs from Airtable:', error);
      return [];
    }
  }

  async createJob(jobData) {
    try {
      const record = await this.table.create([
        {
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
            'Date Added': new Date().toISOString().split('T')[0], // YYYY-MM-DD format
            'Status': 'New',
            'Score': this.calculateJobScore(jobData),
            'Priority': this.determinePriority(jobData),
            'Tags': this.generateTags(jobData)
          }
        }
      ]);

      logger.info(`✅ Created Airtable record: ${jobData.title} at ${jobData.company}`);
      return record[0];
      
    } catch (error) {
      if (error.statusCode === 422 && error.message.includes('duplicate')) {
        logger.warn(`⚠️ Job already exists: ${jobData.title} at ${jobData.company}`);
        return null;
      }
      logger.error('Error creating job in Airtable:', error);
      throw error;
    }
  }

  calculateJobScore(jobData) {
    let score = 0;
    
    // Score based on job type relevance
    const title = (jobData.title || '').toLowerCase();
    const description = (jobData.description || '').toLowerCase();
    
    // High value keywords
    if (title.includes('quant') || title.includes('researcher')) score += 50;
    if (title.includes('ai') || title.includes('machine learning')) score += 40;
    if (title.includes('senior') || title.includes('lead')) score += 30;
    if (title.includes('remote')) score += 20;
    
    // Company reputation (you can customize this)
    const company = (jobData.company || '').toLowerCase();
    if (company.includes('worldquant') || company.includes('citadel')) score += 40;
    if (company.includes('google') || company.includes('meta')) score += 35;
    if (company.includes('startup')) score += 10;
    
    // Recent postings get higher scores
    const postedTime = (jobData.postedTime || '').toLowerCase();
    if (postedTime.includes('hour') || postedTime.includes('day')) score += 30;
    if (postedTime.includes('week')) score += 20;
    
    return Math.min(score, 100); // Cap at 100
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
    
    // Add relevant tags
    if (title.includes('remote') || description.includes('remote')) tags.push('Remote');
    if (title.includes('quant')) tags.push('Quantitative');
    if (title.includes('ai') || title.includes('machine learning')) tags.push('AI/ML');
    if (title.includes('senior') || title.includes('lead')) tags.push('Senior');
    if (title.includes('intern')) tags.push('Internship');
    if (jobData.location && jobData.location.includes('Taiwan')) tags.push('Taiwan');
    
    return tags.join(', ');
  }

  async updateJobStatus(recordId, status) {
    try {
      const record = await this.table.update([
        {
          id: recordId,
          fields: {
            'Status': status,
            'Last Updated': new Date().toISOString()
          }
        }
      ]);

      logger.info(`✅ Updated job status: ${recordId} -> ${status}`);
      return record[0];
      
    } catch (error) {
      logger.error('Error updating job status:', error);
      throw error;
    }
  }

  async getJobStats() {
    try {
      // Get all records for stats calculation
      const records = await this.table.select({
        fields: ['Status', 'Date Added', 'Category', 'Priority'],
        maxRecords: 1000
      }).all();

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const stats = {
        total: records.length,
        new: records.filter(r => r.get('Status') === 'New').length,
        today: records.filter(r => r.get('Date Added') === today).length,
        thisWeek: records.filter(r => r.get('Date Added') >= weekAgo).length,
        highPriority: records.filter(r => r.get('Priority') === 'High').length
      };

      return stats;
    } catch (error) {
      logger.error('Error getting job stats:', error);
      return { total: 0, new: 0, today: 0, thisWeek: 0, highPriority: 0 };
    }
  }

  // Helper method to get direct Airtable view URL
  getAirtableViewUrl() {
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Jobs';
    return `https://airtable.com/${baseId}/${tableName}`;
  }
}

module.exports = AirtableJobService;
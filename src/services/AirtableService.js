const Airtable = require('airtable');
const { logger } = require('../utils/logger');

class AirtableService {
  constructor() {
    this.base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);
    
    this.table = this.base(process.env.AIRTABLE_TABLE_NAME || 'Jobs');
  }

  async getExistingJobs() {
    try {
      const records = await this.table.select({
        fields: ['URL', 'Title', 'Company']
      }).all();

      return records.map(record => ({
        id: record.id,
        url: record.get('URL'),
        title: record.get('Title'),
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
            'Title': jobData.title,
            'Company': jobData.company,
            'Location': jobData.location,
            'URL': jobData.url,
            'Description': jobData.description,
            'Summary': jobData.summary,
            'Requirements': jobData.requirements,
            'Benefits': jobData.benefits,
            'Category': jobData.category,
            'Source': jobData.source,
            'Date Added': jobData.dateAdded,
            'Status': jobData.status,
            'Scraped At': jobData.scrapedAt
          }
        }
      ]);

      logger.info(`Created job record in Airtable: ${jobData.title}`);
      return record[0];
      
    } catch (error) {
      logger.error('Error creating job in Airtable:', error);
      throw error;
    }
  }

  async updateJob(recordId, updates) {
    try {
      const record = await this.table.update([
        {
          id: recordId,
          fields: updates
        }
      ]);

      logger.info(`Updated job record in Airtable: ${recordId}`);
      return record[0];
      
    } catch (error) {
      logger.error('Error updating job in Airtable:', error);
      throw error;
    }
  }

  async deleteJob(recordId) {
    try {
      await this.table.destroy([recordId]);
      logger.info(`Deleted job record from Airtable: ${recordId}`);
      
    } catch (error) {
      logger.error('Error deleting job from Airtable:', error);
      throw error;
    }
  }

  async searchJobs(query) {
    try {
      const records = await this.table.select({
        filterByFormula: `OR(
          FIND(LOWER("${query}"), LOWER({Title})),
          FIND(LOWER("${query}"), LOWER({Company})),
          FIND(LOWER("${query}"), LOWER({Description}))
        )`
      }).all();

      return records.map(record => ({
        id: record.id,
        title: record.get('Title'),
        company: record.get('Company'),
        location: record.get('Location'),
        url: record.get('URL'),
        category: record.get('Category'),
        status: record.get('Status'),
        dateAdded: record.get('Date Added')
      }));
      
    } catch (error) {
      logger.error('Error searching jobs in Airtable:', error);
      return [];
    }
  }
}

module.exports = AirtableService;
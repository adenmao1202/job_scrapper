const { logger } = require('../utils/logger');

class MockAirtableService {
  constructor() {
    this.jobs = [];
    this.recordIdCounter = 1;
  }

  async getExistingJobs() {
    logger.info('MockAirtable: Fetching existing jobs...');
    return this.jobs.map(job => ({
      id: job.id,
      url: job.url,
      title: job.title,
      company: job.company
    }));
  }

  async createJob(jobData) {
    logger.info('MockAirtable: Creating job record...');
    
    const record = {
      id: `rec${this.recordIdCounter++}`,
      ...jobData,
      createdAt: new Date().toISOString()
    };
    
    this.jobs.push(record);
    logger.info(`MockAirtable: Created job record: ${jobData.title} at ${jobData.company}`);
    
    return record;
  }

  async updateJob(recordId, updates) {
    logger.info(`MockAirtable: Updating job record: ${recordId}`);
    
    const jobIndex = this.jobs.findIndex(job => job.id === recordId);
    if (jobIndex !== -1) {
      this.jobs[jobIndex] = { ...this.jobs[jobIndex], ...updates };
      return this.jobs[jobIndex];
    }
    
    throw new Error(`Job with ID ${recordId} not found`);
  }

  async deleteJob(recordId) {
    logger.info(`MockAirtable: Deleting job record: ${recordId}`);
    
    const jobIndex = this.jobs.findIndex(job => job.id === recordId);
    if (jobIndex !== -1) {
      this.jobs.splice(jobIndex, 1);
    }
  }

  async searchJobs(query) {
    logger.info(`MockAirtable: Searching jobs for: ${query}`);
    
    const lowerQuery = query.toLowerCase();
    return this.jobs.filter(job => 
      job.title.toLowerCase().includes(lowerQuery) ||
      job.company.toLowerCase().includes(lowerQuery) ||
      (job.description && job.description.toLowerCase().includes(lowerQuery))
    );
  }

  // Helper method to get all jobs for testing
  getAllJobs() {
    return this.jobs;
  }

  // Helper method to clear all jobs for testing
  clearJobs() {
    this.jobs = [];
    this.recordIdCounter = 1;
  }
}

module.exports = MockAirtableService;
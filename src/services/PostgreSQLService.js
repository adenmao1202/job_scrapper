const { Pool } = require('pg');
const { logger } = require('../utils/logger');

class PostgreSQLService {
  constructor() {
    // Load environment variables
    require('dotenv').config();
    
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'job_scraper',
      user: process.env.DB_USER || 'mouyasushi',
      password: process.env.DB_PASSWORD || '',
      max: 10, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection on startup
    this.testConnection();
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('✅ PostgreSQL connection established successfully');
    } catch (error) {
      logger.error('❌ PostgreSQL connection failed:', error.message);
      throw error;
    }
  }

  async getExistingJobs() {
    try {
      const query = 'SELECT id, url, title, company FROM jobs ORDER BY date_added DESC';
      const result = await this.pool.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        url: row.url,
        title: row.title,
        company: row.company
      }));
    } catch (error) {
      logger.error('Error fetching existing jobs:', error);
      return [];
    }
  }

  async createJob(jobData) {
    try {
      const query = `
        INSERT INTO jobs (
          title, company, location, url, description, summary, requirements, 
          benefits, category, source, posted_time, application_status, job_type,
          scraped_at, date_added, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      
      const values = [
        jobData.title,
        jobData.company,
        jobData.location,
        jobData.url,
        jobData.description,
        jobData.summary,
        jobData.requirements,
        jobData.benefits,
        jobData.category,
        jobData.source,
        jobData.postedTime,
        jobData.applicationStatus,
        jobData.jobType,
        jobData.scrapedAt,
        jobData.dateAdded,
        jobData.status
      ];

      const result = await this.pool.query(query, values);
      
      logger.info(`✅ Created job record: ${jobData.title} at ${jobData.company}`);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        logger.warn(`⚠️ Job already exists: ${jobData.title} at ${jobData.company}`);
        return null;
      }
      logger.error('Error creating job:', error);
      throw error;
    }
  }

  async updateJob(jobId, updates) {
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE jobs 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 
        RETURNING *
      `;
      
      const values = [jobId, ...Object.values(updates)];
      const result = await this.pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Job with ID ${jobId} not found`);
      }
      
      logger.info(`✅ Updated job record: ${jobId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating job:', error);
      throw error;
    }
  }

  async deleteJob(jobId) {
    try {
      const query = 'DELETE FROM jobs WHERE id = $1 RETURNING *';
      const result = await this.pool.query(query, [jobId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Job with ID ${jobId} not found`);
      }
      
      logger.info(`✅ Deleted job record: ${jobId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting job:', error);
      throw error;
    }
  }

  async searchJobs(searchTerm, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT * FROM jobs 
        WHERE 
          to_tsvector('english', title || ' ' || company || ' ' || COALESCE(description, '')) 
          @@ plainto_tsquery('english', $1)
        ORDER BY date_added DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.pool.query(query, [searchTerm, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error searching jobs:', error);
      return [];
    }
  }

  async getJobsByCategory(category, limit = 50) {
    try {
      const query = `
        SELECT * FROM jobs 
        WHERE category = $1 
        ORDER BY date_added DESC 
        LIMIT $2
      `;
      
      const result = await this.pool.query(query, [category, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting jobs by category:', error);
      return [];
    }
  }

  async getRecentJobs(limit = 50) {
    try {
      const query = `
        SELECT * FROM recent_jobs 
        LIMIT $1
      `;
      
      const result = await this.pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting recent jobs:', error);
      return [];
    }
  }

  async getJobStats() {
    try {
      const result = await this.pool.query('SELECT * FROM job_stats');
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting job stats:', error);
      return {
        total_jobs: 0,
        unique_companies: 0,
        unique_categories: 0,
        new_jobs: 0,
        jobs_today: 0,
        jobs_this_week: 0
      };
    }
  }

  async getJobsByCompany(company, limit = 50) {
    try {
      const query = `
        SELECT * FROM jobs 
        WHERE company ILIKE $1 
        ORDER BY date_added DESC 
        LIMIT $2
      `;
      
      const result = await this.pool.query(query, [`%${company}%`, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting jobs by company:', error);
      return [];
    }
  }

  async getCategories() {
    try {
      const query = `
        SELECT category, COUNT(*) as count 
        FROM jobs 
        WHERE category IS NOT NULL 
        GROUP BY category 
        ORDER BY count DESC
      `;
      
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting categories:', error);
      return [];
    }
  }

  async getTopCompanies(limit = 10) {
    try {
      const query = `
        SELECT company, COUNT(*) as job_count 
        FROM jobs 
        GROUP BY company 
        ORDER BY job_count DESC 
        LIMIT $1
      `;
      
      const result = await this.pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting top companies:', error);
      return [];
    }
  }

  async close() {
    await this.pool.end();
    logger.info('PostgreSQL connection pool closed');
  }
}

module.exports = PostgreSQLService;
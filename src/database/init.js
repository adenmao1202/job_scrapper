const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

class DatabaseInitializer {
  constructor() {
    // Load environment variables
    require('dotenv').config();
    
    // Use DATABASE_URL for production (Render) or individual params for development
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'job_scraper',
        user: process.env.DB_USER || 'mouyasushi',
        password: process.env.DB_PASSWORD || '',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('✅ Database connection established successfully');
      return true;
    } catch (error) {
      logger.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async checkIfTablesExist() {
    try {
      const query = `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'jobs'
        ) as jobs_exists;
      `;
      
      const result = await this.pool.query(query);
      return result.rows[0].jobs_exists;
    } catch (error) {
      logger.error('Error checking if tables exist:', error);
      return false;
    }
  }

  async createTables() {
    try {
      logger.info('🔧 Creating database tables...');
      
      // Create jobs table
      const createJobsTable = `
        CREATE TABLE IF NOT EXISTS jobs (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          company VARCHAR(255) NOT NULL,
          location VARCHAR(255),
          url VARCHAR(500) UNIQUE NOT NULL,
          description TEXT,
          summary TEXT,
          requirements TEXT,
          benefits TEXT,
          category VARCHAR(100),
          source VARCHAR(50),
          posted_time VARCHAR(100),
          application_status VARCHAR(100),
          job_type VARCHAR(50),
          scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'new',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await this.pool.query(createJobsTable);
      logger.info('✅ Jobs table created successfully');

      // Create indexes
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);',
        'CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);',
        'CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);',
        'CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);',
        'CREATE INDEX IF NOT EXISTS idx_jobs_date_added ON jobs(date_added);',
        'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);',
        'CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);',
        'CREATE INDEX IF NOT EXISTS idx_jobs_description_fts ON jobs USING GIN(to_tsvector(\'english\', description));',
        'CREATE INDEX IF NOT EXISTS idx_jobs_title_fts ON jobs USING GIN(to_tsvector(\'english\', title));'
      ];

      for (const index of indexes) {
        await this.pool.query(index);
      }
      logger.info('✅ Database indexes created successfully');

      // Create trigger function
      const createTriggerFunction = `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `;

      await this.pool.query(createTriggerFunction);
      logger.info('✅ Trigger function created successfully');

      // Create trigger
      const createTrigger = `
        DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
        CREATE TRIGGER update_jobs_updated_at 
          BEFORE UPDATE ON jobs 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
      `;

      await this.pool.query(createTrigger);
      logger.info('✅ Update trigger created successfully');

      // Create views
      const createRecentJobsView = `
        CREATE OR REPLACE VIEW recent_jobs AS
        SELECT 
          id,
          title,
          company,
          location,
          url,
          category,
          posted_time,
          application_status,
          job_type,
          date_added,
          status,
          CASE 
            WHEN LENGTH(description) > 200 THEN SUBSTRING(description, 1, 200) || '...'
            ELSE description
          END as short_description
        FROM jobs
        ORDER BY date_added DESC;
      `;

      await this.pool.query(createRecentJobsView);
      logger.info('✅ Recent jobs view created successfully');

      const createJobStatsView = `
        CREATE OR REPLACE VIEW job_stats AS
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(DISTINCT company) as unique_companies,
          COUNT(DISTINCT category) as unique_categories,
          COUNT(CASE WHEN status = 'new' THEN 1 END) as new_jobs,
          COUNT(CASE WHEN date_added >= NOW() - INTERVAL '24 hours' THEN 1 END) as jobs_today,
          COUNT(CASE WHEN date_added >= NOW() - INTERVAL '7 days' THEN 1 END) as jobs_this_week
        FROM jobs;
      `;

      await this.pool.query(createJobStatsView);
      logger.info('✅ Job stats view created successfully');

      return true;
    } catch (error) {
      logger.error('❌ Error creating database tables:', error);
      throw error;
    }
  }

  async initialize() {
    try {
      logger.info('🚀 Starting database initialization...');
      
      // Test connection
      await this.testConnection();
      
      // Check if tables exist
      const tablesExist = await this.checkIfTablesExist();
      
      if (!tablesExist) {
        logger.info('📋 Tables do not exist, creating them...');
        await this.createTables();
        logger.info('✅ Database initialization completed successfully');
      } else {
        logger.info('✅ Database tables already exist, skipping creation');
      }
      
      return true;
    } catch (error) {
      logger.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}

module.exports = DatabaseInitializer;

// Run initialization if this file is executed directly
if (require.main === module) {
  const initializer = new DatabaseInitializer();
  initializer.initialize()
    .then(() => {
      logger.info('✅ Database initialization completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('❌ Database initialization failed:', error);
      process.exit(1);
    });
}
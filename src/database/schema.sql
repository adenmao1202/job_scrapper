-- Create database schema for job collection
CREATE DATABASE job_scraper;

-- Connect to job_scraper database
\c job_scraper;

-- Create jobs table
CREATE TABLE jobs (
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

-- Create indexes for better performance
CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_date_added ON jobs(date_added);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_source ON jobs(source);

-- Create full-text search index for job descriptions
CREATE INDEX idx_jobs_description_fts ON jobs USING GIN(to_tsvector('english', description));
CREATE INDEX idx_jobs_title_fts ON jobs USING GIN(to_tsvector('english', title));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for recent jobs
CREATE VIEW recent_jobs AS
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

-- Create view for job statistics
CREATE VIEW job_stats AS
SELECT 
    COUNT(*) as total_jobs,
    COUNT(DISTINCT company) as unique_companies,
    COUNT(DISTINCT category) as unique_categories,
    COUNT(CASE WHEN status = 'new' THEN 1 END) as new_jobs,
    COUNT(CASE WHEN date_added >= NOW() - INTERVAL '24 hours' THEN 1 END) as jobs_today,
    COUNT(CASE WHEN date_added >= NOW() - INTERVAL '7 days' THEN 1 END) as jobs_this_week
FROM jobs;
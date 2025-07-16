const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const PostgreSQLService = require('../services/PostgreSQLService');
const { logger } = require('../utils/logger');

const app = express();
const port = process.env.PORT || 3000;

// Initialize database service
const dbService = new PostgreSQLService();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// Get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await dbService.getJobStats();
    const categories = await dbService.getCategories();
    const topCompanies = await dbService.getTopCompanies(5);
    
    res.json({
      stats,
      categories,
      topCompanies
    });
  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent jobs
app.get('/api/jobs/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const jobs = await dbService.getRecentJobs(limit);
    res.json(jobs);
  } catch (error) {
    logger.error('Error getting recent jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search jobs
app.get('/api/jobs/search', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const jobs = await dbService.searchJobs(q, parseInt(limit), parseInt(offset));
    res.json(jobs);
  } catch (error) {
    logger.error('Error searching jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get jobs by category
app.get('/api/jobs/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const jobs = await dbService.getJobsByCategory(category, limit);
    res.json(jobs);
  } catch (error) {
    logger.error('Error getting jobs by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get jobs by company
app.get('/api/jobs/company/:company', async (req, res) => {
  try {
    const { company } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const jobs = await dbService.getJobsByCompany(company, limit);
    res.json(jobs);
  } catch (error) {
    logger.error('Error getting jobs by company:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await dbService.getCategories();
    res.json(categories);
  } catch (error) {
    logger.error('Error getting categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await dbService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await dbService.close();
  process.exit(0);
});

// Start server
app.listen(port, () => {
  logger.info(`🚀 Job scraper web interface running at http://localhost:${port}`);
  logger.info(`📱 Mobile-friendly interface available`);
});

module.exports = app;
require('dotenv').config();
const cron = require('node-cron');
const JobCollector = require('./services/JobCollector');
const { logger } = require('./utils/logger');

const jobCollector = new JobCollector();

// Run job collection every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  logger.info('Starting daily job collection...');
  
  try {
    await jobCollector.collectJobs();
    logger.info('Daily job collection completed successfully');
  } catch (error) {
    logger.error('Error during job collection:', error);
  }
});

// Run immediately on startup for testing
if (process.env.NODE_ENV !== 'production') {
  logger.info('Running job collection on startup...');
  jobCollector.collectJobs()
    .then(() => logger.info('Initial job collection completed'))
    .catch(error => logger.error('Initial job collection failed:', error));
}

logger.info('Job collector service started');
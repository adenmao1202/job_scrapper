# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js job automation system that scrapes job listings from various sources (replacing RSS feeds) and stores them in Airtable. The system runs scheduled collections, processes job data, and prevents duplicates.

## Tech Stack

- Node.js with Express-style architecture
- Airtable for data storage
- Cheerio for HTML parsing
- Axios for HTTP requests
- node-cron for scheduling

## Common Commands

```bash
npm install          # Install dependencies
npm start           # Run the job collector
npm run dev         # Development mode with auto-restart
npm test            # Run tests
npm run lint        # Run ESLint
```

## Architecture

- `src/index.js` - Main entry point with cron scheduling
- `src/services/JobCollector.js` - Core collection orchestration
- `src/services/JobScraper.js` - Web scraping functionality
- `src/services/AirtableService.js` - Database operations
- `src/utils/` - Logging and helper utilities

## Key Implementation Details

- Runs daily at 9 AM via cron job
- Scrapes job boards using CSS selectors
- Implements retry logic and rate limiting
- Categorizes jobs automatically
- Creates job summaries without AI
- Stores structured data in Airtable

## Environment Configuration

Required environment variables:
- `AIRTABLE_API_KEY` - Airtable API access
- `AIRTABLE_BASE_ID` - Target Airtable base
- `AIRTABLE_TABLE_NAME` - Jobs table name
- `INDEED_BASE_URL` / `LINKEDIN_BASE_URL` - Scraping targets
- `REQUEST_DELAY` - Rate limiting between requests

## Development Notes

- Web scraping selectors may need updates as sites change
- Rate limiting is critical to avoid being blocked
- Follow robots.txt and terms of service
- Test scraping logic thoroughly before production
# Daily Job Collector

Automated job collection system that scrapes job listings from various sources and stores them in Airtable.

## Features

- Web scraping from job boards (replacing RSS feeds)
- Airtable integration for job storage
- Duplicate detection and prevention
- Job categorization and summarization
- Scheduled daily collection
- Error handling and logging

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with:
   - Airtable API key and base ID
   - Job board URLs
   - Scraping configuration

4. Create an Airtable base with these fields:
   - Title (Single line text)
   - Company (Single line text)
   - Location (Single line text)
   - URL (URL)
   - Description (Long text)
   - Summary (Long text)
   - Requirements (Long text)
   - Benefits (Long text)
   - Category (Single select)
   - Source (Single line text)
   - Date Added (Date)
   - Status (Single select)
   - Scraped At (Date)

## Usage

Run the job collector:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Configuration

The system runs automatically every day at 9 AM. You can modify the schedule in `src/index.js`.

## Security

- Never commit your `.env` file
- Use environment variables for all API keys
- Respect rate limits when scraping
- Follow robots.txt guidelines

## Limitations

- Web scraping selectors may need updates as sites change
- Some job boards may have anti-scraping measures
- Rate limiting is essential to avoid being blocked
# Testing Guide

## Quick Start

1. **Install and setup:**
```bash
npm run setup
```

2. **Run basic test:**
```bash
npm test
```

3. **Test scraper functionality:**
```bash
npm run test:scraper
```

## Test Results

### ✅ Basic Test (npm test)
- **Mock Services**: Uses MockAirtableService and TestJobScraper
- **Tests**: Job collection, processing, storage, and search
- **Expected**: All tests pass, shows 4 processed jobs
- **Purpose**: Verify core logic without external dependencies

### ⚠️ Scraper Test (npm run test:scraper)
- **Real HTTP**: Tests actual HTTP requests and HTML parsing
- **Limitations**: Many job sites block scrapers
- **Expected**: HTTP functionality works, but job extraction may return 0 results
- **Purpose**: Verify network connectivity and parsing logic

## Setting Up for Production

### 1. Get Airtable Credentials
```bash
# Visit https://airtable.com/developers/web/api/introduction
# Create a base with these fields:
# - Title (Single line text)
# - Company (Single line text)
# - Location (Single line text)
# - URL (URL)
# - Description (Long text)
# - Summary (Long text)
# - Requirements (Long text)
# - Benefits (Long text)
# - Category (Single select)
# - Source (Single line text)
# - Date Added (Date)
# - Status (Single select)
# - Scraped At (Date)
```

### 2. Update .env file
```bash
# Replace these values in .env:
AIRTABLE_API_KEY=your_actual_api_key
AIRTABLE_BASE_ID=your_actual_base_id
```

### 3. Test with real Airtable
```bash
# Modify src/services/JobCollector.js to use real AirtableService:
# Replace: const MockAirtableService = require('./MockAirtableService');
# With: const AirtableService = require('./AirtableService');
```

## Development Tips

### Running with Mock Services
- Use `npm test` for development
- No external dependencies required
- Safe for testing logic changes

### Running with Real Services
- Update .env with real credentials
- Use `npm start` for production
- Be mindful of rate limits

### Debugging
- Check logs for detailed execution info
- Use NODE_ENV=development for extra logging
- Test individual components separately

## Known Issues

1. **Web Scraping Limitations**
   - Many job sites block automated requests
   - Selectors may need updates as sites change
   - Rate limiting is essential

2. **Solutions**
   - Use job board APIs where available
   - Implement proper delays between requests
   - Add user-agent rotation
   - Consider using headless browser for complex sites

## Next Steps

1. **Customize Selectors**: Update JobScraper.js with real job site selectors
2. **Add More Sources**: Extend the scraper to support more job boards
3. **Implement Notifications**: Add email/Slack notifications for new jobs
4. **Add Tests**: Create proper unit tests with Jest
5. **Deploy**: Set up on a server with proper scheduling
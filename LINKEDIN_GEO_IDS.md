# LinkedIn Geographic IDs Reference

## Popular Locations

| Location | Geo ID | Description |
|----------|--------|-------------|
| **Taiwan** | 104187078 | All of Taiwan |
| **United States** | 103644278 | All of United States |
| **Remote** | - | Use keywords "remote" instead |
| **San Francisco Bay Area** | 90000084 | SF Bay Area |
| **New York City** | 105080838 | NYC Metro Area |
| **London** | 101165590 | Greater London |
| **Singapore** | 102454443 | Singapore |
| **Hong Kong** | 102454424 | Hong Kong SAR |
| **Tokyo** | 101174742 | Greater Tokyo Area |
| **Sydney** | 105365761 | Greater Sydney Area |

## How to Find More Geo IDs

1. Go to LinkedIn job search: https://www.linkedin.com/jobs/search/
2. Select your desired location using the location filter
3. Check the URL for `geoId=` parameter
4. Copy the number after `geoId=`

Example: `https://www.linkedin.com/jobs/search/?geoId=104187078` → Geo ID is `104187078`

## Usage in Environment Variables

Update your `.env` file:

```env
# For Taiwan jobs
JOB_GEO_ID=104187078

# For US jobs
JOB_GEO_ID=103644278

# For SF Bay Area
JOB_GEO_ID=90000084
```

## Keywords vs Location

- **JOB_KEYWORDS**: What type of job you want (e.g., "quant", "machine learning", "data scientist")
- **JOB_GEO_ID**: Where you want the job to be located
- **Remote Jobs**: Include "remote" in keywords rather than using a specific geo ID

## Example Configurations

### Remote Quant Jobs Globally
```env
JOB_KEYWORDS=quant remote
JOB_GEO_ID=103644278
```

### Machine Learning Jobs in Taiwan
```env
JOB_KEYWORDS=machine learning AI
JOB_GEO_ID=104187078
```

### Senior Data Scientist in Singapore
```env
JOB_KEYWORDS=senior data scientist
JOB_GEO_ID=102454443
```
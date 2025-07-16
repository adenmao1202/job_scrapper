# Job Scoring and Priority System Documentation

## Overview
The job scraping system automatically assigns scores and priorities to scraped jobs based on various criteria to help you focus on the most relevant opportunities.

## Priority Levels

**Priority** is calculated based on the job's **Score**:
- **High**: Score ≥ 80 points
- **Medium**: Score ≥ 60 points  
- **Low**: Score < 60 points

## Scoring Algorithm

The system calculates a score (0-100) based on several factors:

### 1. Job Title Keywords (High Value)
- **"quant" or "researcher"**: +50 points
- **"ai" or "machine learning"**: +40 points
- **"senior" or "lead"**: +30 points
- **"remote"**: +20 points

### 2. Company Reputation
- **Top-tier firms** (WorldQuant, Citadel): +40 points
- **Tech giants** (Google, Meta): +35 points

### 3. Job Freshness
- **Posted within hours/days**: +30 points
- **Posted within weeks**: +20 points

### 4. Additional Factors
- **Location preferences**: Taiwan-based jobs get bonus points
- **Job level**: Senior positions get higher scores
- **Internships**: Clearly marked and scored appropriately

## Example Scoring

**High Priority Job (Score: 85)**
- Title: "Senior Quant Researcher - AI/ML" (+50 + 30 + 40 = 120, capped at 100)
- Company: WorldQuant (+40)
- Posted: 2 hours ago (+30)
- **Final Score: 100 → High Priority**

**Medium Priority Job (Score: 65)**
- Title: "Machine Learning Engineer" (+40)
- Posted: 1 week ago (+20)
- Remote: Yes (+20)
- **Final Score: 80 → High Priority**

**Low Priority Job (Score: 45)**
- Title: "Financial Analyst" (+0)
- Company: Unknown (+0)
- Posted: 3 weeks ago (+0)
- **Final Score: 0 → Low Priority**

## Summary Column

The **Summary** column contains:
- First 2 key sentences from the job description
- Automatically extracted without AI
- Truncated to 100 characters in Google Sheets view
- Full summary available in PostgreSQL database

## Customizing the Scoring

You can modify the scoring algorithm in:
- **File**: `src/services/SimpleGoogleSheetsService.js`
- **Function**: `calculateScore(job)` (lines 194-217)

To adjust keyword weights, company preferences, or add new criteria, edit the scoring logic in that function.
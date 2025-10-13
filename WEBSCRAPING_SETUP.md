# Web Scraping Data Collection - Setup Guide

## Overview
This guide explains how to set up the web scraping system that was implemented to fix the data collection delays. The system now uses Firecrawl for efficient web scraping and processes jobs automatically.

## What Was Fixed

### Previous Issues:
- ❌ Jobs were created but never processed (stayed in "pending" status forever)
- ❌ No actual web scraping was happening
- ❌ Firecrawl dependency was installed but not used
- ❌ No data was being collected or stored

### Current Solution:
- ✅ **Backend Processing**: Supabase Edge Functions process scraping jobs
- ✅ **Firecrawl Integration**: Uses Firecrawl API for reliable web scraping
- ✅ **Automatic Processing**: Jobs are processed automatically when created
- ✅ **Manual Processing**: Users can manually trigger processing if needed
- ✅ **Real-time Updates**: UI updates in real-time as jobs are processed
- ✅ **Error Handling**: Failed jobs are marked with error messages

## Setup Instructions

### 1. Environment Variables
You need to set up the following environment variables in your Supabase project:

```bash
# In Supabase Dashboard > Settings > Edge Functions
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
```

### 2. Get Firecrawl API Key
1. Go to [Firecrawl.dev](https://firecrawl.dev)
2. Sign up for an account
3. Get your API key from the dashboard
4. Add it to your Supabase environment variables

### 3. Deploy Edge Functions
Deploy the Edge Functions to your Supabase project:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the functions
supabase functions deploy process-scraping-jobs
supabase functions deploy auto-process-jobs
```

### 4. Run Database Migration
Apply the database migration to set up triggers:

```bash
supabase db push
```

### 5. Configure Database Settings (Optional)
For automatic job processing via database triggers, you can set these configurations:

```sql
-- In your Supabase SQL Editor
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';
```

## How It Works

### Job Processing Flow:
1. **Job Creation**: User submits URLs through the UI
2. **Database Insert**: Jobs are inserted with "pending" status
3. **Automatic Trigger**: Frontend automatically calls processing after 1 second
4. **Edge Function**: `process-scraping-jobs` function processes pending jobs
5. **Firecrawl Scraping**: Each job is scraped using Firecrawl API
6. **Data Storage**: Scraped data is stored in `scraped_data` table
7. **Status Update**: Job status is updated to "completed" or "failed"
8. **Real-time UI**: UI updates automatically via Supabase real-time

### Manual Processing:
- Users can click the "Process" button in the Jobs list
- This manually triggers the processing of pending jobs
- Useful if automatic processing fails or is disabled

## Features Added

### 1. Automatic Processing
- Jobs are automatically processed after creation
- No manual intervention required for normal operation

### 2. Manual Processing Button
- Appears when there are pending jobs
- Allows users to manually trigger processing
- Shows processing status with loading indicators

### 3. Enhanced UI Feedback
- Shows pending job count in the Jobs list
- Processing status indicators on buttons
- Better error messages and success notifications
- Real-time updates without page refresh

### 4. Robust Error Handling
- Failed jobs are marked with error messages
- Timeout handling for slow websites
- Retry logic can be added if needed

## Testing the System

### 1. Create a Test Job
1. Go to the dashboard
2. Enter a test URL (e.g., `https://example.com`)
3. Click "Start Scraping"
4. Watch the job status change from "pending" to "running" to "completed"

### 2. Check Scraped Data
1. Look at the "Scraped Data" table
2. You should see the title, description, and content from the scraped page
3. Data can be exported as CSV or JSON

### 3. Test Bulk Processing
1. Use the "Bulk URLs" tab
2. Enter multiple URLs (one per line)
3. All jobs should be processed automatically

## Troubleshooting

### Jobs Stay in "Pending" Status
- Check if Firecrawl API key is set correctly
- Verify Edge Functions are deployed
- Check Supabase function logs for errors

### "Processing failed" Error
- Check Firecrawl API key and quota
- Verify the URL is accessible
- Check Edge Function logs in Supabase dashboard

### No Data Appears
- Ensure the website allows scraping
- Check if the website has anti-bot protection
- Verify Firecrawl can access the URL

## Performance Improvements

The new system provides significant performance improvements:

- **Concurrent Processing**: Multiple jobs can be processed simultaneously
- **Efficient Scraping**: Firecrawl is optimized for speed and reliability
- **Reduced Delays**: No more indefinite pending status
- **Real-time Updates**: Users see progress immediately
- **Better Resource Usage**: Only processes jobs when needed

## Next Steps

Consider these additional improvements:

1. **Queue Management**: Add job priority and scheduling
2. **Rate Limiting**: Implement rate limiting for large batches
3. **Retry Logic**: Add automatic retry for failed jobs
4. **Monitoring**: Add job processing metrics and alerts
5. **Caching**: Cache frequently scraped content

## Support

If you encounter any issues:
1. Check the Supabase Edge Function logs
2. Verify your Firecrawl API key and quota
3. Test with simple URLs first (like example.com)
4. Check the browser console for any client-side errors
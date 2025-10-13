import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@4.3.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable is required')
    }

    const app = new FirecrawlApp({ apiKey: firecrawlApiKey })

    // Get pending jobs
    const { data: pendingJobs, error: jobsError } = await supabaseClient
      .from('scraping_jobs')
      .select('*')
      .eq('status', 'pending')
      .limit(10) // Process up to 10 jobs at a time

    if (jobsError) {
      throw jobsError
    }

    const results = []

    for (const job of pendingJobs || []) {
      try {
        // Update job status to running
        await supabaseClient
          .from('scraping_jobs')
          .update({ 
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        console.log(`Processing job ${job.id} for URL: ${job.url}`)

        // Scrape the website using Firecrawl
        const scrapeResult = await app.scrapeUrl(job.url, {
          formats: ['markdown', 'html'],
          includeTags: ['title', 'meta'],
          excludeTags: ['script', 'style'],
          timeout: 30000, // 30 second timeout
          waitFor: 2000, // Wait 2 seconds for page to load
        })

        if (!scrapeResult.success) {
          throw new Error(scrapeResult.error || 'Failed to scrape URL')
        }

        // Extract relevant data
        const scrapedData = {
          job_id: job.id,
          user_id: job.user_id,
          url: job.url,
          title: scrapeResult.data?.metadata?.title || null,
          description: scrapeResult.data?.metadata?.description || null,
          content: scrapeResult.data?.markdown || scrapeResult.data?.html || null,
          metadata: {
            ...scrapeResult.data?.metadata,
            scraped_at: new Date().toISOString(),
            processing_time: Date.now()
          }
        }

        // Store scraped data
        const { error: dataError } = await supabaseClient
          .from('scraped_data')
          .insert([scrapedData])

        if (dataError) {
          throw dataError
        }

        // Update job as completed
        await supabaseClient
          .from('scraping_jobs')
          .update({ 
            status: 'completed',
            scraped_pages: 1,
            total_pages: 1,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        results.push({
          job_id: job.id,
          url: job.url,
          status: 'completed',
          title: scrapedData.title
        })

        console.log(`Successfully processed job ${job.id}`)

      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error)

        // Update job as failed
        await supabaseClient
          .from('scraping_jobs')
          .update({ 
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        results.push({
          job_id: job.id,
          url: job.url,
          status: 'failed',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed_jobs: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
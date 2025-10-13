import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@4.3.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapingJob {
  id: string
  url: string
  user_id: string
  status: string
}

interface ScrapedResult {
  title?: string
  description?: string
  content?: string
  url: string
  metadata?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Initialize Firecrawl
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable is required')
    }

    const app = new FirecrawlApp({ apiKey: firecrawlApiKey })

    // Get pending jobs
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('scraping_jobs')
      .select('*')
      .eq('status', 'pending')
      .limit(10) // Process up to 10 jobs at once

    if (jobsError) {
      throw jobsError
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`Processing ${jobs.length} jobs`)

    // Process jobs concurrently with limited concurrency
    const concurrencyLimit = 3
    const results = []

    for (let i = 0; i < jobs.length; i += concurrencyLimit) {
      const batch = jobs.slice(i, i + concurrencyLimit)
      const batchPromises = batch.map(job => processJob(job, app, supabaseClient))
      const batchResults = await Promise.allSettled(batchPromises)
      results.push(...batchResults)
    }

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return new Response(
      JSON.stringify({ 
        message: `Processed ${jobs.length} jobs`,
        successful,
        failed,
        details: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in process-scraping-jobs:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function processJob(job: ScrapingJob, app: FirecrawlApp, supabaseClient: any) {
  console.log(`Processing job ${job.id} for URL: ${job.url}`)

  try {
    // Update job status to running
    await supabaseClient
      .from('scraping_jobs')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    // Determine if it's a single page or needs crawling
    const shouldCrawl = await shouldCrawlSite(job.url)
    
    let results: ScrapedResult[] = []
    let totalPages = 1
    let scrapedPages = 0

    if (shouldCrawl) {
      // Use crawl for multi-page sites
      console.log(`Crawling site: ${job.url}`)
      
      const crawlResponse = await app.crawlUrl(job.url, {
        crawlerOptions: {
          includes: [], // Include all pages by default
          excludes: ['**/privacy*', '**/terms*', '**/cookie*'], // Exclude common non-content pages
          generateImgAltText: true,
          returnOnlyUrls: false,
          maxDepth: 2, // Limit depth for performance
          limit: 50, // Limit total pages for performance
        },
        pageOptions: {
          onlyMainContent: true,
          includeHtml: false,
          screenshot: false,
        }
      })

      if (crawlResponse.success && crawlResponse.data) {
        results = crawlResponse.data.map((page: any) => ({
          title: page.metadata?.title || extractTitleFromContent(page.content),
          description: page.metadata?.description || extractDescriptionFromContent(page.content),
          content: page.content,
          url: page.metadata?.sourceURL || page.url,
          metadata: {
            ...page.metadata,
            crawled: true,
            timestamp: new Date().toISOString()
          }
        }))
        totalPages = results.length
        scrapedPages = results.length
      }
    } else {
      // Use single page scraping
      console.log(`Scraping single page: ${job.url}`)
      
      const scrapeResponse = await app.scrapeUrl(job.url, {
        pageOptions: {
          onlyMainContent: true,
          includeHtml: false,
          screenshot: false,
        }
      })

      if (scrapeResponse.success && scrapeResponse.data) {
        results = [{
          title: scrapeResponse.data.metadata?.title || extractTitleFromContent(scrapeResponse.data.content),
          description: scrapeResponse.data.metadata?.description || extractDescriptionFromContent(scrapeResponse.data.content),
          content: scrapeResponse.data.content,
          url: scrapeResponse.data.metadata?.sourceURL || job.url,
          metadata: {
            ...scrapeResponse.data.metadata,
            scraped: true,
            timestamp: new Date().toISOString()
          }
        }]
        totalPages = 1
        scrapedPages = 1
      }
    }

    if (results.length === 0) {
      throw new Error('No data extracted from the URL')
    }

    // Save scraped data to database
    const dataInserts = results.map(result => ({
      job_id: job.id,
      user_id: job.user_id,
      url: result.url,
      title: result.title,
      description: result.description,
      content: result.content,
      metadata: result.metadata
    }))

    const { error: insertError } = await supabaseClient
      .from('scraped_data')
      .insert(dataInserts)

    if (insertError) {
      throw insertError
    }

    // Update job as completed
    await supabaseClient
      .from('scraping_jobs')
      .update({ 
        status: 'completed',
        total_pages: totalPages,
        scraped_pages: scrapedPages,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    console.log(`Successfully processed job ${job.id}: ${scrapedPages}/${totalPages} pages`)
    return { jobId: job.id, success: true, pages: scrapedPages }

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

    return { jobId: job.id, success: false, error: error.message }
  }
}

async function shouldCrawlSite(url: string): Promise<boolean> {
  try {
    // Simple heuristic: if it's a domain root or has common patterns, crawl it
    const urlObj = new URL(url)
    const path = urlObj.pathname
    
    // Crawl if it's a root domain or common company pages
    if (path === '/' || path === '' || 
        path.includes('/about') || 
        path.includes('/company') || 
        path.includes('/team') ||
        path.includes('/careers') ||
        path.includes('/contact')) {
      return true
    }
    
    // For specific pages, just scrape the single page
    return false
  } catch {
    return false
  }
}

function extractTitleFromContent(content: string): string {
  if (!content) return 'Untitled'
  
  // Try to extract title from the beginning of content
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length > 0) {
    const firstLine = lines[0].trim()
    if (firstLine.length > 0 && firstLine.length < 200) {
      return firstLine
    }
  }
  
  return 'Untitled'
}

function extractDescriptionFromContent(content: string): string {
  if (!content) return ''
  
  // Extract first few sentences as description
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
  if (sentences.length > 0) {
    let description = sentences[0].trim()
    if (sentences.length > 1) {
      description += '. ' + sentences[1].trim()
    }
    return description.length > 500 ? description.substring(0, 500) + '...' : description
  }
  
  return ''
}
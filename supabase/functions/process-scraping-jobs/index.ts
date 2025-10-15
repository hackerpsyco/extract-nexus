import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'
import FirecrawlApp from 'npm:@mendable/firecrawl-js@4.3.8'
import { extractCompanyData } from './data-extractor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface ScrapingJob {
  id: string
  url: string
  user_id: string
  status: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable is required')
    }

    const app = new FirecrawlApp({ apiKey: firecrawlApiKey })

    const { data: jobs, error: jobsError } = await supabaseClient
      .from('scraping_jobs')
      .select('*')
      .eq('status', 'pending')
      .limit(10)

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
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
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
    await supabaseClient
      .from('scraping_jobs')
      .update({
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    console.log(`Scraping page: ${job.url}`)

    const scrapeResponse: any = await app.scrape(job.url, {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 0
    })

    if (!scrapeResponse || !scrapeResponse.markdown) {
      throw new Error('Failed to scrape URL')
    }

    const rawContent = scrapeResponse.markdown || ''
    const title = scrapeResponse.metadata?.title || extractTitleFromContent(rawContent)
    const description = scrapeResponse.metadata?.description || extractDescriptionFromContent(rawContent)

    const companyData = extractCompanyData(rawContent, job.url, scrapeResponse.metadata)

    const dataInsert = {
      job_id: job.id,
      user_id: job.user_id,
      url: scrapeResponse.metadata?.sourceURL || job.url,
      title,
      description,
      content: rawContent,
      metadata: {
        ...scrapeResponse.metadata,
        scraped: true,
        timestamp: new Date().toISOString()
      },
      company_name: companyData.companyName,
      emails: companyData.emails,
      phone_numbers: companyData.phoneNumbers,
      addresses: companyData.addresses,
      social_links: companyData.socialLinks,
      hr_contacts: companyData.hrContacts,
      packages_pricing: companyData.packagesPricing,
      services: companyData.services,
      industry: companyData.industry,
      company_size: companyData.companySize,
      founded_year: companyData.foundedYear
    }

    const { error: insertError } = await supabaseClient
      .from('scraped_data')
      .insert([dataInsert])

    if (insertError) {
      throw insertError
    }

    await supabaseClient
      .from('scraping_jobs')
      .update({
        status: 'completed',
        total_pages: 1,
        scraped_pages: 1,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    console.log(`Successfully processed job ${job.id}`)
    console.log(`Extracted: ${companyData.emails.length} emails, ${companyData.phoneNumbers.length} phones, ${companyData.hrContacts.length} HR contacts`)

    return { jobId: job.id, success: true, extracted: {
      emails: companyData.emails.length,
      phones: companyData.phoneNumbers.length,
      hrContacts: companyData.hrContacts.length,
      packages: companyData.packagesPricing.length
    }}

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error processing job ${job.id}:`, errorMessage)

    await supabaseClient
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return { jobId: job.id, success: false, error: errorMessage }
  }
}

function extractTitleFromContent(content: string): string {
  if (!content) return 'Untitled'

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
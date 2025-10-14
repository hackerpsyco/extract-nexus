// Removed edge runtime types to avoid optional dependency resolution issues
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface ExportRequest {
  user_id: string
  sheet_url?: string
  sheet_name?: string
  search_term?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, sheet_url, sheet_name, search_term }: ExportRequest = await req.json()

    if (!user_id) {
      throw new Error('user_id is required')
    }

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

    let query = supabaseClient
      .from('scraped_data')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    const { data: scrapedData, error } = await query

    if (error) {
      throw error
    }

    if (!scrapedData || scrapedData.length === 0) {
      throw new Error('No data found to export')
    }

    let filteredData = scrapedData
    if (search_term) {
      filteredData = scrapedData.filter(item =>
        item.title?.toLowerCase().includes(search_term.toLowerCase()) ||
        item.description?.toLowerCase().includes(search_term.toLowerCase()) ||
        item.url.toLowerCase().includes(search_term.toLowerCase())
      )
    }

    const headers = [
      'URL', 
      'Title', 
      'Description', 
      'Content Preview', 
      'Date Scraped',
      'Domain',
      'Content Length',
      'Has Contact Info',
      'Has About Section'
    ]

    const rows = filteredData.map(item => {
      const domain = new URL(item.url).hostname
      const contentPreview = item.content 
        ? item.content.substring(0, 200).replace(/\n/g, ' ')
        : ""
      const hasContactInfo = item.content 
        ? /contact|email|phone|address/i.test(item.content)
        : false
      const hasAboutSection = item.content 
        ? /about|company|mission|vision|history/i.test(item.content)
        : false

      return [
        item.url,
        item.title || "",
        item.description || "",
        contentPreview,
        new Date(item.created_at).toLocaleDateString(),
        domain,
        item.content?.length || 0,
        hasContactInfo ? "Yes" : "No",
        hasAboutSection ? "Yes" : "No"
      ]
    })

    const sheetData = [headers, ...rows]
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Prepared ${filteredData.length} records for Google Sheets export`,
        data: {
          headers,
          rowCount: filteredData.length,
          preview: rows.slice(0, 5),
          instructions: "To complete Google Sheets integration, you need to set up Google Cloud credentials and OAuth. The data is ready to be sent to Google Sheets API."
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in export-to-google-sheets:', error)
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
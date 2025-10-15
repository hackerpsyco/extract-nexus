import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
      'Company Name',
      'URL',
      'Industry',
      'Company Size',
      'Founded Year',
      'Emails',
      'Phone Numbers',
      'Addresses',
      'HR Contacts',
      'Packages/Pricing',
      'Services',
      'LinkedIn',
      'Twitter',
      'Facebook',
      'Date Scraped'
    ]

    const rows = filteredData.map(item => {
      const emails = item.emails?.join('; ') || ''
      const phones = item.phone_numbers?.join('; ') || ''
      const addresses = item.addresses?.join('; ') || ''
      const hrContacts = item.hr_contacts?.map((c: any) => c.email || '').join('; ') || ''
      const packages = item.packages_pricing?.map((p: any) => `${p.name}: ${p.price}`).join('; ') || ''
      const services = item.services?.slice(0, 5).join('; ') || ''

      return [
        item.company_name || item.title || "",
        item.url,
        item.industry || "",
        item.company_size || "",
        item.founded_year || "",
        emails,
        phones,
        addresses,
        hrContacts,
        packages,
        services,
        item.social_links?.linkedin || "",
        item.social_links?.twitter || "",
        item.social_links?.facebook || "",
        new Date(item.created_at).toLocaleDateString()
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
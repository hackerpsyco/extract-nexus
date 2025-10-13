// Supabase Edge Function: sheets_export
// Appends rows to a Google Sheet using a service account

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { JWT } from "https://esm.sh/google-auth-library@9.14.1";

interface RequestBody {
  spreadsheetId: string;
  sheetName?: string;
  values: (string | number | null)[][];
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GOOGLE_CLIENT_EMAIL = Deno.env.get("GOOGLE_CLIENT_EMAIL");
const GOOGLE_PRIVATE_KEY = (Deno.env.get("GOOGLE_PRIVATE_KEY") || "").replace(/\\n/g, "\n");

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function getAccessToken(): Promise<string> {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error("Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY secrets");
  }
  const jwtClient = new JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const tokens = await jwtClient.authorize();
  if (!tokens || !tokens.access_token) {
    throw new Error("Failed to obtain Google access token");
  }
  return tokens.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { spreadsheetId, values } = body;
  const sheetName = body.sheetName || "Sheet1";

  if (!spreadsheetId || !Array.isArray(values) || values.length === 0) {
    return new Response(JSON.stringify({ error: "Provide spreadsheetId and non-empty values" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  try {
    const accessToken = await getAccessToken();
    const range = encodeURIComponent(`${sheetName}!A1`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `Sheets API error ${resp.status}: ${text}` }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    return new Response(JSON.stringify({ ok: true, result: data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

// Supabase Edge Function: scraper
// Fetches pending scraping_jobs and saves results into scraped_data with concurrency

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface JobRow {
  id: string;
  user_id: string;
  url: string;
}

interface RequestBody {
  jobIds?: string[];
  userId?: string;
  concurrency?: number;
  timeoutMs?: number;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

function decodeHtmlEntities(text: string): string {
  const numeric = text.replace(/&#(x?)([0-9a-fA-F]+);/g, (_, hex: string, code: string) => {
    const num = hex ? parseInt(code, 16) : parseInt(code, 10);
    return Number.isFinite(num) ? String.fromCodePoint(num) : "";
  });
  return numeric
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
}

function extractMetaDescription(html: string): string | null {
  const nameDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (nameDesc) return decodeHtmlEntities(nameDesc[1].trim());
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (ogDesc) return decodeHtmlEntities(ogDesc[1].trim());
  return null;
}

function stripTagsAndCollapse(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = withoutScripts.replace(/<[^>]+>/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 DataIntelBot/1.0",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    return resp;
  } finally {
    clearTimeout(timeout);
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) break;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(runners);
  return results;
}

async function processJob(job: JobRow, timeoutMs: number) {
  // Mark running
  await supabaseAdmin.from("scraping_jobs").update({ status: "running" }).eq("id", job.id);
  try {
    const response = await fetchWithTimeout(job.url, timeoutMs);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const content = stripTagsAndCollapse(html).slice(0, 10000);

    await supabaseAdmin.from("scraped_data").insert({
      job_id: job.id,
      user_id: job.user_id,
      url: job.url,
      title,
      description,
      content,
      metadata: {},
    });

    await supabaseAdmin
      .from("scraping_jobs")
      .update({ status: "completed", total_pages: 1, scraped_pages: 1, credits_used: 1, completed_at: new Date().toISOString() })
      .eq("id", job.id);

    return { id: job.id, status: "completed" } as const;
  } catch (error: any) {
    await supabaseAdmin
      .from("scraping_jobs")
      .update({ status: "failed", error_message: String(error?.message || error) })
      .eq("id", job.id);
    return { id: job.id, status: "failed", error: String(error?.message || error) } as const;
  }
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

  const concurrency = Math.max(1, Math.min(10, body.concurrency ?? 5));
  const timeoutMs = Math.max(1000, Math.min(30000, body.timeoutMs ?? 12000));

  if ((!body.jobIds || body.jobIds.length === 0) && !body.userId) {
    return new Response(JSON.stringify({ error: "Provide jobIds or userId" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Load jobs
  let jobs: JobRow[] = [];
  if (body.jobIds && body.jobIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("scraping_jobs")
      .select("id,user_id,url")
      .in("id", body.jobIds)
      .order("created_at", { ascending: true });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    jobs = (data || []) as JobRow[];
  } else if (body.userId) {
    const { data, error } = await supabaseAdmin
      .from("scraping_jobs")
      .select("id,user_id,url")
      .eq("user_id", body.userId)
      .eq("status", "pending")
      .limit(50)
      .order("created_at", { ascending: true });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    jobs = (data || []) as JobRow[];
  }

  if (jobs.length === 0) {
    return new Response(JSON.stringify({ processed: 0, results: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // Optimistically mark selected jobs as running to avoid duplicate processing
  await supabaseAdmin.from("scraping_jobs").update({ status: "running" }).in("id", jobs.map((j) => j.id));

  const results = await runWithConcurrency(jobs, concurrency, (job) => processJob(job, timeoutMs));

  const summary = {
    processed: results.length,
    completed: results.filter((r: any) => r.status === "completed").length,
    failed: results.filter((r: any) => r.status === "failed").length,
    results,
  };

  return new Response(JSON.stringify(summary), { status: 200, headers: { "Content-Type": "application/json" } });
});

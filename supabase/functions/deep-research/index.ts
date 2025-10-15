import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scrapedDataId, topic, content } = await req.json();
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseKey || !lovableApiKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`Starting deep research for topic: ${topic}`);

    // Step 1: Generate research questions using AI
    const questionsPrompt = `You are a research assistant. Based on this topic and content, generate 5 specific research questions that would help understand this subject deeply.

Topic: ${topic}
Content Preview: ${content.substring(0, 1000)}

Return ONLY a JSON array of questions, no other text:
["question 1", "question 2", ...]`;

    const questionsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a research assistant that generates focused research questions." },
          { role: "user", content: questionsPrompt }
        ],
      }),
    });

    if (!questionsResponse.ok) {
      const errorText = await questionsResponse.text();
      console.error("AI questions error:", questionsResponse.status, errorText);
      throw new Error("Failed to generate research questions");
    }

    const questionsData = await questionsResponse.json();
    let questions: string[];
    
    try {
      const questionsText = questionsData.choices[0].message.content;
      questions = JSON.parse(questionsText);
    } catch (e) {
      console.error("Failed to parse questions:", e);
      questions = [
        `What are the key features of ${topic}?`,
        `What are the main benefits and applications?`,
        `What are the technical details and specifications?`,
        `What are the current trends and developments?`,
        `What are the challenges and limitations?`
      ];
    }

    console.log("Generated research questions:", questions);

    // Step 2: Perform deep analysis with AI
    const analysisPrompt = `You are a deep research analyst. Analyze the following content about "${topic}" and provide comprehensive insights.

Original Content:
${content}

Research Questions to Address:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Provide a detailed analysis in the following JSON format:
{
  "summary": "2-3 sentence executive summary",
  "key_findings": ["finding 1", "finding 2", "finding 3", "finding 4", "finding 5"],
  "detailed_analysis": "Comprehensive analysis addressing all research questions with specific details and insights",
  "sources": [
    {
      "title": "Source name",
      "url": "source url from content",
      "relevance": "why this source is important"
    }
  ]
}`;

    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an expert research analyst. Always respond with valid JSON only." },
          { role: "user", content: analysisPrompt }
        ],
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("AI analysis error:", analysisResponse.status, errorText);
      throw new Error("Failed to perform deep analysis");
    }

    const analysisData = await analysisResponse.json();
    let research;

    try {
      const analysisText = analysisData.choices[0].message.content;
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                       analysisText.match(/```\n([\s\S]*?)\n```/) ||
                       [null, analysisText];
      research = JSON.parse(jsonMatch[1] || analysisText);
    } catch (e) {
      console.error("Failed to parse analysis:", e);
      research = {
        summary: "Analysis completed but formatting error occurred",
        key_findings: questions.map(q => `Research question: ${q}`),
        detailed_analysis: analysisData.choices[0].message.content,
        sources: []
      };
    }

    console.log("Research completed successfully");

    // Step 3: Store research results
    const { data: researchResult, error: insertError } = await supabase
      .from("research_results")
      .insert({
        user_id: user.id,
        scraped_data_id: scrapedDataId,
        topic: topic,
        research_summary: research.summary,
        key_findings: research.key_findings,
        sources: research.sources,
        full_analysis: research.detailed_analysis,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing research:", insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        research: researchResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: unknown) {
    console.error("Deep research error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

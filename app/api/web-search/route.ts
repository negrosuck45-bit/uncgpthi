import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { query, limit = 5 } = await req.json();
    if (!query) return Response.json({ error: "Missing query" }, { status: 400 });

    const response = await fetch("https://api.duckduckgo.com/", {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then(r => r.text());

    // Parse DDG HTML response
    const results: any[] = [];
    const regex = /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?class="result__snippet"[^>]*>([^<]+)</g;
    
    let match;
    while ((match = regex.exec(response)) && results.length < limit) {
      results.push({
        title: match[2],
        url: match[1],
        snippet: match[3],
      });
    }

    return Response.json({ 
      success: true, 
      results,
      query 
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

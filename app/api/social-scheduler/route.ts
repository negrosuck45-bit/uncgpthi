import { NextRequest } from "next/server";

const GROQ_KEYS = [
  "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",
  "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",
];

let currentKeyIndex = 0;

export async function POST(req: NextRequest) {
  try {
    const { platform, topic, tone = "casual" } = await req.json();
    if (!platform || !topic) return Response.json({ error: "Missing platform or topic" }, { status: 400 });

    const key = GROQ_KEYS[currentKeyIndex % GROQ_KEYS.length];
    currentKeyIndex++;

    let prompt = "";
    const charLimits = {
      twitter: 280,
      linkedin: 3000,
      instagram: 2200,
      tiktok: 150,
    };

    const limit = charLimits[platform as keyof typeof charLimits] || 280;

    prompt = `Write a ${tone} ${platform} post about "${topic}". Keep it under ${limit} characters. Add relevant hashtags.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const post = data.choices?.[0]?.message?.content;

    return Response.json({ 
      success: true, 
      post,
      platform,
      topic,
      wordCount: post?.split(" ").length || 0 
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

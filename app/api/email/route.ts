import { NextRequest } from "next/server";

const GROQ_KEYS = [
  "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",
  "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",
];

let currentKeyIndex = 0;

export async function POST(req: NextRequest) {
  try {
    const { type, topic, tone = "professional" } = await req.json();
    if (!type || !topic) return Response.json({ error: "Missing type or topic" }, { status: 400 });

    const key = GROQ_KEYS[currentKeyIndex % GROQ_KEYS.length];
    currentKeyIndex++;

    let prompt = "";
    switch (type) {
      case "email":
        prompt = `Write a ${tone} email about: ${topic}. Include subject line and body.`;
        break;
      case "newsletter":
        prompt = `Write a weekly newsletter about: ${topic}. Include header, 3 sections, and footer.`;
        break;
      case "template":
        prompt = `Create a reusable email template for: ${topic}`;
        break;
      default:
        prompt = `Generate content about: ${topic}`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    return Response.json({ 
      success: true, 
      content,
      type,
      topic 
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

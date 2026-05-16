import { NextRequest } from "next/server";

// Groq API keys (embedded)
const GROQ_KEYS = [
  "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",
  "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",
  "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",
];

let currentKeyIndex = 0;

export async function POST(req: NextRequest) {
  try {
    const { text, analysisType = "summary" } = await req.json();
    if (!text) return Response.json({ error: "Missing text" }, { status: 400 });

    const key = GROQ_KEYS[currentKeyIndex % GROQ_KEYS.length];
    currentKeyIndex++;

    let prompt = "";
    switch (analysisType) {
      case "summary":
        prompt = `Summarize this text in 3-4 sentences:\n\n${text}`;
        break;
      case "keywords":
        prompt = `Extract the top 10 keywords from this text:\n\n${text}`;
        break;
      case "sentiment":
        prompt = `Analyze the sentiment of this text (positive/negative/neutral) with explanation:\n\n${text}`;
        break;
      case "quiz":
        prompt = `Generate 5 multiple choice quiz questions from this text:\n\n${text}`;
        break;
      default:
        prompt = `Analyze this text:\n\n${text}`;
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
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    return Response.json({ 
      success: true, 
      result,
      analysisType 
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

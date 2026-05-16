import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return Response.json({ error: "Missing prompt" }, { status: 400 });

    // Using free Replicate API with Flux model
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_KEY || "REPLICATE_KEY_HERE"}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "black-forest-labs/flux-schnell",
        input: { prompt },
      }),
    });

    const data = await response.json();
    
    // Poll for result
    if (data.id) {
      let result = data;
      for (let i = 0; i < 30; i++) {
        const checkResponse = await fetch(`https://api.replicate.com/v1/predictions/${data.id}`, {
          headers: { "Authorization": `Token ${process.env.REPLICATE_API_KEY || "REPLICATE_KEY_HERE"}` },
        });
        result = await checkResponse.json();
        if (result.status === "succeeded") break;
        if (result.status === "failed") return Response.json({ error: "Generation failed" }, { status: 500 });
        await new Promise(r => setTimeout(r, 1000));
      }
      
      return Response.json({ 
        success: true, 
        imageUrl: result.output?.[0],
        prompt 
      });
    }

    return Response.json({ error: "Failed to start generation" }, { status: 500 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

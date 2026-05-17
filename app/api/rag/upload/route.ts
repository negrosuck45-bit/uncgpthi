import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple PDF text extraction without external deps
function extractTextFromPDF(data: Uint8Array): string {
  try {
    const text = new TextDecoder().decode(data);
    return text.replace(/[^\x20-\x7E\n]/g, " ");
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;

    if (!file || !projectId) {
      return Response.json({ error: "Missing file or projectId" }, { status: 400 });
    }

    let text = "";
    
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      text = extractTextFromPDF(new Uint8Array(arrayBuffer));
    } else {
      text = await file.text();
    }

    // Get embeddings from HuggingFace
    const hfApiKey = process.env.HF_API_KEY;
    const embeddingResponse = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction",
      {
        headers: { Authorization: `Bearer ${hfApiKey}` },
        method: "POST",
        body: JSON.stringify({ inputs: text.slice(0, 512) }),
      }
    );

    const embedding = await embeddingResponse.json();

    // Store in Supabase
    const { data, error } = await supabase
      .from("rag_documents")
      .insert({
        project_id: projectId,
        filename: file.name,
        content: text,
        embedding: embedding[0],
        created_at: new Date(),
      });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true, documentId: data?.[0]?.id });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

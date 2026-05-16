import { createClient } from "@supabase/supabase-js";

const HF_API_KEY = "hf_YourHuggingFaceApiKeyHere";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2", {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: text }),
  });
  if (!res.ok) {
    throw new Error(`Embedding failed: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data[0]) ? data[0] : data;
}

export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf(".");
      const lastNewline = chunk.lastIndexOf("\n");
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }
    chunks.push(chunk.trim());
    start += chunk.length - overlap;
  }
  return chunks.filter(c => c.length > 50);
}

export async function uploadDocument(file: File, userId: string, metadata?: Record<string, any>): Promise<{ success: boolean; documentId?: string; chunks?: number; error?: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const text = await extractTextFromPDF(arrayBuffer);
    if (!text || text.length < 10) {
      return { success: false, error: "Could not extract text from PDF" };
    }
    const { data: doc, error: docError } = await supabase.from("documents").insert({ user_id: userId, filename: file.name, file_size: file.size, file_type: file.type, content_preview: text.slice(0, 500), metadata: metadata || {}, status: "processing" }).select().single();
    if (docError || !doc) {
      return { success: false, error: docError?.message || "Failed to create document" };
    }
    const chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      const { error: chunkError } = await supabase.from("document_chunks").insert({ document_id: doc.id, user_id: userId, content: chunks[i], embedding, chunk_index: i, metadata: { position: i, total: chunks.length } });
      if (chunkError) {
        console.error("Chunk insert error:", chunkError);
      }
    }
    await supabase.from("documents").update({ status: "ready", chunk_count: chunks.length }).eq("id", doc.id);
    return { success: true, documentId: doc.id, chunks: chunks.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function searchDocuments(query: string, userId: string, limit: number = 5): Promise<{ results: any[]; error?: string }> {
  try {
    const embedding = await generateEmbedding(query);
    const { data, error } = await supabase.rpc("match_documents", { query_embedding: embedding, match_threshold: 0.7, match_count: limit, user_id_filter: userId });
    if (error) {
      const { data: fallback, error: fallbackError } = await supabase.from("document_chunks").select("*, documents(filename)").eq("user_id", userId).textSearch("content", query).limit(limit);
      if (fallbackError) {
        return { results: [], error: fallbackError.message };
      }
      return { results: fallback || [] };
    }
    return { results: data || [] };
  } catch (error: any) {
    return { results: [], error: error.message };
  }
}

export async function getUserDocuments(userId: string) {
  const { data, error } = await supabase.from("documents").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return { documents: data || [], error };
}

export async function deleteDocument(documentId: string, userId: string) {
  await supabase.from("document_chunks").delete().eq("document_id", documentId).eq("user_id", userId);
  const { error } = await supabase.from("documents").delete().eq("id", documentId).eq("user_id", userId);
  return { success: !error, error };
}

export async function getRAGContext(query: string, userId: string, maxTokens: number = 2000): Promise<string> {
  const { results } = await searchDocuments(query, userId, 5);
  if (!results.length) return "";
  let context = "Relevant information from uploaded documents:\n\n";
  let currentLength = 0;
  for (const result of results) {
    const chunk = result.content || "";
    if (currentLength + chunk.length > maxTokens * 4) break;
    context += `[From ${result.documents?.filename || "document"}]:\n${chunk}\n\n`;
    currentLength += chunk.length;
  }
  return context;
}

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const text = new TextDecoder().decode(arrayBuffer);
  if (!text.includes("%PDF")) {
    return text;
  }
  try {
    const pdfParse = await import("pdf-parse");
    const data = await pdfParse.default(Buffer.from(arrayBuffer));
    return data.text;
  } catch {
    return text;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "anonymous";
    const { data, error } = await supabase.from("conversations").select("*").eq("user_id", userId).eq("is_archived", false).order("updated_at", { ascending: false }).limit(50);
    if (error) throw error;
    return NextResponse.json({ conversations: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, conversations: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, model, provider, userId = "anonymous", systemPrompt } = await req.json();
    const { data, error } = await supabase.from("conversations").insert({ user_id: userId, title: title || "New Conversation", model, provider, system_prompt: systemPrompt }).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, title, isArchived } = await req.json();
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (isArchived !== undefined) updates.is_archived = isArchived;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from("conversations").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await supabase.from("messages").delete().eq("conversation_id", id);
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

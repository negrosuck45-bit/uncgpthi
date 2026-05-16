import { NextRequest, NextResponse } from "next/server";
import { getUserDocuments } from "@/lib/rag-service";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") || "anonymous";
    const result = await getUserDocuments(userId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { deleteDocument } from "@/lib/rag-service";

export async function DELETE(req: NextRequest) {
  try {
    const { documentId, userId } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }
    const result = await deleteDocument(documentId, userId || "anonymous");
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

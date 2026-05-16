import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments } from '@/lib/rag-service';

export async function POST(req: NextRequest) {
  try {
    const { query, userId, limit } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const result = await searchDocuments(query, userId || 'anonymous', limit || 5);
    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

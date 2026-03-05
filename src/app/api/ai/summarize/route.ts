import { NextResponse } from 'next/server';

// This route is a stub — AI summarization is coming soon (DeepSeek integration).
// OpenAI integration has been removed intentionally.

export async function POST() {
  return NextResponse.json(
    { error: 'AI summarization is coming soon.' },
    { status: 503 }
  );
}

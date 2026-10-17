import { NextRequest, NextResponse } from 'next/server';
import { generateStructuredOutput } from '@/lib/ai/client';
import { InvoiceDraftSchema } from '@/lib/ai/validations';
import { getInvoiceParsingPrompt } from '@/lib/ai/prompts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    // Validate text length
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'TEXT_EMPTY', message: 'Invoice text cannot be empty' },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: 'TEXT_TOO_LONG', message: 'Invoice text cannot exceed 500 characters' },
        { status: 400 }
      );
    }

    // Generate AI response
    const prompt = getInvoiceParsingPrompt(text);
    const result = await generateStructuredOutput(prompt, InvoiceDraftSchema);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Parse invoice error:', error instanceof Error ? error.message : 'Unknown error');

    // Check for specific error types
    if (error instanceof Error) {
      // Check for AI service busy (503, 429, rate limit)
      if (
        error.message.includes('503') ||
        error.message.includes('UNAVAILABLE') ||
        error.message.includes('429') ||
        error.message.includes('rate limit')
      ) {
        return NextResponse.json(
          { error: 'AI_BUSY', message: 'The AI is busy right now. Try again in a moment, or fill in the invoice manually.' },
          { status: 503 }
        );
      }

      if (error.message.includes('timed out')) {
        return NextResponse.json(
          { error: 'AI_TIMEOUT', message: 'AI request timed out. Please try again.' },
          { status: 504 }
        );
      }

      if (error.message.includes('GEMINI_API_KEY')) {
        return NextResponse.json(
          { error: 'AI_NOT_CONFIGURED', message: 'AI service is not configured' },
          { status: 503 }
        );
      }
    }

    // Generic AI error
    return NextResponse.json(
      { error: 'AI_ERROR', message: 'Failed to parse invoice. Please try the manual form.' },
      { status: 500 }
    );
  }
}

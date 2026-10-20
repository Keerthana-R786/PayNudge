import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { generateStructuredOutput } from '@/lib/ai/client';
import { InsightsDraftSchema } from '@/lib/ai/validations';
import { getInsightsPrompt } from '@/lib/ai/prompts';
import { buildInsightsFacts } from '@/lib/insights-facts';
import { calculateSummary } from '@/lib/summary';
import { validateInsightsBrief, extractDollarAmounts } from '@/lib/ai/reminder-guard';
import { getTodayString } from '@/lib/utils';

// Mark as dynamic to prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all invoices
    const allInvoices = await db.select().from(invoices);
    const today = getTodayString();

    // Build facts
    const facts = buildInsightsFacts(allInvoices, today);

    // Build allowed amounts from the SAME facts object sent to the AI
    const allowedAmounts: number[] = [];
    
    // Extract cents from formatted strings in facts
    allowedAmounts.push(...extractDollarAmounts(facts.outstanding));
    allowedAmounts.push(...extractDollarAmounts(facts.overdue));
    allowedAmounts.push(...extractDollarAmounts(facts.paidThisMonth));
    
    // Add all amounts from topOverdue
    for (const inv of facts.topOverdue) {
      allowedAmounts.push(...extractDollarAmounts(inv.amount));
    }

    let brief: string | null = null;
    let attempt = 0;

    // Try generating brief (with one retry on guard failure)
    while (attempt < 2 && !brief) {
      attempt++;

      const prompt = attempt === 1
        ? getInsightsPrompt(facts)
        : `${getInsightsPrompt(facts)}\n\nIMPORTANT: Use ONLY the exact dollar figures provided above. Do not calculate or invent any new amounts.`;

      try {
        const result = await generateStructuredOutput(prompt, InsightsDraftSchema);

        // Validate with guard
        const validation = validateInsightsBrief(result.brief, allowedAmounts);

        if (validation.valid) {
          brief = result.brief;
        } else if (attempt === 1) {
          // Continue to retry
        } else {
          // Second attempt failed - guard rejected
          return NextResponse.json(
            { error: 'AI_VALIDATION_FAILED', message: 'The AI wrote a figure that does not match your ledger. Try again.' },
            { status: 422 }
          );
        }
      } catch (aiError) {
        // Handle AI errors on last attempt
        if (attempt === 2) {
          throw aiError;
        }
      }
    }

    if (!brief) {
      return NextResponse.json(
        { error: 'AI_ERROR', message: 'Failed to generate insights' },
        { status: 500 }
      );
    }

    return NextResponse.json({ brief, facts });
  } catch (error) {
    console.error('Insights generation error:', error instanceof Error ? error.message : 'Unknown error');

    // Check for specific error types
    if (error instanceof Error) {
      if (
        error.message.includes('503') ||
        error.message.includes('UNAVAILABLE') ||
        error.message.includes('429') ||
        error.message.includes('rate limit')
      ) {
        return NextResponse.json(
          { error: 'AI_BUSY', message: 'The AI is busy right now. Try again in a moment.' },
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

    return NextResponse.json(
      { error: 'AI_ERROR', message: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

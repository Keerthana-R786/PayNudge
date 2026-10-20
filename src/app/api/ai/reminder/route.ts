import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, reminders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateStructuredOutput } from '@/lib/ai/client';
import { ReminderDraftSchema } from '@/lib/ai/validations';
import { getReminderPrompt } from '@/lib/ai/prompts';
import { buildReminderFacts } from '@/lib/reminder-facts';
import { validateReminderText, extractDollarAmounts } from '@/lib/ai/reminder-guard';
import { getTodayString } from '@/lib/utils';

// Mark as dynamic to prevent caching
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, tone } = body;

    if (!invoiceId || typeof invoiceId !== 'number') {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    if (!['friendly', 'firm', 'final'].includes(tone)) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Invalid tone' },
        { status: 400 }
      );
    }

    // Fetch invoice
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);

    if (!invoice) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Only allow reminders for sent invoices
    if (invoice.status !== 'sent') {
      return NextResponse.json(
        { error: 'INVALID_STATUS', message: `Reminders are only allowed for sent invoices. This invoice is ${invoice.status}.` },
        { status: 400 }
      );
    }

    // Build facts from invoice
    const today = getTodayString();
    const facts = buildReminderFacts(invoice, tone, today);

    // Allowed amounts for guard: only the invoice total
    const allowedAmounts = [invoice.amountCents];

    let draft: { subject: string; body: string } | null = null;
    let attempt = 0;

    // Try generating reminder (with one retry on guard failure)
    while (attempt < 2 && !draft) {
      attempt++;

      const prompt = attempt === 1
        ? getReminderPrompt(facts)
        : `${getReminderPrompt(facts)}\n\nIMPORTANT: Use ONLY the exact figures provided above. Do not modify or calculate any amounts.`;

      try {
        const result = await generateStructuredOutput(prompt, ReminderDraftSchema);

        // Validate with guard
        const fullText = `${result.subject}\n${result.body}`;
        const validation = validateReminderText(fullText, facts.invoiceNumber, allowedAmounts);

        if (validation.valid) {
          draft = result;
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

    if (!draft) {
      return NextResponse.json(
        { error: 'AI_ERROR', message: 'Failed to generate reminder' },
        { status: 500 }
      );
    }

    // Save draft reminder
    const [savedReminder] = await db
      .insert(reminders)
      .values({
        invoiceId: invoice.id,
        tone,
        subject: draft.subject,
        body: draft.body,
        status: 'draft',
      })
      .returning();

    return NextResponse.json(savedReminder, { status: 201 });
  } catch (error) {
    console.error('Reminder generation error:', error instanceof Error ? error.message : 'Unknown error');

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
      { error: 'AI_ERROR', message: 'Failed to generate reminder' },
      { status: 500 }
    );
  }
}

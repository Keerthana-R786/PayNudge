import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reminders } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Mark as dynamic to prevent caching
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/reminders/[id]
 * Update a draft reminder's subject and body
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reminderId = parseInt(id);

    if (isNaN(reminderId)) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Invalid reminder ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { subject, body: reminderBody } = body;

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!reminderBody || typeof reminderBody !== 'string' || reminderBody.trim().length === 0) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Body is required' },
        { status: 400 }
      );
    }

    // Fetch reminder
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, reminderId))
      .limit(1);

    if (!reminder) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Reminder not found' },
        { status: 404 }
      );
    }

    // Only allow editing draft reminders
    if (reminder.status !== 'draft') {
      return NextResponse.json(
        { error: 'INVALID_STATUS', message: 'Only draft reminders can be edited' },
        { status: 400 }
      );
    }

    // Update reminder
    const [updated] = await db
      .update(reminders)
      .set({
        subject: subject.trim(),
        body: reminderBody.trim(),
      })
      .where(eq(reminders.id, reminderId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update reminder error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to update reminder' },
      { status: 500 }
    );
  }
}

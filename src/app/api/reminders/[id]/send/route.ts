import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reminders, events } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const SendReminderSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  body: z.string().min(10, 'Body is too short').max(2000, 'Body too long'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reminderId = parseInt(id, 10);

    if (isNaN(reminderId)) {
      return NextResponse.json(
        { error: 'Invalid reminder ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate edited subject and body
    const validation = SendReminderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid subject or body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { subject, body: reminderBody } = validation.data;

    // Fetch reminder
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, reminderId)).limit(1);

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    // Update reminder with edited content and mark as sent
    const [updated] = await db
      .update(reminders)
      .set({
        subject,
        body: reminderBody,
        status: 'sent',
      })
      .where(eq(reminders.id, reminderId))
      .returning();

    // Write event
    await db.insert(events).values({
      invoiceId: reminder.invoiceId,
      type: 'reminder_sent',
      detail: `${reminder.tone} reminder marked as sent`,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Send reminder error:', error);
    return NextResponse.json(
      { error: 'Failed to mark reminder as sent' },
      { status: 500 }
    );
  }
}

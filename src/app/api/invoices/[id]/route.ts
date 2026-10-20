import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, events, reminders } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id, 10);

    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    // Fetch invoice
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Fetch events
    const invoiceEvents = await db
      .select()
      .from(events)
      .where(eq(events.invoiceId, invoiceId))
      .orderBy(events.createdAt);

    // Fetch reminders
    const invoiceReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.invoiceId, invoiceId))
      .orderBy(reminders.createdAt);

    return NextResponse.json({
      invoice,
      events: invoiceEvents,
      reminders: invoiceReminders,
    });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice details' },
      { status: 500 }
    );
  }
}

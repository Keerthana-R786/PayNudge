import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, events } from '@/db/schema';
import { getTodayString } from '@/lib/utils';
import { getInvoiceDisplayStatus } from '@/lib/invoice-status';
import { InvoiceDraftSchema } from '@/lib/ai/validations';
import { buildInvoiceFromDraft, generateInvoiceNumber } from '@/lib/invoice-builder';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allInvoices = await db.select().from(invoices);
    const today = getTodayString();

    const invoicesWithOverdue = allInvoices.map((invoice) => {
      const displayStatus = getInvoiceDisplayStatus(invoice, today);
      return {
        ...invoice,
        isOverdue: displayStatus === 'overdue',
      };
    });

    return NextResponse.json(invoicesWithOverdue);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Re-validate the draft with the same Zod schema
    const validationResult = InvoiceDraftSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid invoice data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const draft = validationResult.data;

    // Get the highest existing invoice number
    const highestInvoice = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .orderBy(desc(invoices.invoiceNumber))
      .limit(1);

    const nextNumber = generateInvoiceNumber(highestInvoice[0]?.invoiceNumber ?? null);

    // Build the invoice record
    const invoiceData = buildInvoiceFromDraft(draft, nextNumber);

    // Insert the invoice
    const [newInvoice] = await db.insert(invoices).values(invoiceData).returning();

    // Write an event
    await db.insert(events).values({
      invoiceId: newInvoice.id,
      type: 'invoice_created',
      detail: `Invoice ${newInvoice.invoiceNumber} created for ${newInvoice.clientName}`,
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

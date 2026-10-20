import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, events } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canVoidInvoice } from '@/lib/void-rules';

export async function POST(
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

    // Check if invoice can be voided
    const validation = canVoidInvoice(invoice);
    if (!validation.allowed) {
      return NextResponse.json(
        { error: 'CANNOT_VOID', message: validation.reason },
        { status: 400 }
      );
    }

    // Void the invoice
    const [voidedInvoice] = await db
      .update(invoices)
      .set({ status: 'void' })
      .where(eq(invoices.id, invoiceId))
      .returning();

    // Write event
    await db.insert(events).values({
      invoiceId: invoice.id,
      type: 'invoice_voided',
      detail: `Invoice ${invoice.invoiceNumber} was voided`,
    });

    return NextResponse.json(voidedInvoice);
  } catch (error) {
    console.error('Error voiding invoice:', error);
    return NextResponse.json(
      { error: 'Failed to void invoice' },
      { status: 500 }
    );
  }
}

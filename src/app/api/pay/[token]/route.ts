import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.publicToken, token))
      .limit(1);

    if (invoice.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const inv = invoice[0];

    // Return only public fields
    const publicData = {
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      description: inv.description,
      lineItems: inv.lineItems,
      amountCents: inv.amountCents,
      currency: inv.currency,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      status: inv.status,
    };

    return NextResponse.json(publicData);
  } catch (error) {
    console.error('Error fetching invoice for pay page:', error);
    return NextResponse.json(
      { error: 'Failed to load invoice' },
      { status: 500 }
    );
  }
}

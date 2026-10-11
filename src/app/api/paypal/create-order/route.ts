import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createOrder } from '@/lib/paypal';
import { z } from 'zod';

const CreateOrderSchema = z.object({
  token: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: token required' },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Load invoice from database
    const result = await db
      .select()
      .from(invoices)
      .where(eq(invoices.publicToken, token))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = result[0];

    // Refuse if already paid or void
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      );
    }

    if (invoice.status === 'void') {
      return NextResponse.json(
        { error: 'Invoice is void' },
        { status: 400 }
      );
    }

    // Create PayPal order (amount is read from database, never from client)
    const orderId = await createOrder(invoice);

    // Store the PayPal order ID
    await db
      .update(invoices)
      .set({ paypalOrderId: orderId })
      .where(eq(invoices.id, invoice.id));

    return NextResponse.json({ orderId });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

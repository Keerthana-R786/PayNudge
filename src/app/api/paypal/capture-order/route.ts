import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices, events } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { captureOrder, verifyCapture } from '@/lib/paypal';
import { z } from 'zod';

const CaptureOrderSchema = z.object({
  token: z.string(),
  orderId: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CaptureOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: token and orderId required' },
        { status: 400 }
      );
    }

    const { token, orderId } = parsed.data;

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

    // Refuse if void
    if (invoice.status === 'void') {
      return NextResponse.json(
        { error: 'Invoice is void and cannot be paid' },
        { status: 400 }
      );
    }

    // Idempotent: if already paid, return success
    if (invoice.status === 'paid') {
      return NextResponse.json({ 
        success: true, 
        message: 'Invoice already paid' 
      });
    }

    // Verify the orderId matches the stored paypal_order_id
    if (invoice.paypalOrderId !== orderId) {
      return NextResponse.json(
        { error: 'Order ID mismatch' },
        { status: 400 }
      );
    }

    // Capture the payment
    const captureResponse = await captureOrder(orderId);

    // Verify the capture
    const verification = verifyCapture(invoice, captureResponse);
    if (!verification.ok) {
      console.error('Capture verification failed:', verification.error);
      return NextResponse.json(
        { error: `Payment verification failed: ${verification.error}` },
        { status: 400 }
      );
    }

    // Extract capture ID
    const captureId = captureResponse.purchase_units[0]?.payments?.captures[0]?.id;
    const paidAt = new Date().toISOString().split('T')[0];

    // Update invoice status
    await db
      .update(invoices)
      .set({
        status: 'paid',
        paidAt,
        paypalCaptureId: captureId,
      })
      .where(eq(invoices.id, invoice.id));

    // Create event log
    await db.insert(events).values({
      invoiceId: invoice.id,
      type: 'payment_received',
      detail: `Payment captured via PayPal. Capture ID: ${captureId}`,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Payment captured successfully'
    });
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    return NextResponse.json(
      { error: 'Failed to capture payment' },
      { status: 500 }
    );
  }
}

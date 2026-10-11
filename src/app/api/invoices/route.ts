import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { getTodayString } from '@/lib/utils';
import { getInvoiceDisplayStatus } from '@/lib/invoice-status';

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

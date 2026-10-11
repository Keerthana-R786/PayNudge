import type { Invoice } from '@/db/schema';
import { getInvoiceDisplayStatus } from './invoice-status';

export interface SummaryStats {
  outstanding: number;
  overdue: number;
  paidThisMonth: number;
  averageDaysToPay: number | null;
}

/**
 * Pure function to calculate summary statistics from invoices.
 * All amounts are in cents. Returns null for averageDaysToPay if no paid invoices.
 */
export function calculateSummary(invoices: Invoice[], today: string): SummaryStats {
  let outstanding = 0;
  let overdue = 0;
  let paidThisMonth = 0;
  
  const paidInvoices: { issueDate: string; paidAt: string }[] = [];

  // Calculate the first day of the current month
  const currentMonthStart = today.substring(0, 7) + '-01'; // YYYY-MM-01

  for (const invoice of invoices) {
    const displayStatus = getInvoiceDisplayStatus(invoice, today);

    if (displayStatus === 'sent') {
      outstanding += invoice.amountCents;
    } else if (displayStatus === 'overdue') {
      outstanding += invoice.amountCents;
      overdue += invoice.amountCents;
    } else if (displayStatus === 'paid') {
      if (invoice.paidAt && invoice.paidAt >= currentMonthStart) {
        paidThisMonth += invoice.amountCents;
      }
      if (invoice.paidAt && invoice.issueDate) {
        paidInvoices.push({ issueDate: invoice.issueDate, paidAt: invoice.paidAt });
      }
    }
  }

  // Calculate average days to pay
  let averageDaysToPay: number | null = null;
  if (paidInvoices.length > 0) {
    const totalDays = paidInvoices.reduce((sum, inv) => {
      const issueTime = new Date(inv.issueDate).getTime();
      const paidTime = new Date(inv.paidAt).getTime();
      const days = Math.round((paidTime - issueTime) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    averageDaysToPay = Math.round(totalDays / paidInvoices.length);
  }

  return {
    outstanding,
    overdue,
    paidThisMonth,
    averageDaysToPay,
  };
}

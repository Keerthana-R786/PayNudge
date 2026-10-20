/**
 * Pure functions to build facts object for insights generation
 */

import type { Invoice } from '@/db/schema';
import { calculateSummary } from './summary';
import { formatCurrency } from './utils';
import { getInvoiceDisplayStatus } from './invoice-status';

export interface OverdueInvoice {
  invoiceNumber: string;
  clientName: string;
  amount: string; // Formatted
  daysOverdue: number;
}

export interface InsightsFacts {
  outstanding: string; // Formatted
  overdue: string; // Formatted
  paidThisMonth: string; // Formatted
  averageDaysToPay: number | null;
  topOverdue: OverdueInvoice[];
}

/**
 * Calculate days overdue from due date and today.
 * Uses UTC date-only calculations to avoid timezone drift.
 */
function calculateDaysOverdue(dueDate: string, today: string): number {
  // Parse dates in UTC to avoid timezone issues
  const dueUTC = Date.UTC(
    parseInt(dueDate.substring(0, 4)),
    parseInt(dueDate.substring(5, 7)) - 1,
    parseInt(dueDate.substring(8, 10))
  );
  const todayUTC = Date.UTC(
    parseInt(today.substring(0, 4)),
    parseInt(today.substring(5, 7)) - 1,
    parseInt(today.substring(8, 10))
  );
  
  const diffMs = todayUTC - dueUTC;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Build facts object for insights generation.
 * Computes summary stats and top 3 overdue invoices by amount.
 */
export function buildInsightsFacts(invoices: Invoice[], today: string): InsightsFacts {
  // Get summary stats
  const summary = calculateSummary(invoices, today);
  
  // Find overdue invoices
  const overdueInvoices = invoices
    .filter(inv => getInvoiceDisplayStatus(inv, today) === 'overdue')
    .map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      amount: formatCurrency(inv.amountCents),
      amountCents: inv.amountCents, // For sorting
      daysOverdue: calculateDaysOverdue(inv.dueDate, today),
    }))
    .sort((a, b) => b.amountCents - a.amountCents) // Sort by amount descending
    .slice(0, 3) // Top 3
    .map(({ amountCents, ...rest }) => rest); // Remove amountCents from result
  
  return {
    outstanding: formatCurrency(summary.outstanding),
    overdue: formatCurrency(summary.overdue),
    paidThisMonth: formatCurrency(summary.paidThisMonth),
    averageDaysToPay: summary.averageDaysToPay,
    topOverdue: overdueInvoices,
  };
}

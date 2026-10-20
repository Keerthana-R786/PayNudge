/**
 * Pure functions to build facts object for reminder generation
 */

import type { Invoice } from '@/db/schema';
import { formatCurrency } from './utils';

export interface ReminderFacts {
  clientName: string;
  invoiceNumber: string;
  amount: string; // Formatted with currency symbol
  dueDate: string; // YYYY-MM-DD
  daysOverdue: number;
  tone: 'friendly' | 'firm' | 'final';
}

/**
 * Calculate days overdue from due date and today.
 * Returns 0 if not overdue.
 * Uses UTC date-only calculations to avoid timezone drift.
 */
export function calculateDaysOverdue(dueDate: string, today: string): number {
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
 * Build facts object from invoice for reminder generation.
 * All data comes from the invoice record, not from AI.
 */
export function buildReminderFacts(
  invoice: Invoice,
  tone: 'friendly' | 'firm' | 'final',
  today: string
): ReminderFacts {
  return {
    clientName: invoice.clientName,
    invoiceNumber: invoice.invoiceNumber,
    amount: formatCurrency(invoice.amountCents),
    dueDate: invoice.dueDate,
    daysOverdue: calculateDaysOverdue(invoice.dueDate, today),
    tone,
  };
}

import type { Invoice } from '@/db/schema';

export type DisplayStatus = 'paid' | 'sent' | 'overdue' | 'void';

/**
 * Pure function to determine the display status of an invoice.
 * Overdue is derived: status = sent AND due_date < today.
 */
export function getInvoiceDisplayStatus(
  invoice: Pick<Invoice, 'status' | 'dueDate'>,
  today: string
): DisplayStatus {
  if (invoice.status === 'paid') return 'paid';
  if (invoice.status === 'void') return 'void';
  if (invoice.status === 'draft') return 'sent'; // Shouldn't appear in ledger, but treat as sent
  
  // status is 'sent'
  if (invoice.dueDate < today) {
    return 'overdue';
  }
  
  return 'sent';
}

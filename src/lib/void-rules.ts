/**
 * Pure functions for void validation rules
 */

import type { Invoice } from '@/db/schema';

export interface VoidValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if an invoice can be voided.
 * Only invoices with status 'sent' can be voided.
 * Paid, void, and draft invoices cannot be voided.
 */
export function canVoidInvoice(invoice: Invoice): VoidValidationResult {
  if (invoice.status === 'void') {
    return {
      allowed: false,
      reason: 'Invoice is already void',
    };
  }

  if (invoice.status === 'paid') {
    return {
      allowed: false,
      reason: 'Paid invoices cannot be voided',
    };
  }

  if (invoice.status === 'draft') {
    return {
      allowed: false,
      reason: 'Draft invoices cannot be voided',
    };
  }

  if (invoice.status === 'sent') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Invalid invoice status',
  };
}

/**
 * Check if an invoice can be paid.
 * Void and paid invoices cannot be paid.
 */
export function canPayInvoice(invoice: Invoice): VoidValidationResult {
  if (invoice.status === 'void') {
    return {
      allowed: false,
      reason: 'Void invoices cannot be paid',
    };
  }

  if (invoice.status === 'paid') {
    return {
      allowed: false,
      reason: 'Invoice is already paid',
    };
  }

  return { allowed: true };
}

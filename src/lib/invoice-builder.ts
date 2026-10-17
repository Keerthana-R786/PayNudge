/**
 * Pure functions for building invoice records from drafts
 * All functions are testable and have no side effects
 */

import type { InvoiceDraft } from './ai/validations';
import type { InsertInvoice } from '@/db/schema';
import { randomBytes } from 'crypto';

/**
 * Convert dollars to cents with proper rounding
 * Handles floating point precision issues (e.g., 0.1 + 0.2)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Calculate total in cents from line items
 */
export function calculateTotalCents(lineItems: Array<{ description: string; amount_dollars: number }>): number {
  return lineItems.reduce((sum, item) => sum + dollarsToCents(item.amount_dollars), 0);
}

/**
 * Generate next sequential invoice number
 * Format: PN-0001, PN-0002, etc.
 */
export function generateInvoiceNumber(highestExisting: string | null): string {
  if (!highestExisting) {
    return 'PN-0001';
  }

  // Extract number from format PN-0001
  const match = highestExisting.match(/PN-(\d+)/);
  if (!match) {
    return 'PN-0001';
  }

  const nextNumber = parseInt(match[1], 10) + 1;
  return `PN-${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Generate a secure URL-safe public token
 * Returns at least 22 characters
 */
export function generatePublicToken(): string {
  // 16 bytes = 128 bits of randomness
  // Base64url encoded = 22 characters (no padding)
  return randomBytes(16).toString('base64url');
}

/**
 * Calculate due date from issue date and days
 */
export function calculateDueDate(issueDate: string, dueInDays: number): string {
  const date = new Date(issueDate);
  date.setDate(date.getDate() + dueInDays);
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Build a complete invoice record from a validated draft
 */
export function buildInvoiceFromDraft(
  draft: InvoiceDraft,
  nextInvoiceNumber: string
): Omit<InsertInvoice, 'id' | 'createdAt'> {
  const issueDate = getTodayDate();
  const dueDate = calculateDueDate(issueDate, draft.due_in_days);

  // Convert line items to storage format (cents)
  const lineItems = draft.line_items.map((item) => ({
    description: item.description,
    amountCents: dollarsToCents(item.amount_dollars),
  }));

  const totalCents = calculateTotalCents(draft.line_items);

  // Build description from line items
  const description = draft.line_items.map((item) => item.description).join(', ');

  return {
    publicToken: generatePublicToken(),
    invoiceNumber: nextInvoiceNumber,
    clientName: draft.client_name,
    clientEmail: draft.client_email || '',
    description,
    lineItems,
    currency: 'USD',
    amountCents: totalCents,
    status: 'sent',
    issueDate,
    dueDate,
    paypalOrderId: null,
    paypalCaptureId: null,
    paidAt: null,
  };
}

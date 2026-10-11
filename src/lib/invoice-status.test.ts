import { describe, it, expect } from 'vitest';
import { getInvoiceDisplayStatus } from './invoice-status';

describe('getInvoiceDisplayStatus', () => {
  const today = '2024-10-11';

  it('returns paid for paid invoices', () => {
    const invoice = { status: 'paid' as const, dueDate: '2024-10-01' };
    expect(getInvoiceDisplayStatus(invoice, today)).toBe('paid');
  });

  it('returns void for void invoices', () => {
    const invoice = { status: 'void' as const, dueDate: '2024-10-01' };
    expect(getInvoiceDisplayStatus(invoice, today)).toBe('void');
  });

  it('returns sent for sent invoices not yet due', () => {
    const invoice = { status: 'sent' as const, dueDate: '2024-10-20' };
    expect(getInvoiceDisplayStatus(invoice, today)).toBe('sent');
  });

  it('returns sent for sent invoices due today', () => {
    const invoice = { status: 'sent' as const, dueDate: today };
    expect(getInvoiceDisplayStatus(invoice, today)).toBe('sent');
  });

  it('returns overdue for sent invoices past due date', () => {
    const invoice = { status: 'sent' as const, dueDate: '2024-10-05' };
    expect(getInvoiceDisplayStatus(invoice, today)).toBe('overdue');
  });

  it('returns overdue for sent invoices one day overdue', () => {
    const invoice = { status: 'sent' as const, dueDate: '2024-10-10' };
    expect(getInvoiceDisplayStatus(invoice, today)).toBe('overdue');
  });
});

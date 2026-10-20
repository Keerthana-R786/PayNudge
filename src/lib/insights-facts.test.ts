import { describe, it, expect } from 'vitest';
import { buildInsightsFacts } from './insights-facts';
import type { Invoice } from '@/db/schema';

describe('buildInsightsFacts', () => {
  const createInvoice = (overrides: Partial<Invoice>): Invoice => ({
    id: 1,
    publicToken: 'token',
    invoiceNumber: 'PN-0001',
    clientName: 'Client',
    clientEmail: 'test@test.com',
    description: 'Work',
    lineItems: [],
    currency: 'USD',
    amountCents: 10000,
    status: 'sent',
    issueDate: '2024-01-01',
    dueDate: '2024-01-15',
    paypalOrderId: null,
    paypalCaptureId: null,
    paidAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  it('computes summary stats', () => {
    const invoices = [
      createInvoice({ id: 1, amountCents: 50000, status: 'sent', dueDate: '2024-12-20' }),
      createInvoice({ id: 2, amountCents: 30000, status: 'paid', paidAt: '2024-12-15' }),
    ];

    const facts = buildInsightsFacts(invoices, '2024-12-15');

    expect(facts.outstanding).toBe('$500.00');
    expect(facts.paidThisMonth).toBe('$300.00');
  });

  it('finds top 3 overdue invoices by amount', () => {
    const invoices = [
      createInvoice({ id: 1, invoiceNumber: 'PN-0001', clientName: 'Client A', amountCents: 50000, dueDate: '2024-12-01' }),
      createInvoice({ id: 2, invoiceNumber: 'PN-0002', clientName: 'Client B', amountCents: 100000, dueDate: '2024-12-05' }),
      createInvoice({ id: 3, invoiceNumber: 'PN-0003', clientName: 'Client C', amountCents: 75000, dueDate: '2024-12-03' }),
      createInvoice({ id: 4, invoiceNumber: 'PN-0004', clientName: 'Client D', amountCents: 25000, dueDate: '2024-12-02' }),
    ];

    const facts = buildInsightsFacts(invoices, '2024-12-20');

    expect(facts.topOverdue).toHaveLength(3);
    expect(facts.topOverdue[0].invoiceNumber).toBe('PN-0002'); // $1000
    expect(facts.topOverdue[0].amount).toBe('$1,000.00');
    expect(facts.topOverdue[1].invoiceNumber).toBe('PN-0003'); // $750
    expect(facts.topOverdue[2].invoiceNumber).toBe('PN-0001'); // $500
  });

  it('returns empty topOverdue when no overdue invoices', () => {
    const invoices = [
      createInvoice({ id: 1, status: 'paid', paidAt: '2024-12-15' }),
      createInvoice({ id: 2, status: 'sent', dueDate: '2024-12-25' }), // Not overdue
    ];

    const facts = buildInsightsFacts(invoices, '2024-12-20');

    expect(facts.topOverdue).toHaveLength(0);
  });

  it('returns fewer than 3 if less overdue invoices exist', () => {
    const invoices = [
      createInvoice({ id: 1, invoiceNumber: 'PN-0001', amountCents: 50000, dueDate: '2024-12-01' }),
      createInvoice({ id: 2, invoiceNumber: 'PN-0002', amountCents: 30000, dueDate: '2024-12-05' }),
    ];

    const facts = buildInsightsFacts(invoices, '2024-12-20');

    expect(facts.topOverdue).toHaveLength(2);
  });

  it('calculates days overdue correctly', () => {
    const invoices = [
      createInvoice({ id: 1, invoiceNumber: 'PN-0001', amountCents: 50000, dueDate: '2024-12-01' }),
    ];

    const facts = buildInsightsFacts(invoices, '2024-12-15');

    expect(facts.topOverdue[0].daysOverdue).toBe(14);
  });

  it('formats amounts with commas', () => {
    const invoices = [
      createInvoice({ id: 1, amountCents: 340000, dueDate: '2024-12-01' }),
    ];

    const facts = buildInsightsFacts(invoices, '2024-12-20');

    expect(facts.overdue).toBe('$3,400.00');
    expect(facts.topOverdue[0].amount).toBe('$3,400.00');
  });

  it('excludes void invoices from overdue', () => {
    const invoices = [
      createInvoice({ id: 1, invoiceNumber: 'PN-0001', amountCents: 100000, dueDate: '2024-12-01', status: 'void' }),
      createInvoice({ id: 2, invoiceNumber: 'PN-0002', amountCents: 50000, dueDate: '2024-12-02' }),
    ];

    const facts = buildInsightsFacts(invoices, '2024-12-20');

    expect(facts.topOverdue).toHaveLength(1);
    expect(facts.topOverdue[0].invoiceNumber).toBe('PN-0002');
  });
});

import { describe, it, expect } from 'vitest';
import { calculateSummary } from './summary';
import type { Invoice } from '@/db/schema';

describe('calculateSummary', () => {
  const today = '2024-10-11';

  it('calculates outstanding correctly (sent + overdue)', () => {
    const invoices: Invoice[] = [
      {
        id: 1,
        publicToken: 'abc',
        invoiceNumber: 'INV-001',
        clientName: 'Client A',
        clientEmail: 'a@example.com',
        description: 'Test',
        lineItems: [],
        currency: 'USD',
        amountCents: 50000,
        status: 'sent',
        issueDate: '2024-10-01',
        dueDate: '2024-10-20',
        paypalOrderId: null,
        paypalCaptureId: null,
        paidAt: null,
        createdAt: '2024-10-01',
      },
      {
        id: 2,
        publicToken: 'def',
        invoiceNumber: 'INV-002',
        clientName: 'Client B',
        clientEmail: 'b@example.com',
        description: 'Test',
        lineItems: [],
        currency: 'USD',
        amountCents: 30000,
        status: 'sent',
        issueDate: '2024-09-01',
        dueDate: '2024-10-05',
        paypalOrderId: null,
        paypalCaptureId: null,
        paidAt: null,
        createdAt: '2024-09-01',
      },
    ];

    const result = calculateSummary(invoices, today);
    expect(result.outstanding).toBe(80000); // 50000 + 30000
  });

  it('calculates overdue correctly', () => {
    const invoices: Invoice[] = [
      {
        id: 1,
        publicToken: 'abc',
        invoiceNumber: 'INV-001',
        clientName: 'Client A',
        clientEmail: 'a@example.com',
        description: 'Test',
        lineItems: [],
        currency: 'USD',
        amountCents: 50000,
        status: 'sent',
        issueDate: '2024-10-01',
        dueDate: '2024-10-20',
        paypalOrderId: null,
        paypalCaptureId: null,
        paidAt: null,
        createdAt: '2024-10-01',
      },
      {
        id: 2,
        publicToken: 'def',
        invoiceNumber: 'INV-002',
        clientName: 'Client B',
        clientEmail: 'b@example.com',
        description: 'Test',
        lineItems: [],
        currency: 'USD',
        amountCents: 30000,
        status: 'sent',
        issueDate: '2024-09-01',
        dueDate: '2024-10-05',
        paypalOrderId: null,
        paypalCaptureId: null,
        paidAt: null,
        createdAt: '2024-09-01',
      },
    ];

    const result = calculateSummary(invoices, today);
    expect(result.overdue).toBe(30000); // Only INV-002 is overdue
  });

  it('calculates paid this month correctly', () => {
    const invoices: Invoice[] = [
      {
        id: 1,
        publicToken: 'abc',
        invoiceNumber: 'INV-001',
        clientName: 'Client A',
        clientEmail: 'a@example.com',
        description: 'Test',
        lineItems: [],
        currency: 'USD',
        amountCents: 50000,
        status: 'paid',
        issueDate: '2024-09-15',
        dueDate: '2024-09-30',
        paypalOrderId: 'ord1',
        paypalCaptureId: 'cap1',
        paidAt: '2024-10-05',
        createdAt: '2024-09-15',
      },
      {
        id: 2,
        publicToken: 'def',
        invoiceNumber: 'INV-002',
        clientName: 'Client B',
        clientEmail: 'b@example.com',
        description: 'Test',
        lineItems: [],
        currency: 'USD',
        amountCents: 30000,
        status: 'paid',
        issueDate: '2024-08-01',
        dueDate: '2024-08-15',
        paypalOrderId: 'ord2',
        paypalCaptureId: 'cap2',
        paidAt: '2024-09-10',
        createdAt: '2024-08-01',
      },
    ];

    const result = calculateSummary(invoices, today);
    expect(result.paidThisMonth).toBe(50000); // Only INV-001 paid in October
  });

  it('calculates average days to pay correctly', () => {
    const invoices: Invoice[] = [
      {
        id: 1,
        publicToken: 'abc',
        invoiceNumber: 'INV-001',
        clientName: 'Client A',
        clientEmail: 'a@example.com',
        description: 'Test',
        lineItems: [],
        currency: 'USD',
        amountCents: 50000,
        status: 'paid',
        issueDate: '2024-10-01',
        dueDate: '2024-10-15',
        paypalOrderId: 'ord1',
        paypalCaptureId: 'cap1',
        paidAt: '2024-10-11',
        createdAt: '2024-10-01',
      },
      {
        id: 2,
        publicToken: 'def',
        invoiceNumber: 'INV-002',
        clientName: 'Client B',
        clientEmail: 'b@example.com',
        description: 'Test',
        lineItems: [],
        currency: 'USD',
        amountCents: 30000,
        status: 'paid',
        issueDate: '2024-09-01',
        dueDate: '2024-09-15',
        paypalOrderId: 'ord2',
        paypalCaptureId: 'cap2',
        paidAt: '2024-09-21',
        createdAt: '2024-09-01',
      },
    ];

    const result = calculateSummary(invoices, today);
    // INV-001: 10 days (Oct 1 to Oct 11)
    // INV-002: 20 days (Sep 1 to Sep 21)
    // Average: (10 + 20) / 2 = 15
    expect(result.averageDaysToPay).toBe(15);
  });

  it('returns null for average days to pay when no paid invoices', () => {
    const invoices: Invoice[] = [
      {
        id: 1,
        publicToken: 'abc',
        invoiceNumber: 'INV-001',
        clientName: 'Client A',
        clientEmail: 'a@example.com',
        description: 'Test',
        lineItems: [],
        currency: 'USD',
        amountCents: 50000,
        status: 'sent',
        issueDate: '2024-10-01',
        dueDate: '2024-10-20',
        paypalOrderId: null,
        paypalCaptureId: null,
        paidAt: null,
        createdAt: '2024-10-01',
      },
    ];

    const result = calculateSummary(invoices, today);
    expect(result.averageDaysToPay).toBeNull();
  });

  it('excludes void invoices from all calculations', () => {
    const invoices: Invoice[] = [
      {
        id: 1,
        publicToken: 'abc',
        invoiceNumber: 'INV-001',
        clientName: 'Client A',
        clientEmail: 'a@example.com',
        description: 'Test',
        lineItems: [],
        currency: 'USD',
        amountCents: 50000,
        status: 'void',
        issueDate: '2024-10-01',
        dueDate: '2024-10-20',
        paypalOrderId: null,
        paypalCaptureId: null,
        paidAt: null,
        createdAt: '2024-10-01',
      },
    ];

    const result = calculateSummary(invoices, today);
    expect(result.outstanding).toBe(0);
    expect(result.overdue).toBe(0);
    expect(result.paidThisMonth).toBe(0);
    expect(result.averageDaysToPay).toBeNull();
  });

  it('handles empty invoice list', () => {
    const result = calculateSummary([], today);
    expect(result.outstanding).toBe(0);
    expect(result.overdue).toBe(0);
    expect(result.paidThisMonth).toBe(0);
    expect(result.averageDaysToPay).toBeNull();
  });
});

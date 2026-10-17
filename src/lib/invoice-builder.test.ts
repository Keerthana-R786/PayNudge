import { describe, it, expect } from 'vitest';
import {
  dollarsToCents,
  calculateTotalCents,
  generateInvoiceNumber,
  generatePublicToken,
  calculateDueDate,
  getTodayDate,
  buildInvoiceFromDraft,
} from './invoice-builder';
import type { InvoiceDraft } from './ai/validations';

describe('dollarsToCents', () => {
  it('converts whole dollars correctly', () => {
    expect(dollarsToCents(5)).toBe(500);
    expect(dollarsToCents(100)).toBe(10000);
  });

  it('converts decimal dollars correctly', () => {
    expect(dollarsToCents(19.99)).toBe(1999);
    expect(dollarsToCents(0.5)).toBe(50);
    expect(dollarsToCents(1.23)).toBe(123);
  });

  it('handles floating point precision issues', () => {
    expect(dollarsToCents(0.1 + 0.2)).toBe(30);
    expect(dollarsToCents(0.07 + 0.14)).toBe(21);
  });

  it('rounds correctly', () => {
    expect(dollarsToCents(19.99)).toBe(1999);
    expect(dollarsToCents(19.996)).toBe(2000); // rounds up
    expect(dollarsToCents(19.994)).toBe(1999); // rounds down
  });
});

describe('calculateTotalCents', () => {
  it('calculates sum of line items in cents', () => {
    const items = [
      { description: 'Item 1', amount_dollars: 10.5 },
      { description: 'Item 2', amount_dollars: 5.25 },
    ];
    expect(calculateTotalCents(items)).toBe(1575);
  });

  it('handles single item', () => {
    const items = [{ description: 'Single', amount_dollars: 19.99 }];
    expect(calculateTotalCents(items)).toBe(1999);
  });

  it('handles floating point precision in sum', () => {
    const items = [
      { description: 'A', amount_dollars: 0.1 },
      { description: 'B', amount_dollars: 0.2 },
    ];
    expect(calculateTotalCents(items)).toBe(30);
  });
});

describe('generateInvoiceNumber', () => {
  it('generates first invoice number when none exist', () => {
    expect(generateInvoiceNumber(null)).toBe('PN-0001');
  });

  it('increments existing invoice number', () => {
    expect(generateInvoiceNumber('PN-0001')).toBe('PN-0002');
    expect(generateInvoiceNumber('PN-0014')).toBe('PN-0015');
    expect(generateInvoiceNumber('PN-0099')).toBe('PN-0100');
  });

  it('handles four-digit numbers', () => {
    expect(generateInvoiceNumber('PN-9999')).toBe('PN-10000');
  });

  it('falls back to PN-0001 on invalid format', () => {
    expect(generateInvoiceNumber('INVALID')).toBe('PN-0001');
    expect(generateInvoiceNumber('')).toBe('PN-0001');
  });
});

describe('generatePublicToken', () => {
  it('generates token with at least 22 characters', () => {
    const token = generatePublicToken();
    expect(token.length).toBeGreaterThanOrEqual(22);
  });

  it('generates URL-safe tokens', () => {
    const token = generatePublicToken();
    // Base64url uses A-Z, a-z, 0-9, -, _ (no +, /, =)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates unique tokens', () => {
    const token1 = generatePublicToken();
    const token2 = generatePublicToken();
    expect(token1).not.toBe(token2);
  });
});

describe('calculateDueDate', () => {
  it('adds days to issue date correctly', () => {
    expect(calculateDueDate('2024-01-01', 14)).toBe('2024-01-15');
    expect(calculateDueDate('2024-01-01', 30)).toBe('2024-01-31');
  });

  it('handles month boundaries', () => {
    expect(calculateDueDate('2024-01-25', 14)).toBe('2024-02-08');
  });

  it('handles leap years', () => {
    expect(calculateDueDate('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('handles year boundaries', () => {
    expect(calculateDueDate('2024-12-25', 14)).toBe('2025-01-08');
  });
});

describe('getTodayDate', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const today = getTodayDate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('buildInvoiceFromDraft', () => {
  it('builds complete invoice from draft', () => {
    const draft: InvoiceDraft = {
      client_name: 'Acme Corp',
      client_email: 'billing@acme.com',
      line_items: [
        { description: 'Web design', amount_dollars: 500 },
        { description: 'Logo design', amount_dollars: 200 },
      ],
      due_in_days: 14,
    };

    const invoice = buildInvoiceFromDraft(draft, 'PN-0015');

    expect(invoice.invoiceNumber).toBe('PN-0015');
    expect(invoice.clientName).toBe('Acme Corp');
    expect(invoice.clientEmail).toBe('billing@acme.com');
    expect(invoice.description).toBe('Web design, Logo design');
    expect(invoice.amountCents).toBe(70000);
    expect(invoice.lineItems).toEqual([
      { description: 'Web design', amountCents: 50000 },
      { description: 'Logo design', amountCents: 20000 },
    ]);
    expect(invoice.status).toBe('sent');
    expect(invoice.currency).toBe('USD');
    expect(invoice.publicToken.length).toBeGreaterThanOrEqual(22);
    expect(invoice.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(invoice.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('handles missing email', () => {
    const draft: InvoiceDraft = {
      client_name: 'Test Client',
      line_items: [{ description: 'Service', amount_dollars: 100 }],
      due_in_days: 7,
    };

    const invoice = buildInvoiceFromDraft(draft, 'PN-0001');

    expect(invoice.clientEmail).toBe('');
  });

  it('calculates correct due date', () => {
    const draft: InvoiceDraft = {
      client_name: 'Test',
      line_items: [{ description: 'Test', amount_dollars: 1 }],
      due_in_days: 30,
    };

    const invoice = buildInvoiceFromDraft(draft, 'PN-0001');
    const issueDate = new Date(invoice.issueDate);
    const dueDate = new Date(invoice.dueDate);
    const daysDiff = Math.round((dueDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));

    expect(daysDiff).toBe(30);
  });
});

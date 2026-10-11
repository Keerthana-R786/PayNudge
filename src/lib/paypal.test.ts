import { describe, it, expect } from 'vitest';
import { centsToDecimalString, verifyCapture } from './paypal';
import type { Invoice } from '@/db/schema';

describe('centsToDecimalString', () => {
  it('converts 0 cents to 0.00', () => {
    expect(centsToDecimalString(0)).toBe('0.00');
  });

  it('converts 5 cents to 0.05', () => {
    expect(centsToDecimalString(5)).toBe('0.05');
  });

  it('converts 100 cents to 1.00', () => {
    expect(centsToDecimalString(100)).toBe('1.00');
  });

  it('converts 123456 cents to 1234.56', () => {
    expect(centsToDecimalString(123456)).toBe('1234.56');
  });
});

describe('verifyCapture', () => {
  const mockInvoice: Invoice = {
    id: 1,
    publicToken: 'abc123',
    invoiceNumber: 'PN-0001',
    clientName: 'Test Client',
    clientEmail: 'test@example.com',
    description: 'Test service',
    lineItems: [{ description: 'Test service', amountCents: 50000 }],
    currency: 'USD',
    amountCents: 50000,
    status: 'sent',
    issueDate: '2024-10-01',
    dueDate: '2024-10-15',
    paypalOrderId: null,
    paypalCaptureId: null,
    paidAt: null,
    createdAt: '2024-10-01',
  };

  const mockSuccessResponse = {
    status: 'COMPLETED',
    purchase_units: [
      {
        payments: {
          captures: [
            {
              id: 'CAPTURE123',
              amount: {
                value: '500.00',
                currency_code: 'USD',
              },
            },
          ],
        },
      },
    ],
  };

  it('returns ok for valid capture', () => {
    const result = verifyCapture(mockInvoice, mockSuccessResponse);
    expect(result).toEqual({ ok: true });
  });

  it('returns error for wrong amount', () => {
    const wrongAmountResponse = {
      ...mockSuccessResponse,
      purchase_units: [
        {
          payments: {
            captures: [
              {
                id: 'CAPTURE123',
                amount: {
                  value: '400.00',
                  currency_code: 'USD',
                },
              },
            ],
          },
        },
      ],
    };

    const result = verifyCapture(mockInvoice, wrongAmountResponse);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Amount mismatch');
    }
  });

  it('returns error for wrong currency', () => {
    const wrongCurrencyResponse = {
      ...mockSuccessResponse,
      purchase_units: [
        {
          payments: {
            captures: [
              {
                id: 'CAPTURE123',
                amount: {
                  value: '500.00',
                  currency_code: 'EUR',
                },
              },
            ],
          },
        },
      ],
    };

    const result = verifyCapture(mockInvoice, wrongCurrencyResponse);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Currency mismatch');
    }
  });

  it('returns error for status not COMPLETED', () => {
    const pendingResponse = {
      ...mockSuccessResponse,
      status: 'PENDING',
    };

    const result = verifyCapture(mockInvoice, pendingResponse);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('status');
      expect(result.error).toContain('PENDING');
    }
  });

  it('returns error for malformed response', () => {
    const malformedResponse = {
      status: 'COMPLETED',
      // Missing purchase_units
    };

    const result = verifyCapture(mockInvoice, malformedResponse);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });

  it('returns error for null response', () => {
    const result = verifyCapture(mockInvoice, null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid PayPal response');
    }
  });

  it('returns error for missing captures', () => {
    const noCapturesResponse = {
      status: 'COMPLETED',
      purchase_units: [
        {
          payments: {
            captures: [],
          },
        },
      ],
    };

    const result = verifyCapture(mockInvoice, noCapturesResponse);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('No captures');
    }
  });
});

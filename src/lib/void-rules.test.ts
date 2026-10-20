import { describe, it, expect } from 'vitest';
import { canVoidInvoice, canPayInvoice } from './void-rules';
import type { Invoice } from '@/db/schema';

const createInvoice = (status: Invoice['status']): Invoice => ({
  id: 1,
  publicToken: 'token',
  invoiceNumber: 'PN-0001',
  clientName: 'Client',
  clientEmail: 'test@test.com',
  description: 'Work',
  lineItems: [],
  currency: 'USD',
  amountCents: 50000,
  status,
  issueDate: '2024-01-01',
  dueDate: '2024-01-15',
  paypalOrderId: null,
  paypalCaptureId: null,
  paidAt: null,
  createdAt: '2024-01-01T00:00:00Z',
});

describe('canVoidInvoice', () => {
  it('allows voiding sent invoices', () => {
    const invoice = createInvoice('sent');
    const result = canVoidInvoice(invoice);
    
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('refuses voiding paid invoices', () => {
    const invoice = createInvoice('paid');
    const result = canVoidInvoice(invoice);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Paid invoices cannot be voided');
  });

  it('refuses voiding already void invoices', () => {
    const invoice = createInvoice('void');
    const result = canVoidInvoice(invoice);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Invoice is already void');
  });

  it('refuses voiding draft invoices', () => {
    const invoice = createInvoice('draft');
    const result = canVoidInvoice(invoice);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Draft invoices cannot be voided');
  });
});

describe('canPayInvoice', () => {
  it('allows paying sent invoices', () => {
    const invoice = createInvoice('sent');
    const result = canPayInvoice(invoice);
    
    expect(result.allowed).toBe(true);
  });

  it('allows paying draft invoices', () => {
    const invoice = createInvoice('draft');
    const result = canPayInvoice(invoice);
    
    expect(result.allowed).toBe(true);
  });

  it('refuses paying void invoices', () => {
    const invoice = createInvoice('void');
    const result = canPayInvoice(invoice);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Void invoices cannot be paid');
  });

  it('refuses paying already paid invoices', () => {
    const invoice = createInvoice('paid');
    const result = canPayInvoice(invoice);
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Invoice is already paid');
  });
});

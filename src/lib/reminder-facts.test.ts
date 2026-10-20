import { describe, it, expect } from 'vitest';
import { calculateDaysOverdue, buildReminderFacts } from './reminder-facts';
import type { Invoice } from '@/db/schema';

describe('calculateDaysOverdue', () => {
  it('returns 0 when not overdue', () => {
    expect(calculateDaysOverdue('2024-12-31', '2024-12-25')).toBe(0);
  });

  it('calculates days overdue correctly', () => {
    expect(calculateDaysOverdue('2024-12-01', '2024-12-15')).toBe(14);
  });

  it('handles same day as due date', () => {
    expect(calculateDaysOverdue('2024-12-15', '2024-12-15')).toBe(0);
  });

  it('handles one day overdue', () => {
    expect(calculateDaysOverdue('2024-12-14', '2024-12-15')).toBe(1);
  });

  it('handles large overdue amounts', () => {
    expect(calculateDaysOverdue('2024-01-01', '2024-12-31')).toBe(365);
  });

  it('handles month boundary correctly', () => {
    // Due on last day of November, today is first day of December
    expect(calculateDaysOverdue('2024-11-30', '2024-12-01')).toBe(1);
  });

  it('handles year boundary correctly', () => {
    // Due on last day of 2023, today is first day of 2024
    expect(calculateDaysOverdue('2023-12-31', '2024-01-01')).toBe(1);
  });

  it('handles 31 days overdue (PN-0010 case)', () => {
    // If due date was 31 days ago, result should be 31
    const today = '2024-12-31';
    const dueDate = '2024-11-30'; // 31 days earlier
    expect(calculateDaysOverdue(dueDate, today)).toBe(31);
  });
});

describe('buildReminderFacts', () => {
  const mockInvoice: Invoice = {
    id: 1,
    publicToken: 'test-token',
    invoiceNumber: 'PN-0001',
    clientName: 'Acme Corp',
    clientEmail: 'billing@acme.com',
    description: 'Web design',
    lineItems: [{ description: 'Web design', amountCents: 50000 }],
    currency: 'USD',
    amountCents: 50000,
    status: 'sent',
    issueDate: '2024-12-01',
    dueDate: '2024-12-15',
    paypalOrderId: null,
    paypalCaptureId: null,
    paidAt: null,
    createdAt: '2024-12-01T00:00:00Z',
  };

  it('builds facts with all required fields', () => {
    const facts = buildReminderFacts(mockInvoice, 'friendly', '2024-12-20');
    
    expect(facts.clientName).toBe('Acme Corp');
    expect(facts.invoiceNumber).toBe('PN-0001');
    expect(facts.amount).toBe('$500.00');
    expect(facts.dueDate).toBe('2024-12-15');
    expect(facts.daysOverdue).toBe(5);
    expect(facts.tone).toBe('friendly');
  });

  it('formats amount correctly', () => {
    const invoice = { ...mockInvoice, amountCents: 340000 };
    const facts = buildReminderFacts(invoice, 'firm', '2024-12-20');
    
    expect(facts.amount).toBe('$3,400.00');
  });

  it('calculates zero days overdue when not overdue', () => {
    const facts = buildReminderFacts(mockInvoice, 'friendly', '2024-12-10');
    
    expect(facts.daysOverdue).toBe(0);
  });

  it('preserves tone', () => {
    const friendlyFacts = buildReminderFacts(mockInvoice, 'friendly', '2024-12-20');
    const firmFacts = buildReminderFacts(mockInvoice, 'firm', '2024-12-20');
    const finalFacts = buildReminderFacts(mockInvoice, 'final', '2024-12-20');
    
    expect(friendlyFacts.tone).toBe('friendly');
    expect(firmFacts.tone).toBe('firm');
    expect(finalFacts.tone).toBe('final');
  });
});

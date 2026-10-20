import { describe, it, expect } from 'vitest';
import { extractDollarAmounts, validateReminderText, validateInsightsBrief } from './reminder-guard';

describe('extractDollarAmounts', () => {
  it('extracts amounts with dollar sign', () => {
    const text = 'Please pay $500 by Friday.';
    expect(extractDollarAmounts(text)).toEqual([50000]);
  });

  it('extracts amounts with commas', () => {
    const text = 'Total outstanding: $3,400';
    expect(extractDollarAmounts(text)).toEqual([340000]);
  });

  it('extracts amounts with cents', () => {
    const text = 'Amount due: $3,400.00';
    expect(extractDollarAmounts(text)).toEqual([340000]);
  });

  it('extracts "dollars" format', () => {
    const text = 'You owe 3400 dollars';
    expect(extractDollarAmounts(text)).toEqual([340000]);
  });

  it('extracts multiple amounts', () => {
    const text = 'Outstanding $500 and overdue $200';
    expect(extractDollarAmounts(text)).toEqual([50000, 20000]);
  });

  it('handles mixed formats', () => {
    const text = 'Total $3,400.00 includes 500 dollars';
    const amounts = extractDollarAmounts(text);
    expect(amounts).toContain(340000);
    expect(amounts).toContain(50000);
  });

  it('returns empty array when no amounts found', () => {
    const text = 'Please contact us soon.';
    expect(extractDollarAmounts(text)).toEqual([]);
  });
});

describe('validateReminderText', () => {
  it('accepts matching amounts in different formats', () => {
    const text = 'Invoice PN-0001 for $500 is overdue.';
    const result = validateReminderText(text, 'PN-0001', [50000]);
    expect(result.valid).toBe(true);
  });

  it('accepts amount with commas and cents', () => {
    const text = 'Invoice PN-0001 total $3,400.00';
    const result = validateReminderText(text, 'PN-0001', [340000]);
    expect(result.valid).toBe(true);
  });

  it('accepts "dollars" format', () => {
    const text = 'Invoice PN-0001 for 3400 dollars';
    const result = validateReminderText(text, 'PN-0001', [340000]);
    expect(result.valid).toBe(true);
  });

  it('rejects wrong amount', () => {
    const text = 'Invoice PN-0001 for $600 is overdue.';
    const result = validateReminderText(text, 'PN-0001', [50000]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('600.00');
  });

  it('rejects missing invoice number', () => {
    const text = 'Your invoice for $500 is overdue.';
    const result = validateReminderText(text, 'PN-0001', [50000]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('PN-0001');
  });

  it('accepts multiple matching amounts', () => {
    const text = 'Invoice PN-0001: $300 web design, $200 hosting, $500 total';
    const result = validateReminderText(text, 'PN-0001', [30000, 20000, 50000]);
    expect(result.valid).toBe(true);
  });

  it('rejects if any amount does not match', () => {
    const text = 'Invoice PN-0001: $300 web design, $999 hosting';
    const result = validateReminderText(text, 'PN-0001', [30000, 20000, 50000]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('999.00');
  });

  it('accepts text with no amounts', () => {
    const text = 'Invoice PN-0001 is overdue. Please contact us.';
    const result = validateReminderText(text, 'PN-0001', [50000]);
    expect(result.valid).toBe(true);
  });
});

describe('validateInsightsBrief', () => {
  it('accepts matching amounts', () => {
    const text = 'Outstanding: $500, Overdue: $200';
    const result = validateInsightsBrief(text, [50000, 20000]);
    expect(result.valid).toBe(true);
  });

  it('accepts text with no amounts', () => {
    const text = 'All invoices are up to date.';
    const result = validateInsightsBrief(text, [50000]);
    expect(result.valid).toBe(true);
  });

  it('rejects invented amount', () => {
    const text = 'Outstanding: $999 needs attention.';
    const result = validateInsightsBrief(text, [50000, 20000]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('999.00');
  });

  it('accepts amount with commas', () => {
    const text = 'Total outstanding is $3,400';
    const result = validateInsightsBrief(text, [340000]);
    expect(result.valid).toBe(true);
  });

  it('rejects partially matching amounts', () => {
    const text = 'Outstanding $500 and overdue $999';
    const result = validateInsightsBrief(text, [50000, 20000]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('999.00');
  });
});

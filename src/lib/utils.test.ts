import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('formats a valid date correctly', () => {
    const result = formatDate('2024-10-12');
    expect(result).toBe('12 Oct');
  });

  it('formats a month-boundary date correctly', () => {
    const result = formatDate('2024-10-01');
    expect(result).toBe('1 Oct');
  });

  it('returns empty string for null', () => {
    const result = formatDate(null);
    expect(result).toBe('');
  });

  it('returns empty string for undefined', () => {
    const result = formatDate(undefined);
    expect(result).toBe('');
  });

  it('returns empty string for empty string', () => {
    const result = formatDate('');
    expect(result).toBe('');
  });

  it('returns empty string for invalid date string', () => {
    const result = formatDate('not-a-date');
    expect(result).toBe('');
  });

  it('returns empty string for invalid date format', () => {
    const result = formatDate('2024-13-45');
    expect(result).toBe('');
  });
});

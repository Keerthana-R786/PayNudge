/**
 * Format cents to USD currency string
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Format date to "12 Oct" format
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate a random public token for invoice links
 */
export function generatePublicToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

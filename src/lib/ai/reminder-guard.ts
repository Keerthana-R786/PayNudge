/**
 * Guard to verify AI-generated text only uses provided dollar amounts.
 * Extracts all dollar amounts from text and ensures they match allowed values.
 */

/**
 * Extract all dollar amounts from text in various formats.
 * Handles: "$3,400", "$3,400.00", "3400 dollars", etc.
 * Returns amounts in integer cents.
 */
export function extractDollarAmounts(text: string): number[] {
  const amounts: number[] = [];
  
  // Pattern 1: $X,XXX.XX or $X,XXX or $XXX.XX or $XXX
  const dollarSignPattern = /\$[\d,]+(?:\.\d{2})?/g;
  const matches1 = text.match(dollarSignPattern) || [];
  
  for (const match of matches1) {
    const cleaned = match.replace(/[$,]/g, '');
    const dollars = parseFloat(cleaned);
    if (!isNaN(dollars)) {
      amounts.push(Math.round(dollars * 100));
    }
  }
  
  // Pattern 2: "XXX dollars" or "X,XXX dollars"
  const dollarsWordPattern = /[\d,]+(?:\.\d{2})?\s+dollars?/gi;
  const matches2 = text.match(dollarsWordPattern) || [];
  
  for (const match of matches2) {
    const cleaned = match.replace(/[,\s]+dollars?/gi, '');
    const dollars = parseFloat(cleaned);
    if (!isNaN(dollars)) {
      amounts.push(Math.round(dollars * 100));
    }
  }
  
  return amounts;
}

/**
 * Check if an amount (in cents) matches any of the allowed amounts.
 * Allows for minor floating-point rounding differences (±1 cent).
 */
function matchesAllowedAmount(amountCents: number, allowedAmountsCents: number[]): boolean {
  return allowedAmountsCents.some(allowed => Math.abs(amountCents - allowed) <= 1);
}

/**
 * Guard for reminder text: checks that all dollar amounts match provided figures
 * and that the invoice number appears in the text.
 */
export function validateReminderText(
  text: string,
  invoiceNumber: string,
  allowedAmountsCents: number[]
): { valid: boolean; error?: string } {
  // Check invoice number appears
  if (!text.includes(invoiceNumber)) {
    return {
      valid: false,
      error: `Invoice number ${invoiceNumber} must appear in the text`,
    };
  }
  
  // Extract all dollar amounts from the text
  const extractedAmounts = extractDollarAmounts(text);
  
  // Check each extracted amount matches an allowed amount
  for (const amount of extractedAmounts) {
    if (!matchesAllowedAmount(amount, allowedAmountsCents)) {
      return {
        valid: false,
        error: `Amount $${(amount / 100).toFixed(2)} does not match any provided figure`,
      };
    }
  }
  
  return { valid: true };
}

/**
 * Guard for insights brief: checks that all dollar amounts match provided figures.
 * Does not require invoice numbers (brief summarizes multiple invoices).
 */
export function validateInsightsBrief(
  text: string,
  allowedAmountsCents: number[]
): { valid: boolean; error?: string } {
  // Extract all dollar amounts from the text
  const extractedAmounts = extractDollarAmounts(text);
  
  // If no amounts found, that's fine (brief might not mention specific amounts)
  if (extractedAmounts.length === 0) {
    return { valid: true };
  }
  
  // Check each extracted amount matches an allowed amount
  for (const amount of extractedAmounts) {
    if (!matchesAllowedAmount(amount, allowedAmountsCents)) {
      return {
        valid: false,
        error: `Amount $${(amount / 100).toFixed(2)} does not match any provided figure`,
      };
    }
  }
  
  return { valid: true };
}

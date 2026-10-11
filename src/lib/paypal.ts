/**
 * PayPal REST API integration (server-only)
 * Never import this file in client components.
 */

import type { Invoice } from '@/db/schema';

const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: AccessTokenCache | null = null;

/**
 * Convert integer cents to decimal string with exactly 2 decimal places.
 * Used for PayPal amount formatting.
 */
export function centsToDecimalString(cents: number): string {
  const dollars = cents / 100;
  return dollars.toFixed(2);
}

/**
 * Get PayPal access token with in-memory caching.
 * Tokens are cached until 60 seconds before expiry.
 */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  try {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayPal auth failed:', response.status, errorText);
      throw new Error('Failed to authenticate with PayPal');
    }

    const data = await response.json();
    
    // Cache token until 60 seconds before expiry
    const expiresIn = data.expires_in || 3600;
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (expiresIn - 60) * 1000,
    };

    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw new Error('Failed to authenticate with PayPal');
  }
}

/**
 * Create a PayPal order for an invoice.
 * Returns the PayPal order ID.
 */
export async function createOrder(invoice: Invoice): Promise<string> {
  const accessToken = await getAccessToken();
  const amount = centsToDecimalString(invoice.amountCents);
  
  // Generate idempotency key based on invoice ID and current timestamp
  const idempotencyKey = `${invoice.id}-${Date.now()}`;

  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: invoice.id.toString(),
        amount: {
          currency_code: invoice.currency,
          value: amount,
        },
        description: invoice.description,
      },
    ],
  };

  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': idempotencyKey,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PayPal create order failed:', response.status, errorData);
      const debugId = errorData.debug_id || 'unknown';
      console.error('PayPal Debug ID:', debugId);
      throw new Error('Failed to create PayPal order');
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    throw new Error('Failed to create PayPal order');
  }
}

/**
 * Capture a PayPal order.
 * Returns the full capture response for verification.
 */
export async function captureOrder(orderId: string): Promise<any> {
  const accessToken = await getAccessToken();

  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PayPal capture failed:', response.status, errorData);
      const debugId = errorData.debug_id || 'unknown';
      console.error('PayPal Debug ID:', debugId);
      throw new Error('Failed to capture PayPal order');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    throw new Error('Failed to capture PayPal order');
  }
}

/**
 * Verify that a PayPal capture response matches the invoice.
 * Returns { ok: true } if valid, or { ok: false, error: string } if invalid.
 */
export function verifyCapture(
  invoice: Invoice,
  paypalResponse: any
): { ok: true } | { ok: false; error: string } {
  // Check if response has expected structure
  if (!paypalResponse || typeof paypalResponse !== 'object') {
    return { ok: false, error: 'Invalid PayPal response structure' };
  }

  // Check order status
  if (paypalResponse.status !== 'COMPLETED') {
    return { ok: false, error: `Order status is ${paypalResponse.status}, expected COMPLETED` };
  }

  // Extract capture details
  const purchaseUnits = paypalResponse.purchase_units;
  if (!Array.isArray(purchaseUnits) || purchaseUnits.length === 0) {
    return { ok: false, error: 'No purchase units in response' };
  }

  const captures = purchaseUnits[0]?.payments?.captures;
  if (!Array.isArray(captures) || captures.length === 0) {
    return { ok: false, error: 'No captures in response' };
  }

  const capture = captures[0];
  const capturedAmount = capture?.amount?.value;
  const capturedCurrency = capture?.amount?.currency_code;

  if (!capturedAmount || !capturedCurrency) {
    return { ok: false, error: 'Missing amount or currency in capture' };
  }

  // Verify currency
  if (capturedCurrency !== invoice.currency) {
    return { ok: false, error: `Currency mismatch: expected ${invoice.currency}, got ${capturedCurrency}` };
  }

  // Verify amount (compare in cents to avoid floating point issues)
  const capturedCents = Math.round(parseFloat(capturedAmount) * 100);
  if (capturedCents !== invoice.amountCents) {
    return { ok: false, error: `Amount mismatch: expected ${invoice.amountCents} cents, got ${capturedCents} cents` };
  }

  return { ok: true };
}

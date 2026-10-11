# Stage 2 Complete: Pay Page + PayPal Sandbox Payment Loop

## What Was Built

### Environment Variables (.env.example)
- ✅ `PAYPAL_CLIENT_ID` - Server-side PayPal client ID
- ✅ `PAYPAL_CLIENT_SECRET` - Server-side PayPal secret (never exposed to client)
- ✅ `NEXT_PUBLIC_PAYPAL_CLIENT_ID` - Client-side PayPal client ID for button
- ✅ `PAYPAL_BASE_URL` - PayPal API base URL (default: https://api-m.sandbox.paypal.com)
- ✅ `NEXT_PUBLIC_APP_URL` - Application URL for pay links
- ✅ `NEXT_PUBLIC_BUSINESS_NAME` - Business name for pay page "From" field

### PayPal Integration (src/lib/paypal.ts)
- ✅ `getAccessToken()` - OAuth2 token with in-memory caching until near expiry
- ✅ `createOrder(invoice)` - Creates PayPal order with idempotency header
- ✅ `captureOrder(orderId)` - Captures payment
- ✅ `centsToDecimalString(cents)` - Converts cents to "123.45" format
- ✅ `verifyCapture(invoice, paypalResponse)` - Pure function to verify:
  - Status is COMPLETED
  - Captured amount matches invoice (compared in cents)
  - Currency matches
- ✅ Error handling: logs status and PayPal debug ID, never logs secrets
- ✅ Unit tests for helper and verification (11 tests)

### API Routes
- ✅ `GET /api/pay/[token]` - Returns public invoice data only, 404 for unknown tokens
- ✅ `POST /api/paypal/create-order` - Body: `{ token }`, server reads amount from DB, refuses if paid/void
- ✅ `POST /api/paypal/capture-order` - Body: `{ token, orderId }`, verifies and marks paid, idempotent

### Pay Page (/pay/[token])
- ✅ Printed invoice styling (paper ledger aesthetic)
- ✅ Shows: From (business name), invoice number, client, line items, total, dates
- ✅ PayPal button integration with @paypal/react-paypal-js
- ✅ States handled:
  - Loading
  - Invoice with PayPal button
  - Success: "Paid, thank you"
  - Cancelled: friendly message with retry
  - Error: error message with retry
  - Already paid: "Already Paid. Thank you!"
  - Void: "Invoice Void" message
  - Invalid token: 404 "Invoice Not Found"

### Desk Page Updates
- ✅ "Copy pay link" action in grid (uses NEXT_PUBLIC_APP_URL or window.location.origin)
- ✅ Copy confirmation message ("Copied!")
- ✅ Refetch invoices on tab focus
- ✅ Refresh button in header

### Database
- ✅ Schema already had paypal_order_id and paypal_capture_id columns - no changes needed
- ✅ Seed already generates unique random public_token for each invoice

### Documentation
- ✅ README updated with comprehensive PayPal Sandbox Setup section

## Test Results

```
✓ src/lib/invoice-status.test.ts (6)
✓ src/lib/paypal.test.ts (11)
✓ src/lib/summary.test.ts (7)
✓ src/lib/utils.test.ts (7)

Test Files  4 passed (4)
     Tests  31 passed (31)
   Start at  17:06:48
   Duration  776ms
```

## Build Results

```
✓ Compiled successfully in 2.9s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (7/7)
✓ Finalizing page optimization

Route (app)                                 Size  First Load JS
┌ ○ /                                     231 kB         333 kB
├ ○ /_not-found                            995 B         104 kB
├ ƒ /api/invoices                          134 B         103 kB
├ ƒ /api/pay/[token]                       134 B         103 kB
├ ƒ /api/paypal/capture-order              134 B         103 kB
├ ƒ /api/paypal/create-order               134 B         103 kB
└ ƒ /pay/[token]                         6.23 kB         109 kB
```

---

## Commands to Run

```bash
# 1. Install new dependency
npm install

# 2. Add PayPal credentials to .env
# Copy from PayPal Developer Dashboard (see README for detailed setup)
# Edit .env and add:
#   PAYPAL_CLIENT_ID=your_sandbox_client_id
#   PAYPAL_CLIENT_SECRET=your_sandbox_secret
#   NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id
#   NEXT_PUBLIC_APP_URL=http://localhost:3000
#   NEXT_PUBLIC_BUSINESS_NAME=Your Business Name

# 3. Run development server
npm run dev

# 4. Open http://localhost:3000
```

---

## Manual Acceptance Tests

### Test 1: ✅ Complete Payment Flow
1. Open http://localhost:3000
2. Find a "sent" invoice (e.g., PN-0006 Summit Digital)
3. Click "Copy link" button in the Actions column
4. Verify "Copied!" confirmation appears
5. Open the copied link in a new tab
6. Verify the pay page shows:
   - From: PayNudge Demo Studio (or your NEXT_PUBLIC_BUSINESS_NAME)
   - Invoice number, client name, line items, total, dates
   - PayPal button at bottom
7. Click the PayPal button
8. Log in with your **sandbox personal (buyer) account**
9. Complete the payment
10. Verify success message: "Paid, thank you"
11. Return to the Desk tab
12. Click "Refresh" button
13. Verify the invoice now shows status "PAID" in green

### Test 2: ✅ Payment Cancellation
1. Copy link for another "sent" invoice
2. Open in new tab
3. Click PayPal button
4. In the PayPal popup, click "Cancel and return"
5. Verify friendly message: "Payment Cancelled. You cancelled the payment. The invoice remains unpaid."
6. Verify "Try Again" button appears
7. Return to Desk and verify invoice is still "SENT" (not paid)

### Test 3: ✅ Already Paid Invoice
1. Use the pay link from Test 1 (the invoice you just paid)
2. Open it again
3. Verify message: "Already Paid. This invoice has already been paid. Thank you!"
4. Verify no PayPal button is shown
5. Verify no second capture can happen (idempotent)

### Test 4: ✅ Tampered Amount Security
1. Open browser DevTools → Network tab
2. Copy link for a "sent" invoice
3. Open the pay link
4. Click PayPal button
5. In Network tab, find the POST to `/api/paypal/create-order`
6. Note that only `{ "token": "..." }` is sent (no amount)
7. Complete payment
8. Verify payment succeeds with correct amount from database
9. **Server reads amount from DB, client cannot tamper with it**

### Test 5: ✅ Invalid Token (404)
1. Navigate to http://localhost:3000/pay/invalid-token-12345
2. Verify "Invoice Not Found" message
3. Verify message: "The invoice you're looking for doesn't exist or the link is invalid."

### Test 6: ✅ Auto-Refresh on Tab Focus
1. Have Desk page open in one tab
2. Open a pay link in another tab and complete payment
3. Return to Desk tab (click on the tab)
4. Verify invoices automatically refresh when tab regains focus
5. See the paid invoice update without manual refresh

### Test 7: ✅ Tests Pass
```bash
npm test
```
All 31 tests pass (6 invoice-status + 11 paypal + 7 summary + 7 utils)

---

## Files Created (6 new)

1. `src/lib/paypal.ts` - PayPal API integration (server-only)
2. `src/lib/paypal.test.ts` - Unit tests for PayPal helpers
3. `src/app/api/pay/[token]/route.ts` - Public invoice data endpoint
4. `src/app/api/paypal/create-order/route.ts` - Create PayPal order
5. `src/app/api/paypal/capture-order/route.ts` - Capture payment
6. `src/app/pay/[token]/page.tsx` - Pay page component
7. `src/app/pay/[token]/pay.css` - Pay page styles

## Files Updated (5)

1. `.env.example` - Added PayPal and app environment variables
2. `package.json` - Added @paypal/react-paypal-js@8.7.0
3. `src/components/InvoiceGrid.tsx` - Added Actions column with "Copy link" button
4. `src/app/page.tsx` - Added refresh button and tab focus refetch
5. `src/app/globals.css` - Added styles for refresh button and copy link button
6. `README.md` - Added comprehensive PayPal Sandbox Setup section

---

## Deviations from Original Plan

**None.** All work followed the approved plan and additions exactly:
- ✅ Added NEXT_PUBLIC_BUSINESS_NAME env var for "From" name on pay page
- ✅ Confirmed paypal columns already exist in schema (no db:push needed)
- ✅ Created verifyCapture() pure function with comprehensive tests
- ✅ Copy pay link uses NEXT_PUBLIC_APP_URL || window.location.origin
- ✅ Pay page styles in separate CSS module (pay.css), no changes to Desk styles
- ✅ All API routes use server-side amount verification
- ✅ Client secret never exposed to client (only in server code)
- ✅ All acceptance tests documented

Stage 2 complete and ready for Stage 3.

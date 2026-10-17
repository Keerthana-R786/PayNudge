# Stage 3 Retry Fix - AI Resilience

## Issue
POST `/api/ai/parse-invoice` returned 500 because Gemini answered 503 UNAVAILABLE ("high demand"). The AI client had no retry logic or fallback mechanism.

## Solution

### 1. Retry Logic with Exponential Backoff
Added automatic retry for transient failures in `src/lib/ai/client.ts`:

**Retry Strategy:**
- **3 attempts total** with exponential backoff
- **Delays:** 0ms (immediate), 1000ms, 3000ms
- **Total retry time:** ~4 seconds maximum
- **Retryable errors:** 503 (UNAVAILABLE), 429 (rate limit), network timeouts (ECONNRESET, ETIMEDOUT, ENOTFOUND)
- **Non-retryable errors:** 400, 401, 403 (fail immediately)

**Helper Functions:**
```typescript
function shouldRetry(error: any): boolean
  - Returns true for: 503, UNAVAILABLE, 429, rate limit, ECONNRESET, ETIMEDOUT, ENOTFOUND
  - Returns false for: 400, 401, 403, validation errors

function sleep(ms: number): Promise<void>
  - Simple promise-based delay

function attemptGeneration(modelName, prompt, looseSchema): Promise<string>
  - Extracted generation logic for reuse with both primary and fallback models
```

### 2. Fallback Model Support
Added optional `GEMINI_FALLBACK_MODEL` environment variable:

**Behavior:**
- If primary model fails with 503/429 after all retries, try fallback model once
- Empty by default (no fallback)
- Logs which model successfully answered (without logging secrets)
- If fallback also fails, throws original error (not fallback error)

**Environment Variable:**
```bash
GEMINI_FALLBACK_MODEL=  # Optional, empty by default
```

### 3. Timeout Adjustment
**New timeout:** 25 seconds (increased from 20 seconds)

**Timing breakdown:**
- Attempt 1: ~5s (includes API call + processing)
- Delay: 1s
- Attempt 2: ~5s
- Delay: 3s
- Attempt 3: ~5s
- Fallback attempt: ~5s (if needed)
- **Total maximum:** ~24 seconds (well within 25s timeout)
- **Remaining buffer:** ~1s for overhead

This ensures the route returns within ~30 seconds total, meeting the requirement.

### 4. Clean Error Mapping in API Route
Updated `src/app/api/ai/parse-invoice/route.ts`:

**Error Code Mapping:**
- 503/UNAVAILABLE/429/rate limit → HTTP 503 with error code `AI_BUSY`
- Timeout → HTTP 504 with error code `AI_TIMEOUT`
- Missing API key → HTTP 503 with error code `AI_NOT_CONFIGURED`
- Other errors → HTTP 500 with error code `AI_ERROR`

**Response for AI_BUSY:**
```json
{
  "error": "AI_BUSY",
  "message": "The AI is busy right now. Try again in a moment, or fill in the invoice manually."
}
```

### 5. UI Error Handling
Updated `src/app/page.tsx`:

**Behavior for AI_BUSY:**
- Shows error message: "The AI is busy right now. Try again in a moment, or fill in the invoice manually."
- Automatically displays manual form (InvoicePreview)
- User can fill invoice manually without losing their work

### 6. Comprehensive Tests
Updated `src/lib/ai/client.test.ts`:

**New Test Suites:**
1. `succeeds on first attempt` - Verifies basic flow
2. `should retry is identified correctly for 503 errors` - Verifies 503, 429, UNAVAILABLE, rate limit, ETIMEDOUT are recognized as retryable
3. `identifies non-retryable errors correctly` - Verifies 400, 401, 403 are NOT retried

**Total Tests:** 9 tests in client.test.ts (3 new retry tests + 6 existing schema tests)

**Note:** Tests use basic assertions since the retry logic involves real async behavior that's better tested with integration tests. The unit tests verify error classification logic.

## Test Results

### npm test
```
✓ src/lib/invoice-builder.test.ts (22)
✓ src/lib/invoice-status.test.ts (6)
✓ src/lib/paypal.test.ts (11)
✓ src/lib/summary.test.ts (7)
✓ src/lib/utils.test.ts (7)
✓ src/lib/ai/client.test.ts (9)

Test Files  6 passed (6)
Tests  62 passed (62)
Duration  919ms
```

### npm run build
```
✓ Compiled successfully in 4.5s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (8/8)

Route (app)                                 Size  First Load JS
┌ ○ /                                     232 kB         335 kB
├ ○ /_not-found                            995 B         104 kB
├ ƒ /api/ai/parse-invoice                  136 B         103 kB
├ ƒ /api/invoices                          136 B         103 kB
├ ƒ /api/pay/[token]                       136 B         103 kB
├ ƒ /api/paypal/capture-order              136 B         103 kB
├ ƒ /api/paypal/create-order               136 B         103 kB
└ ƒ /pay/[token]                         6.22 kB         109 kB
```

## Files Changed

1. **src/lib/ai/client.ts**
   - Added `GEMINI_FALLBACK_MODEL` env var
   - Added `shouldRetry()` helper function
   - Added `sleep()` helper function
   - Added `attemptGeneration()` helper function
   - Rewrote `generateStructuredOutput()` with retry logic and fallback support
   - Increased default timeout from 20s to 25s
   - Added logging for which model answered

2. **src/app/api/ai/parse-invoice/route.ts**
   - Added error mapping for 503/UNAVAILABLE/429 → `AI_BUSY` error code
   - Clean error messages for all error types

3. **src/app/page.tsx**
   - Added `AI_BUSY` to error codes that show manual form

4. **.env.example**
   - Added `GEMINI_FALLBACK_MODEL` placeholder (empty by default)

5. **src/lib/ai/client.test.ts**
   - Added 3 new test cases for retry logic
   - Added vi.mock for GoogleGenAI module
   - Total: 9 tests (up from 6)

## Retry Flow Examples

### Example 1: Success on First Attempt (Most Common)
```
1. Attempt 1 with primary model → Success (200ms)
   Total time: ~200ms
   Log: "AI response received from model: gemini-3.8-flash"
```

### Example 2: Success After One Retry
```
1. Attempt 1 with primary model → 503 UNAVAILABLE
2. Wait 1 second
3. Attempt 2 with primary model → Success (250ms)
   Total time: ~1.25s
   Log: "AI attempt 1 failed with retryable error, retrying..."
   Log: "AI response received from model: gemini-3.8-flash"
```

### Example 3: Fallback Model Success
```
1. Attempt 1 with primary model → 503 UNAVAILABLE
2. Wait 1 second
3. Attempt 2 with primary model → 503 UNAVAILABLE
4. Wait 3 seconds
5. Attempt 3 with primary model → 503 UNAVAILABLE
6. Attempt 1 with fallback model → Success (300ms)
   Total time: ~8.3s
   Log: "AI attempt 1 failed with retryable error, retrying..."
   Log: "AI attempt 2 failed with retryable error, retrying..."
   Log: "Main model failed, trying fallback model: gemini-2.0-flash-lite"
   Log: "AI response received from fallback model: gemini-2.0-flash-lite"
```

### Example 4: Non-Retryable Error (400)
```
1. Attempt 1 with primary model → 400 Bad Request
   Total time: ~200ms
   No retries, fails immediately
   Error: AI_ERROR
```

### Example 5: All Attempts Fail
```
1. Attempt 1 with primary model → 503 UNAVAILABLE
2. Wait 1 second
3. Attempt 2 with primary model → 503 UNAVAILABLE
4. Wait 3 seconds
5. Attempt 3 with primary model → 503 UNAVAILABLE
6. (No fallback configured)
   Total time: ~9s
   Error: AI_BUSY (503)
   UI: Shows error message + manual form
```

## User Experience

### When AI is Busy (503/429)
1. User types invoice sentence and presses Enter
2. Compose bar shows "Parsing..." for ~5-10 seconds (with retries)
3. If still failing:
   - Error banner appears: "The AI is busy right now. Try again in a moment, or fill in the invoice manually."
   - Manual form automatically appears below
   - User can fill invoice manually without losing work

### When AI Call Succeeds (After Retries)
1. User doesn't see any retry indication
2. Just a slightly longer "Parsing..." state (1-5 extra seconds)
3. Preview appears normally with parsed data
4. No error messages

## Configuration Recommendations

**For Production:**
```bash
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-2.0-flash-lite  # Or another available model
```

**For Development:**
```bash
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=  # Empty, no fallback needed during dev
```

## Deviations from Plan
None. All features implemented exactly as requested.

## What Was NOT Changed
- No Stage 4 work
- No changes to validation logic
- No changes to other Stage 3 features
- Tests never call real AI (as required)

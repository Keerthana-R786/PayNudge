# Phase 1 - Stage 4 Bug Fixes - COMPLETE

## Tests: ✅ 109 passed (109)
## Build: ✅ Compiled successfully

---

## 1a. BRIEF ERROR - FIXED ✅

### Diagnosis
The insights route was collecting allowed amounts incorrectly by extracting from formatted strings (with "$" and commas) instead of using raw cent values from the database.

### Fixes Applied
1. **Fixed allowed amounts collection** in `src/app/api/insights/route.ts`:
   - Changed to use raw `summary.outstanding`, `summary.overdue`, `summary.paidThisMonth` (all in cents)
   - Changed to pull top overdue amounts directly from invoice `amountCents` field, not from formatted strings
   
2. **Separated error codes**:
   - Guard failures now return `AI_VALIDATION_FAILED` with HTTP 422 and message: "The AI wrote a figure that does not match your ledger. Try again."
   - Real AI unavailability (503/429) returns `AI_BUSY` with HTTP 503 and message: "The AI is busy right now. Try again in a moment."
   
3. **Updated prompt** in `src/lib/ai/prompts.ts`:
   - Already had explicit instruction: "Write full dollar amounts like '$13,800' or '$13,800.00', NEVER abbreviations like '$13.8k' or '13.8K'"
   
4. **Removed all temporary logging** from insights route

5. **Applied same error separation to reminder route** (`src/app/api/ai/reminder/route.ts`)

6. **Updated UI components** to handle both error codes:
   - `src/components/InsightsBrief.tsx`
   - `src/components/ReminderSection.tsx`

---

## 1b. DAYS OVERDUE - FIXED ✅

### Issue
PN-0010 has due date 31 days ago. The calculation used `new Date(dateString)` which creates dates with local timezone at midnight, causing potential timezone drift.

### Fix Applied
**Rewrote `calculateDaysOverdue` function** in both files to use UTC date-only calculations:
- `src/lib/reminder-facts.ts`
- `src/lib/insights-facts.ts`

**New implementation:**
```typescript
function calculateDaysOverdue(dueDate: string, today: string): number {
  // Parse dates in UTC to avoid timezone issues
  const dueUTC = Date.UTC(
    parseInt(dueDate.substring(0, 4)),
    parseInt(dueDate.substring(5, 7)) - 1,
    parseInt(dueDate.substring(8, 10))
  );
  const todayUTC = Date.UTC(
    parseInt(today.substring(0, 4)),
    parseInt(today.substring(5, 7)) - 1,
    parseInt(today.substring(8, 10))
  );
  
  const diffMs = todayUTC - dueUTC;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
```

### Tests Added
Added comprehensive tests in `src/lib/reminder-facts.test.ts`:
- Month boundary test (Nov 30 → Dec 1 = 1 day)
- Year boundary test (Dec 31 → Jan 1 = 1 day)
- 31 days overdue test (specific to PN-0010 case)

All tests pass with UTC date-only calculations.

---

## 1c. REMINDER EDIT AND SEND - COMPLETE ✅

### Verification
The `ReminderSection.tsx` component has all required UI elements:

**For draft reminders:**
- ✅ Editable subject input field (200 char max)
- ✅ Editable body textarea (2000 char max, 8 rows)
- ✅ **Save edits** button - saves draft without sending
- ✅ **Mark as sent** button - sends the edited text to POST `/api/reminders/[id]/send`
- ✅ **Copy** button - copies subject + body to clipboard
- ✅ **Open in email app** button - opens mailto: link (shown only if clientEmail exists)
- ✅ **Discard** button - closes the draft

**For sent reminders:**
- ✅ Read-only display with sent date
- ✅ Shows tone badge and status badge

### New API Route Created
**`src/app/api/reminders/[id]/route.ts`** - PATCH endpoint to update draft reminders:
- Validates reminder exists and is in draft status
- Updates subject and body fields
- Returns 400 if trying to edit a sent reminder
- Includes full Zod-style validation for inputs

---

## 1d. COPY LINK - VERIFIED ✅

The fix from the previous bug fix is still in place and working correctly in `src/components/InvoiceGrid.tsx`:

```typescript
onRowClicked={(event) => {
  // Don't open drawer for pinned totals row
  if (event.node.isRowPinned()) {
    return;
  }
  // Don't open drawer if clicking on actions column
  const target = event.event?.target as HTMLElement;
  if (target && target.closest('.copy-link-button')) {
    return;
  }
  if (event.data && event.data.id && onRowClick) {
    onRowClick(event.data.id);
  }
}}
```

**Behavior:**
- ✅ Clicking "Copy link" copies the link but does NOT open the drawer
- ✅ Clicking anywhere else in the row opens the drawer
- ✅ Clicking the pinned Total row does NOT open the drawer

---

## Files Modified in Phase 1

### API Routes
1. `src/app/api/insights/route.ts` - Fixed allowed amounts, separated error codes, removed logging
2. `src/app/api/ai/reminder/route.ts` - Separated error codes
3. `src/app/api/reminders/[id]/route.ts` - **NEW FILE** - PATCH endpoint for saving draft edits

### Library Functions
4. `src/lib/reminder-facts.ts` - UTC date-only calculation for days overdue
5. `src/lib/insights-facts.ts` - UTC date-only calculation for days overdue

### Components
6. `src/components/ReminderSection.tsx` - Added Save edits button and handler, updated error handling
7. `src/components/InsightsBrief.tsx` - Updated error handling for AI_VALIDATION_FAILED

### Tests
8. `src/lib/reminder-facts.test.ts` - Added 3 new tests for boundary cases and 31-day scenario

### Prompts
9. `src/lib/ai/prompts.ts` - Already had abbreviation prohibition, no changes needed

---

## Test Results

```
 Test Files  10 passed (10)
      Tests  109 passed (109)
   Duration  950ms
```

## Build Results

```
 ✓ Compiled successfully in 8.8s
 ✓ Linting and checking validity of types
 ✓ Collecting page data
 ✓ Generating static pages (8/8)
```

All 13 API routes built successfully, including the new `/api/reminders/[id]` route.

---

## Manual Test Steps for Phase 1

### Test 1a: Brief Error Handling
1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Click "Brief" button in the summary strip
4. Should generate successfully using correct cent values from database
5. If guard rejects (unlikely), should show: "The AI wrote a figure that does not match your ledger. Try again."
6. If AI is busy (503/429), should show: "The AI is busy right now. Try again in a moment."

### Test 1b: Days Overdue Calculation
1. Click on invoice PN-0010 (Zenith Consulting) in the grid
2. In the drawer, click "Generate Reminder" with any tone
3. The generated reminder should say "31 days overdue" (not a wrong number)
4. Verify other overdue invoices show correct days in their reminders

### Test 1c: Reminder Edit and Send
1. With a draft reminder visible in the drawer:
   - Edit the subject text
   - Edit the body text
   - Click "Save edits" → should save and show success message
   - Click "Generate Reminder" again to see the saved edits persisted
   - Click "Mark as sent" → should mark as sent, add timeline event, show as read-only
2. Click "Copy" → should copy subject + body to clipboard
3. Click "Open in email app" → should open mailto: link with pre-filled subject/body

### Test 1d: Copy Link vs Row Click
1. In the grid, click the "Copy link" button on any invoice row
   - Should copy link and show "Copied!" briefly
   - Should NOT open the drawer
2. Click anywhere else in the same row (number, client, description, amount, etc.)
   - Should open the drawer
3. Click the pinned Total row at the bottom
   - Should NOT open the drawer

---

## What Was NOT Changed

- No new dependencies added
- No renaming of existing files
- No changes to PayPal payment logic
- Money amounts still only come from database, never computed by AI
- No secrets in code, all in env vars only
- All AI routes still marked as `export const dynamic = 'force-dynamic'`

---

## Ready for Phase 2

Phase 1 is complete. All bugs fixed, all tests pass, build succeeds. The application is ready for Phase 2 (Design polish).

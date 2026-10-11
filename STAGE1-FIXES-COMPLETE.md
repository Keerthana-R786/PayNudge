# Stage 1 Fixes Complete

## Issues Fixed

### 1. ✅ STATUS COLUMN BUG - Fixed
**Problem:** Status column showed raw HTML text `<span class...`  
**Solution:** Created proper React component `StatusCellRenderer` that returns JSX  
**Styling:** Small uppercase text stamp with colored left tick (8px × 2px)
- PAID: green (#1F5C4A)
- SENT: neutral gray (#1C1B18 at 60% opacity)
- OVERDUE: rust (#A8442A)
- VOID: gray with strikethrough

### 2. ✅ FONTS - Fixed
**Implementation:** Using `next/font/google` in `layout.tsx`

**Font Usage:**
- **Headings (h1-h6):** Fraunces (serif) - via `--font-serif` variable
- **Body/UI text:** IBM Plex Sans - via `--font-sans` variable
- **Table text:** IBM Plex Sans (AG Grid uses `--font-sans`)
- **Amounts in table cells:** IBM Plex Mono - via `.amount-cell` class with `--font-mono`
- **Totals row:** IBM Plex Mono - via `.ag-pinned-bottom-row` with `--font-mono`
- **Summary figures:** IBM Plex Mono - changed from serif to mono with `font-variant-numeric: tabular-nums`

**Google Fonts Loading:**
```typescript
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });
```

All fonts load properly via Next.js font optimization.

### 3. ✅ SCROLLBAR - Fixed
**Problem:** Stray second scrollbar beside pinned totals row  
**Solution:** Changed to `domLayout="autoHeight"` in AG Grid  
**Result:** Grid expands to fit all rows, single page scrollbar only

### 4. ✅ TOTALS LABEL - Fixed
**Changed:** "Total" → "Total (excl. void)"  
**Location:** Pinned bottom row in Description column

### 5. ✅ SEED NUMBERS - Fixed
**Changed:** `INV-2024-001` through `INV-2024-014` → `PN-0001` through `PN-0014`  
**Status:** No tests referenced old invoice numbers, so no test updates needed  
**Seed safety:** Still safe to run twice (clears all data before inserting)

### 6. ✅ REPORT - Generated

See full report below with all 14 invoices and summary calculations.

---

## Test Results

```
✓ src/lib/invoice-status.test.ts (6)
✓ src/lib/summary.test.ts (7)
✓ src/lib/utils.test.ts (7)

Test Files  3 passed (3)
     Tests  20 passed (20)
   Start at  16:17:48
   Duration  562ms
```

## Build Results

```
✓ Compiled successfully in 4.4s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (5/5)
✓ Finalizing page optimization

Route (app)                                 Size  First Load JS
┌ ○ /                                     230 kB         333 kB
├ ○ /_not-found                            995 B         104 kB
└ ƒ /api/invoices                          123 B         103 kB
```

---

## Invoice Report (as of 2026-10-11)

### All 14 Invoices

| Number  | Client                  | Amount       | Issued     | Due        | Status  | Paid At    |
|---------|-------------------------|--------------|------------|------------|---------|------------|
| PN-0001 | Northwind Studio        | $2,450.00    | 2026-09-06 | 2026-09-20 | PAID    | 2026-09-19 |
| PN-0002 | Acme Corporation        | $1,800.00    | 2026-09-13 | 2026-09-27 | PAID    | 2026-09-26 |
| PN-0003 | Blue Horizon LLC        | $4,200.00    | 2026-09-21 | 2026-10-05 | PAID    | 2026-10-06 |
| PN-0004 | Stellar Ventures        | $1,550.00    | 2026-09-29 | 2026-10-09 | PAID    | 2026-10-10 |
| PN-0005 | Quantum Labs            | $850.00      | 2026-10-03 | 2026-10-13 | PAID    | 2026-10-08 |
| PN-0006 | Summit Digital          | $5,800.00    | 2026-10-06 | 2026-10-20 | SENT    | —          |
| PN-0007 | Pioneer Media Group     | $3,200.00    | 2026-10-08 | 2026-10-22 | SENT    | —          |
| PN-0008 | Ember Studios           | $2,750.00    | 2026-10-09 | 2026-10-23 | SENT    | —          |
| PN-0009 | Cascade Networks        | $1,950.00    | 2026-10-11 | 2026-10-25 | SENT    | —          |
| PN-0010 | Zenith Consulting       | $3,400.00    | 2026-08-27 | 2026-09-10 | OVERDUE | —          |
| PN-0011 | Vertex Solutions        | $6,800.00    | 2026-09-03 | 2026-09-17 | OVERDUE | —          |
| PN-0012 | Meridian Technologies   | $1,200.00    | 2026-09-11 | 2026-09-25 | OVERDUE | —          |
| PN-0013 | Solstice Partners       | $2,400.00    | 2026-09-16 | 2026-09-30 | OVERDUE | —          |
| PN-0014 | Atlas Industries        | $950.00      | 2026-09-23 | 2026-10-07 | VOID    | —          |

### Summary Calculations

#### 1. OUTSTANDING: $27,500.00
**Formula:** Sum of amountCents where displayStatus = "sent" OR "overdue"

**Breakdown:**
- PN-0006 (sent): $5,800.00
- PN-0007 (sent): $3,200.00
- PN-0008 (sent): $2,750.00
- PN-0009 (sent): $1,950.00
- PN-0010 (overdue): $3,400.00
- PN-0011 (overdue): $6,800.00
- PN-0012 (overdue): $1,200.00
- PN-0013 (overdue): $2,400.00

**Total:** $27,500.00

#### 2. OVERDUE: $13,800.00
**Formula:** Sum of amountCents where status = "sent" AND dueDate < today (2026-10-11)

**Breakdown:**
- PN-0010 (due 2026-09-10): $3,400.00
- PN-0011 (due 2026-09-17): $6,800.00
- PN-0012 (due 2026-09-25): $1,200.00
- PN-0013 (due 2026-09-30): $2,400.00

**Total:** $13,800.00

#### 3. PAID THIS MONTH: $6,600.00
**Formula:** Sum of amountCents where status = "paid" AND paidAt >= "2026-10-01"

**Breakdown:**
- PN-0003 (paid 2026-10-06): $4,200.00
- PN-0004 (paid 2026-10-10): $1,550.00
- PN-0005 (paid 2026-10-08): $850.00

**Total:** $6,600.00

#### 4. AVERAGE DAYS TO PAY: 11 days
**Formula:** Mean of (paidAt - issueDate) in whole days for all paid invoices

**Breakdown:**
- PN-0001: 2026-09-19 - 2026-09-06 = 13 days
- PN-0002: 2026-09-26 - 2026-09-13 = 13 days
- PN-0003: 2026-10-06 - 2026-09-21 = 15 days
- PN-0004: 2026-10-10 - 2026-09-29 = 11 days
- PN-0005: 2026-10-08 - 2026-10-03 = 5 days

**Average:** (13 + 13 + 15 + 11 + 5) / 5 = 11 days

---

## Files Changed

1. `src/components/InvoiceGrid.tsx` - Added StatusCellRenderer component, fixed totals label, removed fixed height
2. `src/app/globals.css` - Changed summary-value and pinned row to use mono font with tabular-nums
3. `src/db/seed.ts` - Changed invoice numbers from INV-2024-001..014 to PN-0001..PN-0014
4. `scripts/report.ts` - Created report generation script (for documentation only)

All issues resolved. Stage 1 complete and ready for Stage 2.

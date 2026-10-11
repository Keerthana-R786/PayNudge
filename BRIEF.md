### **1\. Requirements**

#### **Functional requirements**

1. **Create an invoice from natural language.** The user types a sentence such as “Invoice Northwind Studio \$450 for logo redesign, due in 14 days”. The AI returns structured fields in a review form. Nothing is saved until the user clicks Confirm.  
2. **Hosted pay page.** Each invoice gets a public link, `/pay/<token>`. It looks like a printed invoice and has a PayPal button (sandbox).  
3. **Real sandbox payment.** The server creates the PayPal order and captures it. On success the invoice becomes Paid.  
4. **Invoice ledger (AG Grid).** It has sorting, filtering, a quick search, status badges, a pinned totals row, and row actions.  
5. **Overdue detection.** Code computes it from due date and status.  
6. **AI reminder drafts.** The user picks a tone (friendly, firm, final notice), the AI drafts a message, the user edits it, then marks it sent. Reminders are logged.  
7. **AI cash-flow brief.** One paragraph on what’s outstanding, what’s overdue, and who to chase first. It is based only on numbers the server computed.  
8. **Seed/demo data**, so judges see a populated app instantly.

#### **Non-functional requirements**

* Runs with `npm install && npm run dev` after copying `.env.example` to `.env`.  
* Secrets stay in environment variables. Amounts are computed server-side only.  
* All AI output is validated against a schema, with a clear error state if it fails.  
* Works in the latest Chrome on desktop.

#### **Out of scope (say this in your README)**

User accounts, real emails, tax, multi-currency, refunds, mobile layout polish, PayPal Invoicing API (a stretch goal only).

### **2\. Tech stack**

* **Next.js (App Router) \+ TypeScript.** One codebase for UI and API routes.  
* **SQLite** via Drizzle or Prisma. No separate database server to set up.  
* **AG Grid Community** (`ag-grid-react`).  
* **PayPal REST API (sandbox):** Orders v2 for create and capture, plus `@paypal/react-paypal-js` for the button.  
* **AI:** I suggest Gemini through Google AI Studio, since it has a free tier and fits Antigravity. Use structured JSON output. Check AI Studio for the current model name and free-tier limits. Anthropic’s API also works. Whichever you pick, name it and explain how it is used in your submission text.  
* **Zod** for validating AI and request data.  
* **Render** for hosting.

**Deployment note:** Render’s free web services have an ephemeral filesystem, so SQLite data resets on redeploy or restart. For a demo, seed the database on startup, and say so in the README. Verify current free-tier behavior in Render’s docs.

**Why Orders v2 and not the Invoicing API:** Orders is the most documented sandbox path, and you control the whole pay page. That makes the demo reliable. Add PayPal Invoicing only if you finish early.

### **3\. System design**

#### **Data model**

* **invoices:** id, public\_token, invoice\_number, client\_name, client\_email, description, line\_items (JSON), currency (USD), amount\_cents, status (`draft` | `sent` | `paid` | `void`), issue\_date, due\_date, paypal\_order\_id, paypal\_capture\_id, paid\_at, created\_at  
* **reminders:** id, invoice\_id, tone, body, status (`draft` | `sent`), created\_at  
* **events:** id, invoice\_id, type, detail, created\_at (an audit trail)

**Overdue is derived**, not stored: `status = sent AND due_date < today`. This avoids stale data.

#### **API routes**

| Route | Purpose |
| ----- | ----- |
| `POST /api/ai/parse-invoice` | Sentence in, validated invoice draft out. No DB write. |
| `POST /api/invoices` | Save a confirmed invoice. |
| `GET /api/invoices` | List for the grid, with derived overdue flag. |
| `GET /api/pay/[token]` | Public invoice data for the pay page. |
| `POST /api/paypal/create-order` | Body has the token only. The server reads the amount from the DB. |
| `POST /api/paypal/capture-order` | Captures, verifies `COMPLETED` and the amount, then marks Paid. |
| `POST /api/ai/reminder` | Draft a reminder for an invoice and tone. |
| `POST /api/reminders/[id]/send` | Marks the reminder as sent and logs an event. |
| `GET /api/insights` | Server computes totals, AI narrates them. |

#### **PayPal integration (sandbox)**

* Base URL: `https://api-m.sandbox.paypal.com`  
* Get an access token with `POST /v1/oauth2/token` using your sandbox client ID and secret.  
* Create an order with `POST /v2/checkout/orders`, then capture with `POST /v2/checkout/orders/{id}/capture`.  
* In the PayPal Developer Dashboard, create a sandbox app. Use the sandbox **personal** (buyer) account to pay during testing.  
* Optional: a webhook for `PAYMENT.CAPTURE.COMPLETED` as a safety net, which needs your deployed URL.

#### **Data flow: creating and paying an invoice**

1. The user types a sentence. The browser sends it to `/api/ai/parse-invoice`.  
2. The server calls the AI with a JSON schema. Zod validates the result, and the server returns a draft.  
3. The user edits the draft and confirms. The server saves the invoice with status `sent` and a random public token.  
4. The user copies the pay link and opens it (as the client would).  
5. The client clicks the PayPal button. The browser asks `/api/paypal/create-order` with only the token. The server looks up the amount and creates the order.  
6. The client approves in the PayPal popup. The browser calls `/api/paypal/capture-order`. The server captures, verifies, and updates the DB.  
7. The dashboard grid refreshes and the invoice shows Paid.

#### **Data flow: reminders and insights**

Server computes overdue invoices and totals. It sends only those facts to the AI. The AI returns text. The server validates the shape and stores it. The user reviews and edits before anything is marked sent.

#### **Workflow (state machine)**

`draft (AI preview, unsaved)` then `sent` then either `paid` or (derived) `overdue` then `paid`. `void` is available from `sent`.

### **4\. Pages and user flow**

**Screens**

1. **Desk (`/`)** is the main dashboard.  
2. **Invoice drawer** slides in over Desk with details, timeline and reminder tools.  
3. **Pay page (`/pay/[token]`)** is the client-facing invoice.

**Primary user flow (this is your demo)**

1. Open Desk and see the summary line and a populated ledger.  
2. Type a sentence in the compose bar, review the parsed fields, and confirm.  
3. Copy the pay link, open it in a new tab, and pay with the sandbox buyer account.  
4. Return to Desk. The invoice is Paid and the totals changed.  
5. Open an overdue invoice, pick a tone, generate the reminder, edit it, and mark it sent.  
6. Click “Brief” to read the AI cash-flow summary.

**Edge states to build:** AI parse failure (show the raw sentence and a manual form), PayPal cancel (friendly message, invoice stays unpaid), already-paid invoice link, invalid token (404 page), empty ledger.

### **5\. UI/UX design plan (so it doesn’t look AI-generated)**

The usual “AI look” is a purple or blue gradient, glassmorphism, big rounded cards with soft shadows, emoji icons, a centered hero, and the Inter font everywhere. Do the opposite. Give the app the feel of a **well-kept ledger**.

**Visual direction: “paper ledger”**

* **Colors:** warm paper background `#F6F3EC`, ink text `#1C1B18`, hairline borders `#D9D4C7`, one accent, a deep green `#1F5C4A`. Use a muted rust `#A8442A` only for overdue. Nothing else.  
* **Type:** a serif for headings and the big numbers (for example Fraunces or Source Serif), a clean sans for UI (for example IBM Plex Sans), and tabular or mono figures for all amounts (IBM Plex Mono). Check these are available on Google Fonts.  
* **Shape:** 2-4px corner radius, 1px lines instead of shadows, and generous but not floaty spacing.  
* **Layout:** table-first and dense. The summary is a ruled strip of four figures (Outstanding, Overdue, Paid this month, Avg days to pay), not four cards.  
* **Status:** small uppercase text stamps with a colored left tick, not pill badges.  
* **Compose bar:** styled like a line on a letter, with a placeholder that gives a real example. Parsed fields appear below as a “proof” you confirm.  
* **Pay page:** looks like a printed invoice: invoice number, ruled line items, total in the serif, PayPal button at the bottom.  
* **AG Grid styling:** override the theme with your colors, fonts and row height. Check your installed AG Grid version’s theming docs, since the theming approach changed between major versions.  
* **Copy:** write real, plain microcopy (“Nothing overdue. Nice.” instead of “No data available”). No sparkle icons, and label AI output simply as “Drafted by AI, review before sending.”  
* **Motion:** only a subtle drawer slide and a row highlight when a status changes.  
* **Details that signal craft:** keyboard shortcut to focus the compose bar, a visible loading state while the AI works, a toast for each action, and dates formatted like “12 Oct”.


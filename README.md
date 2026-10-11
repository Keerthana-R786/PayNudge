# PayNudge

An AI-powered collections desk for freelancers. Create invoices from natural language, receive payments via PayPal sandbox, and track everything in a ledger.

Built for the PayPal AI Hackathon.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **SQLite** with Drizzle ORM and better-sqlite3
- **AG Grid Community** for the invoice ledger
- **PayPal REST API** (Orders v2, sandbox)
- **Gemini API** for AI-powered features
- **Zod** for validation

## Requirements

- **Node.js 20.0.0 or higher**
- npm or yarn
- A Gemini API key (free tier from Google AI Studio)
- PayPal sandbox credentials (from PayPal Developer Dashboard)

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   - `GEMINI_API_KEY` - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` - See PayPal Sandbox Setup below
   - `NEXT_PUBLIC_PAYPAL_CLIENT_ID` - Same as PAYPAL_CLIENT_ID (needed for client-side PayPal button)
   - `NEXT_PUBLIC_APP_URL` - Your app URL (default: http://localhost:3000)
   - `NEXT_PUBLIC_BUSINESS_NAME` - Your business name (default: PayNudge Demo Studio)

3. **Initialize the database:**
   ```bash
   npm run db:push
   ```

4. **Seed with demo data:**
   ```bash
   npm run db:seed
   ```
   
   This creates 14 realistic fictional invoices. Safe to run multiple times.

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open in your browser:**
   ```
   http://localhost:3000
   ```

## PayPal Sandbox Setup

PayNudge uses PayPal's sandbox environment for testing payments. No real money is involved.

1. **Create a PayPal Developer account:**
   - Go to [developer.paypal.com](https://developer.paypal.com)
   - Sign in or create an account

2. **Create a sandbox app:**
   - Navigate to "Apps & Credentials"
   - Make sure you're in "Sandbox" mode (toggle at the top)
   - Click "Create App"
   - Give it a name (e.g., "PayNudge Sandbox")
   - Click "Create App"

3. **Copy your credentials:**
   - You'll see your **Client ID** and **Secret** on the app details page
   - Copy the Client ID to both `PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID` in your `.env`
   - Copy the Secret to `PAYPAL_CLIENT_SECRET` in your `.env`
   - **Important:** Never commit your `.env` file or expose these credentials

4. **Get sandbox test accounts:**
   - Go to "Sandbox" → "Accounts" in the PayPal Developer Dashboard
   - You'll see automatically created test accounts:
     - **Business account** (merchant) - this receives payments
     - **Personal account** (buyer) - use this to pay invoices
   - Click on a Personal account and note the email and password (or create a new one)

5. **Test a payment:**
   - In PayNudge, copy a pay link for any "sent" invoice
   - Open it in a new tab
   - Click the PayPal button
   - Log in with your **sandbox personal (buyer) account** credentials
   - Complete the payment
   - Return to the dashboard and click Refresh to see the invoice marked as Paid

**Note:** Sandbox payments are not real. You're using fake accounts and fake money provided by PayPal for testing.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema changes
- `npm run db:seed` - Seed database with demo data
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode

## Testing

Run the test suite:
```bash
npm test
```

The tests cover:
- Invoice status display logic
- Summary calculations (Outstanding, Overdue, Paid this month, Average days to pay)

## What's Out of Scope

Per the project brief, the following are intentionally not included:
- User accounts or authentication
- Real email sending
- Tax calculations
- Multi-currency support
- Refunds
- Mobile layout polish
- PayPal Invoicing API (Orders v2 only)

## Deployment Notes

This app uses SQLite for simplicity. On platforms with ephemeral filesystems (like Render's free tier), the database resets on redeploy. The seed script runs on startup to repopulate demo data.

For production use, migrate to PostgreSQL or another persistent database.

## License

MIT - see LICENSE file for details.

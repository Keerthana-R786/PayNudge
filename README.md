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
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` - Get from [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) (sandbox app)

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

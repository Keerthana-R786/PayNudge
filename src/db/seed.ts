import { db } from './index';
import { invoices, reminders, events } from './schema';
import { sql } from 'drizzle-orm';

function getRelativeDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await db.delete(events);
  await db.delete(reminders);
  await db.delete(invoices);

  const today = new Date().toISOString().split('T')[0];

  // Create 14 realistic invoices with varied statuses
  const seedInvoices = [
    // Paid invoices (5)
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0001',
      clientName: 'Northwind Studio',
      clientEmail: 'billing@northwind.design',
      description: 'Logo redesign and brand guidelines',
      lineItems: [{ description: 'Logo redesign and brand guidelines', amountCents: 245000 }],
      currency: 'USD',
      amountCents: 245000,
      status: 'paid' as const,
      issueDate: getRelativeDate(-35),
      dueDate: getRelativeDate(-21),
      paypalOrderId: '8XY12345ABC',
      paypalCaptureId: '9AB67890DEF',
      paidAt: getRelativeDate(-22),
      createdAt: getRelativeDate(-35),
    },
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0002',
      clientName: 'Acme Corporation',
      clientEmail: 'accounts@acme.com',
      description: 'Website maintenance - Q3',
      lineItems: [{ description: 'Website maintenance - Q3', amountCents: 180000 }],
      currency: 'USD',
      amountCents: 180000,
      status: 'paid' as const,
      issueDate: getRelativeDate(-28),
      dueDate: getRelativeDate(-14),
      paypalOrderId: '7CD98765XYZ',
      paypalCaptureId: '6EF54321GHI',
      paidAt: getRelativeDate(-15),
      createdAt: getRelativeDate(-28),
    },
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0003',
      clientName: 'Blue Horizon LLC',
      clientEmail: 'finance@bluehorizon.io',
      description: 'Mobile app UI/UX design',
      lineItems: [{ description: 'Mobile app UI/UX design', amountCents: 420000 }],
      currency: 'USD',
      amountCents: 420000,
      status: 'paid' as const,
      issueDate: getRelativeDate(-20),
      dueDate: getRelativeDate(-6),
      paypalOrderId: '5GH23456JKL',
      paypalCaptureId: '4IJ78901MNO',
      paidAt: getRelativeDate(-5),
      createdAt: getRelativeDate(-20),
    },
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0004',
      clientName: 'Stellar Ventures',
      clientEmail: 'pay@stellarventures.co',
      description: 'Landing page design and development',
      lineItems: [{ description: 'Landing page design and development', amountCents: 155000 }],
      currency: 'USD',
      amountCents: 155000,
      status: 'paid' as const,
      issueDate: getRelativeDate(-12),
      dueDate: getRelativeDate(-2),
      paypalOrderId: '3KL45678PQR',
      paypalCaptureId: '2MN89012STU',
      paidAt: getRelativeDate(-1),
      createdAt: getRelativeDate(-12),
    },
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0005',
      clientName: 'Quantum Labs',
      clientEmail: 'billing@quantumlabs.tech',
      description: 'Product photography editing',
      lineItems: [{ description: 'Product photography editing', amountCents: 85000 }],
      currency: 'USD',
      amountCents: 85000,
      status: 'paid' as const,
      issueDate: getRelativeDate(-8),
      dueDate: getRelativeDate(2),
      paypalOrderId: '1OP67890VWX',
      paypalCaptureId: '0QR12345YZA',
      paidAt: getRelativeDate(-3),
      createdAt: getRelativeDate(-8),
    },

    // Sent invoices, not yet due (4)
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0006',
      clientName: 'Summit Digital',
      clientEmail: 'accounts@summitdigital.com',
      description: 'E-commerce site redesign - Phase 1',
      lineItems: [{ description: 'E-commerce site redesign - Phase 1', amountCents: 580000 }],
      currency: 'USD',
      amountCents: 580000,
      status: 'sent' as const,
      issueDate: getRelativeDate(-5),
      dueDate: getRelativeDate(9),
      paypalOrderId: null,
      paypalCaptureId: null,
      paidAt: null,
      createdAt: getRelativeDate(-5),
    },
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0007',
      clientName: 'Pioneer Media Group',
      clientEmail: 'billing@pioneermedia.net',
      description: 'Content strategy consultation',
      lineItems: [{ description: 'Content strategy consultation', amountCents: 320000 }],
      currency: 'USD',
      amountCents: 320000,
      status: 'sent' as const,
      issueDate: getRelativeDate(-3),
      dueDate: getRelativeDate(11),
      paypalOrderId: null,
      paypalCaptureId: null,
      paidAt: null,
      createdAt: getRelativeDate(-3),
    },
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0008',
      clientName: 'Ember Studios',
      clientEmail: 'finance@emberstudios.co',
      description: 'Brand identity package',
      lineItems: [{ description: 'Brand identity package', amountCents: 275000 }],
      currency: 'USD',
      amountCents: 275000,
      status: 'sent' as const,
      issueDate: getRelativeDate(-2),
      dueDate: getRelativeDate(12),
      paypalOrderId: null,
      paypalCaptureId: null,
      paidAt: null,
      createdAt: getRelativeDate(-2),
    },
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0009',
      clientName: 'Cascade Networks',
      clientEmail: 'ap@cascadenetworks.io',
      description: 'Web application wireframes',
      lineItems: [{ description: 'Web application wireframes', amountCents: 195000 }],
      currency: 'USD',
      amountCents: 195000,
      status: 'sent' as const,
      issueDate: today,
      dueDate: getRelativeDate(14),
      paypalOrderId: null,
      paypalCaptureId: null,
      paidAt: null,
      createdAt: today,
    },

    // Overdue invoices (4)
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0010',
      clientName: 'Zenith Consulting',
      clientEmail: 'payments@zenithconsulting.biz',
      description: 'Dashboard UI design',
      lineItems: [{ description: 'Dashboard UI design', amountCents: 340000 }],
      currency: 'USD',
      amountCents: 340000,
      status: 'sent' as const,
      issueDate: getRelativeDate(-45),
      dueDate: getRelativeDate(-31),
      paypalOrderId: null,
      paypalCaptureId: null,
      paidAt: null,
      createdAt: getRelativeDate(-45),
    },
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0011',
      clientName: 'Vertex Solutions',
      clientEmail: 'billing@vertexsolutions.com',
      description: 'Marketing website development',
      lineItems: [{ description: 'Marketing website development', amountCents: 680000 }],
      currency: 'USD',
      amountCents: 680000,
      status: 'sent' as const,
      issueDate: getRelativeDate(-38),
      dueDate: getRelativeDate(-24),
      paypalOrderId: null,
      paypalCaptureId: null,
      paidAt: null,
      createdAt: getRelativeDate(-38),
    },
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0012',
      clientName: 'Meridian Technologies',
      clientEmail: 'accounts@meridiantech.io',
      description: 'API documentation design',
      lineItems: [{ description: 'API documentation design', amountCents: 120000 }],
      currency: 'USD',
      amountCents: 120000,
      status: 'sent' as const,
      issueDate: getRelativeDate(-30),
      dueDate: getRelativeDate(-16),
      paypalOrderId: null,
      paypalCaptureId: null,
      paidAt: null,
      createdAt: getRelativeDate(-30),
    },
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0013',
      clientName: 'Solstice Partners',
      clientEmail: 'finance@solsticepartners.net',
      description: 'Corporate presentation design',
      lineItems: [{ description: 'Corporate presentation design', amountCents: 240000 }],
      currency: 'USD',
      amountCents: 240000,
      status: 'sent' as const,
      issueDate: getRelativeDate(-25),
      dueDate: getRelativeDate(-11),
      paypalOrderId: null,
      paypalCaptureId: null,
      paidAt: null,
      createdAt: getRelativeDate(-25),
    },

    // One void invoice
    {
      publicToken: generateToken(),
      invoiceNumber: 'PN-0014',
      clientName: 'Atlas Industries',
      clientEmail: 'billing@atlasindustries.com',
      description: 'Social media graphics - cancelled',
      lineItems: [{ description: 'Social media graphics - cancelled', amountCents: 95000 }],
      currency: 'USD',
      amountCents: 95000,
      status: 'void' as const,
      issueDate: getRelativeDate(-18),
      dueDate: getRelativeDate(-4),
      paypalOrderId: null,
      paypalCaptureId: null,
      paidAt: null,
      createdAt: getRelativeDate(-18),
    },
  ];

  await db.insert(invoices).values(seedInvoices);

  console.log('✅ Seeded 14 invoices');
  console.log('   - 5 paid');
  console.log('   - 4 sent (not yet due)');
  console.log('   - 4 overdue');
  console.log('   - 1 void');
  console.log('');
  console.log('Run `npm run dev` and open http://localhost:3000');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

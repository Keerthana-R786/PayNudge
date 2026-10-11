import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicToken: text('public_token').notNull().unique(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  description: text('description').notNull(),
  lineItems: text('line_items', { mode: 'json' }).notNull().$type<Array<{ description: string; amountCents: number }>>(),
  currency: text('currency').notNull().default('USD'),
  amountCents: integer('amount_cents').notNull(),
  status: text('status', { enum: ['draft', 'sent', 'paid', 'void'] }).notNull().default('draft'),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  paypalOrderId: text('paypal_order_id'),
  paypalCaptureId: text('paypal_capture_id'),
  paidAt: text('paid_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reminders = sqliteTable('reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
  tone: text('tone', { enum: ['friendly', 'firm', 'final'] }).notNull(),
  body: text('body').notNull(),
  status: text('status', { enum: ['draft', 'sent'] }).notNull().default('draft'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
  type: text('type').notNull(),
  detail: text('detail').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

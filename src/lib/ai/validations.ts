/**
 * Zod schemas for AI-generated invoice drafts
 */

import { z } from 'zod';

/**
 * Schema for AI-parsed invoice draft
 * Matches the field names from test-gemini output
 */
export const InvoiceDraftSchema = z.object({
  client_name: z.string().min(1, 'Client name is required').max(80, 'Client name too long'),
  client_email: z.string().email('Invalid email address').optional(),
  line_items: z
    .array(
      z.object({
        description: z.string().min(1, 'Line item description is required'),
        amount_dollars: z.number().gt(0, 'Amount must be greater than 0').lte(10000, 'Amount cannot exceed $10,000'),
      })
    )
    .min(1, 'At least one line item is required')
    .max(10, 'Cannot exceed 10 line items'),
  due_in_days: z.number().int('Due days must be an integer').gte(1, 'Due days must be at least 1').lte(120, 'Due days cannot exceed 120'),
});

export type InvoiceDraft = z.infer<typeof InvoiceDraftSchema>;

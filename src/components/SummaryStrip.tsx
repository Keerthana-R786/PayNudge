'use client';

import type { Invoice } from '@/db/schema';
import { calculateSummary } from '@/lib/summary';
import { formatCurrency, getTodayString } from '@/lib/utils';

interface SummaryStripProps {
  invoices: Invoice[];
}

export function SummaryStrip({ invoices }: SummaryStripProps) {
  const today = getTodayString();
  const stats = calculateSummary(invoices, today);

  return (
    <div className="summary-strip">
      <div className="summary-item">
        <div className="summary-label">Outstanding</div>
        <div className="summary-value">{formatCurrency(stats.outstanding)}</div>
      </div>
      
      <div className="summary-item">
        <div className="summary-label">Overdue</div>
        <div className="summary-value summary-value-overdue">
          {formatCurrency(stats.overdue)}
        </div>
      </div>
      
      <div className="summary-item">
        <div className="summary-label">Paid this month</div>
        <div className="summary-value">{formatCurrency(stats.paidThisMonth)}</div>
      </div>
      
      <div className="summary-item">
        <div className="summary-label">Avg days to pay</div>
        <div className="summary-value">
          {stats.averageDaysToPay !== null ? stats.averageDaysToPay : '—'}
        </div>
      </div>
    </div>
  );
}

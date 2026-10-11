'use client';

import { useEffect, useState } from 'react';
import type { Invoice } from '@/db/schema';
import { SummaryStrip } from '@/components/SummaryStrip';
import { InvoiceGrid } from '@/components/InvoiceGrid';

interface InvoiceWithOverdue extends Invoice {
  isOverdue: boolean;
}

export default function DeskPage() {
  const [invoices, setInvoices] = useState<InvoiceWithOverdue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = () => {
    setLoading(true);
    fetch('/api/invoices')
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch invoices:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInvoices();

    // Refetch when tab regains focus
    const handleFocus = () => {
      fetchInvoices();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (loading) {
    return (
      <div className="desk-container">
        <header className="desk-header">
          <h1>PayNudge</h1>
          <p className="desk-subtitle">Collections Desk</p>
        </header>
        <div className="loading-state">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="desk-container">
      <header className="desk-header">
        <div>
          <h1>PayNudge</h1>
          <p className="desk-subtitle">Collections Desk</p>
        </div>
        <button onClick={fetchInvoices} className="refresh-button" title="Refresh">
          Refresh
        </button>
      </header>
      
      <SummaryStrip invoices={invoices} />
      
      <div className="ledger-section">
        <InvoiceGrid invoices={invoices} />
      </div>
    </div>
  );
}

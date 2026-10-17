'use client';

import { useEffect, useState, useRef } from 'react';
import type { Invoice } from '@/db/schema';
import type { InvoiceDraft } from '@/lib/ai/validations';
import { SummaryStrip } from '@/components/SummaryStrip';
import { InvoiceGrid } from '@/components/InvoiceGrid';
import { ComposeBar } from '@/components/ComposeBar';
import { InvoicePreview } from '@/components/InvoicePreview';

interface InvoiceWithOverdue extends Invoice {
  isOverdue: boolean;
}

export default function DeskPage() {
  const [invoices, setInvoices] = useState<InvoiceWithOverdue[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [previewMode, setPreviewMode] = useState<'ai' | 'manual' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; payLink?: string } | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const gridWrapperRef = useRef<HTMLDivElement>(null);

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

  const handleDraftReceived = (receivedDraft: InvoiceDraft) => {
    setDraft(receivedDraft);
    setPreviewMode('ai');
    setMessage(null);
  };

  const handleError = (errorCode: string, errorMessage: string) => {
    setMessage({ type: 'error', text: errorMessage });
    // Show manual form on AI errors
    if (errorCode === 'AI_ERROR' || errorCode === 'AI_TIMEOUT' || errorCode === 'AI_NOT_CONFIGURED' || errorCode === 'AI_BUSY') {
      setDraft(null);
      setPreviewMode('manual');
    }
  };

  const handleConfirm = async (confirmedDraft: InvoiceDraft) => {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmedDraft),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to create invoice' });
        return;
      }

      // Success: refresh grid and show message
      setDraft(null);
      setPreviewMode(null);
      await fetchInvoices();

      // Highlight the new invoice
      setHighlightedId(data.id);
      setTimeout(() => setHighlightedId(null), 3000);

      // Show success message with pay link
      const payLink = `${window.location.origin}/pay/${data.publicToken}`;
      setMessage({
        type: 'success',
        text: `Invoice ${data.invoiceNumber} created`,
        payLink,
      });

      // Scroll to top to see the message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Create invoice error:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const handleDiscard = () => {
    setDraft(null);
    setPreviewMode(null);
    setMessage(null);
  };

  const copyPayLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setMessage({ type: 'success', text: 'Pay link copied to clipboard' });
    });
  };

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

      {message && (
        <div className={`message-banner message-${message.type}`}>
          <span>{message.text}</span>
          {message.payLink && (
            <button onClick={() => copyPayLink(message.payLink!)} className="copy-pay-link-button">
              Copy pay link
            </button>
          )}
          <button onClick={() => setMessage(null)} className="message-close">
            ×
          </button>
        </div>
      )}

      <ComposeBar onDraftReceived={handleDraftReceived} onError={handleError} />

      {previewMode && (
        <InvoicePreview
          initialDraft={draft}
          mode={previewMode}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
        />
      )}

      <SummaryStrip invoices={invoices} />

      <div className="ledger-section" ref={gridWrapperRef}>
        <InvoiceGrid invoices={invoices} highlightedId={highlightedId} />
      </div>
    </div>
  );
}

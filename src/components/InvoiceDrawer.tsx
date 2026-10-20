'use client';

import { useEffect, useState } from 'react';
import type { Invoice, Event, Reminder } from '@/db/schema';
import { formatCurrency, formatDate, getTodayString } from '@/lib/utils';
import { getInvoiceDisplayStatus } from '@/lib/invoice-status';
import { ReminderSection } from './ReminderSection';

interface InvoiceDrawerProps {
  invoiceId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onInvoiceUpdated: () => void;
}

interface InvoiceDetails {
  invoice: Invoice;
  events: Event[];
  reminders: Reminder[];
}

export function InvoiceDrawer({ invoiceId, isOpen, onClose, onInvoiceUpdated }: InvoiceDrawerProps) {
  const [details, setDetails] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [voidingConfirm, setVoidingConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchDetails();
    }
  }, [isOpen, invoiceId]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const fetchDetails = async () => {
    if (!invoiceId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error('Failed to fetch invoice details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!invoiceId) return;

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/void`, {
        method: 'POST',
      });

      if (response.ok) {
        setVoidingConfirm(false);
        await fetchDetails();
        onInvoiceUpdated();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to void invoice');
      }
    } catch (error) {
      console.error('Failed to void invoice:', error);
      alert('Failed to void invoice');
    }
  };

  const copyPayLink = () => {
    if (!details) return;
    const link = `${window.location.origin}/pay/${details.invoice.publicToken}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Pay link copied to clipboard');
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>Invoice Details</h2>
          <button onClick={onClose} className="drawer-close-button">
            ×
          </button>
        </div>

        {loading && <div className="drawer-loading">Loading...</div>}

        {!loading && details && (
          <div className="drawer-content">
            {/* Invoice Info */}
            <section className="drawer-section">
              <h3>{details.invoice.invoiceNumber}</h3>
              <div className="invoice-meta">
                <div className="meta-row">
                  <span className="meta-label">Client:</span>
                  <span>{details.invoice.clientName}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Amount:</span>
                  <span className="meta-value">{formatCurrency(details.invoice.amountCents)}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Issued:</span>
                  <span>{formatDate(details.invoice.issueDate)}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Due:</span>
                  <span>{formatDate(details.invoice.dueDate)}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Status:</span>
                  <span className={`status-badge status-${getInvoiceDisplayStatus(details.invoice, getTodayString())}`}>
                    {getInvoiceDisplayStatus(details.invoice, getTodayString()).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div className="line-items-list">
                <h4>Line Items</h4>
                {details.invoice.lineItems.map((item, idx) => (
                  <div key={idx} className="line-item-display">
                    <span>{item.description}</span>
                    <span>{formatCurrency(item.amountCents)}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="drawer-actions">
                <button onClick={copyPayLink} className="action-button">
                  Copy pay link
                </button>
                
                {details.invoice.status === 'sent' && !voidingConfirm && (
                  <button onClick={() => setVoidingConfirm(true)} className="action-button action-button-danger">
                    Void invoice
                  </button>
                )}

                {voidingConfirm && (
                  <div className="void-confirm">
                    <p>Void this invoice? This cannot be undone.</p>
                    <button onClick={handleVoid} className="action-button action-button-danger">
                      Confirm Void
                    </button>
                    <button onClick={() => setVoidingConfirm(false)} className="action-button">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Timeline */}
            <section className="drawer-section">
              <h4>Timeline</h4>
              {details.events.length === 0 && <p className="empty-message">No events yet.</p>}
              <div className="timeline">
                {details.events.map((event) => (
                  <div key={event.id} className="timeline-item">
                    <div className="timeline-date">{formatDate(event.createdAt.split('T')[0])}</div>
                    <div className="timeline-content">
                      <div className="timeline-type">{event.type.replace(/_/g, ' ')}</div>
                      <div className="timeline-detail">{event.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Reminders */}
            <ReminderSection
              invoice={details.invoice}
              reminders={details.reminders}
              onReminderUpdated={fetchDetails}
            />
          </div>
        )}
      </div>
    </>
  );
}

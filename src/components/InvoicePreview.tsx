'use client';

import { useState } from 'react';
import type { InvoiceDraft } from '@/lib/ai/validations';

interface InvoicePreviewProps {
  initialDraft: InvoiceDraft | null;
  mode: 'ai' | 'manual';
  onConfirm: (draft: InvoiceDraft) => void;
  onDiscard: () => void;
}

export function InvoicePreview({ initialDraft, mode, onConfirm, onDiscard }: InvoicePreviewProps) {
  const [clientName, setClientName] = useState(initialDraft?.client_name || '');
  const [clientEmail, setClientEmail] = useState(initialDraft?.client_email || '');
  const [dueInDays, setDueInDays] = useState(initialDraft?.due_in_days || 14);
  const [lineItems, setLineItems] = useState<Array<{ description: string; amount_dollars: number }>>(
    initialDraft?.line_items || [{ description: '', amount_dollars: 0 }]
  );

  const addLineItem = () => {
    if (lineItems.length < 10) {
      setLineItems([...lineItems, { description: '', amount_dollars: 0 }]);
    }
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: 'description' | 'amount_dollars', value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotal = (): number => {
    return lineItems.reduce((sum, item) => sum + (Number(item.amount_dollars) || 0), 0);
  };

  const handleConfirm = () => {
    // Build draft for validation
    const draft: InvoiceDraft = {
      client_name: clientName.trim(),
      client_email: clientEmail.trim() || undefined,
      line_items: lineItems.map((item) => ({
        description: item.description.trim(),
        amount_dollars: Number(item.amount_dollars) || 0,
      })),
      due_in_days: Number(dueInDays) || 14,
    };

    onConfirm(draft);
  };

  const isValid =
    clientName.trim().length > 0 &&
    lineItems.length > 0 &&
    lineItems.every((item) => item.description.trim().length > 0 && item.amount_dollars > 0) &&
    dueInDays >= 1 &&
    dueInDays <= 120;

  return (
    <div className="invoice-preview">
      <div className="preview-header">
        <h3>Invoice Preview</h3>
        {mode === 'ai' && <p className="preview-label">Drafted by AI, review before saving</p>}
      </div>

      <div className="preview-form">
        <div className="form-group">
          <label htmlFor="clientName">Client Name</label>
          <input
            id="clientName"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client name"
            maxLength={80}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="clientEmail">Client Email (optional)</label>
          <input
            id="clientEmail"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="client@example.com"
          />
        </div>

        <div className="form-group">
          <label>Line Items</label>
          <div className="line-items">
            {lineItems.map((item, index) => (
              <div key={index} className="line-item-row">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Description"
                  className="line-item-description"
                />
                <input
                  type="number"
                  value={item.amount_dollars || ''}
                  onChange={(e) => updateLineItem(index, 'amount_dollars', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  min="0.01"
                  max="10000"
                  step="0.01"
                  className="line-item-amount"
                />
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLineItem(index)} className="remove-item-button">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {lineItems.length < 10 && (
            <button type="button" onClick={addLineItem} className="add-item-button">
              + Add line item
            </button>
          )}
        </div>

        <div className="form-row">
          <div className="form-group form-group-small">
            <label htmlFor="dueInDays">Due in days</label>
            <input
              id="dueInDays"
              type="number"
              value={dueInDays}
              onChange={(e) => setDueInDays(parseInt(e.target.value) || 14)}
              min="1"
              max="120"
            />
          </div>

          <div className="form-group form-group-small">
            <label>Total</label>
            <div className="preview-total">${calculateTotal().toFixed(2)}</div>
          </div>
        </div>

        <div className="preview-actions">
          <button type="button" onClick={handleConfirm} disabled={!isValid} className="confirm-button">
            Confirm & Save
          </button>
          <button type="button" onClick={onDiscard} className="discard-button">
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

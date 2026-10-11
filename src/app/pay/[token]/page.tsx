'use client';

import { useEffect, useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { formatCurrency, formatDate } from '@/lib/utils';
import './pay.css';

interface InvoiceData {
  invoiceNumber: string;
  clientName: string;
  description: string;
  lineItems: Array<{ description: string; amountCents: number }>;
  amountCents: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
}

type PageState = 
  | { type: 'loading' }
  | { type: 'invoice'; data: InvoiceData }
  | { type: 'success' }
  | { type: 'cancelled' }
  | { type: 'error'; message: string }
  | { type: 'already-paid' }
  | { type: 'void' }
  | { type: 'not-found' };

export default function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const [state, setState] = useState<PageState>({ type: 'loading' });
  const [token, setToken] = useState<string>('');

  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'PayNudge Demo Studio';
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/pay/${token}`)
      .then(async (res) => {
        if (res.status === 404) {
          setState({ type: 'not-found' });
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to load invoice');
        }
        const data = await res.json();
        
        if (data.status === 'paid') {
          setState({ type: 'already-paid' });
        } else if (data.status === 'void') {
          setState({ type: 'void' });
        } else {
          setState({ type: 'invoice', data });
        }
      })
      .catch((error) => {
        console.error('Error loading invoice:', error);
        setState({ type: 'error', message: 'Failed to load invoice' });
      });
  }, [token]);

  const createOrder = async () => {
    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const data = await res.json();
      return data.orderId;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const onApprove = async (data: any) => {
    try {
      const res = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, orderId: data.orderID }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to capture payment');
      }

      setState({ type: 'success' });
    } catch (error) {
      console.error('Error capturing payment:', error);
      setState({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Payment capture failed'
      });
    }
  };

  const onCancel = () => {
    setState({ type: 'cancelled' });
  };

  const onError = (err: any) => {
    console.error('PayPal error:', err);
    setState({ type: 'error', message: 'Payment processing error' });
  };

  if (state.type === 'loading') {
    return (
      <div className="pay-page">
        <div className="pay-container">
          <div className="pay-loading">Loading invoice...</div>
        </div>
      </div>
    );
  }

  if (state.type === 'not-found') {
    return (
      <div className="pay-page">
        <div className="pay-container">
          <div className="pay-state-message">
            <h2>Invoice Not Found</h2>
            <p>The invoice you're looking for doesn't exist or the link is invalid.</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.type === 'void') {
    return (
      <div className="pay-page">
        <div className="pay-container">
          <div className="pay-state-message">
            <h2>Invoice Void</h2>
            <p>This invoice has been cancelled and is no longer payable.</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.type === 'already-paid') {
    return (
      <div className="pay-page">
        <div className="pay-container">
          <div className="pay-state-message pay-success">
            <h2>Already Paid</h2>
            <p>This invoice has already been paid. Thank you!</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.type === 'success') {
    return (
      <div className="pay-page">
        <div className="pay-container">
          <div className="pay-state-message pay-success">
            <h2>Paid, thank you</h2>
            <p>Your payment has been received and processed successfully.</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.type === 'cancelled') {
    return (
      <div className="pay-page">
        <div className="pay-container">
          <div className="pay-state-message">
            <h2>Payment Cancelled</h2>
            <p>You cancelled the payment. The invoice remains unpaid.</p>
            <button 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.type === 'error') {
    return (
      <div className="pay-page">
        <div className="pay-container">
          <div className="pay-state-message pay-error">
            <h2>Payment Error</h2>
            <p>{state.message}</p>
            <button 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Invoice state - show the printable invoice with PayPal button
  const invoice = state.data;

  return (
    <PayPalScriptProvider options={{ clientId: paypalClientId, currency: invoice.currency }}>
      <div className="pay-page">
        <div className="pay-container">
          <div className="invoice-header">
            <div className="invoice-from">
              <div className="from-label">From</div>
              <div className="from-name">{businessName}</div>
            </div>
            <div className="invoice-meta">
              <div className="invoice-number">{invoice.invoiceNumber}</div>
              <div className="invoice-dates">
                <div>Issued: {formatDate(invoice.issueDate)}</div>
                <div>Due: {formatDate(invoice.dueDate)}</div>
              </div>
            </div>
          </div>

          <div className="invoice-to">
            <div className="to-label">To</div>
            <div className="to-name">{invoice.clientName}</div>
          </div>

          <div className="invoice-items">
            <div className="items-header">
              <div className="item-description-header">Description</div>
              <div className="item-amount-header">Amount</div>
            </div>
            {invoice.lineItems.map((item, index) => (
              <div key={index} className="invoice-item">
                <div className="item-description">{item.description}</div>
                <div className="item-amount">{formatCurrency(item.amountCents)}</div>
              </div>
            ))}
          </div>

          <div className="invoice-total">
            <div className="total-label">Total</div>
            <div className="total-amount">{formatCurrency(invoice.amountCents)}</div>
          </div>

          <div className="payment-section">
            <PayPalButtons
              createOrder={createOrder}
              onApprove={onApprove}
              onCancel={onCancel}
              onError={onError}
              style={{ layout: 'vertical' }}
            />
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
}

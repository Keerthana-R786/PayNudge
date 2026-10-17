'use client';

import { useState, useRef, useEffect } from 'react';
import type { InvoiceDraft } from '@/lib/ai/validations';

interface ComposeBarProps {
  onDraftReceived: (draft: InvoiceDraft) => void;
  onError: (errorCode: string, message: string) => void;
}

export function ComposeBar({ onDraftReceived, onError }: ComposeBarProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: "/" to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only focus if not already typing in an input/textarea
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedText = text.trim();
    if (!trimmedText || loading) return;

    setLoading(true);

    try {
      const response = await fetch('/api/ai/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmedText }),
      });

      const data = await response.json();

      if (!response.ok) {
        onError(data.error || 'UNKNOWN_ERROR', data.message || 'Failed to parse invoice');
        setText('');
        return;
      }

      onDraftReceived(data);
      setText('');
    } catch (error) {
      console.error('Parse error:', error);
      onError('NETWORK_ERROR', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="compose-bar">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Invoice Northwind Studio $450 for logo redesign, due in 14 days"
        disabled={loading}
        className="compose-input"
        maxLength={500}
      />
      <div className="compose-hint">
        {loading ? 'Parsing...' : 'Press Enter to parse • Press / to focus'}
      </div>
    </form>
  );
}

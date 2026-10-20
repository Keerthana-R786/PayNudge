'use client';

import { useState } from 'react';
import type { Invoice, Reminder } from '@/db/schema';
import { formatDate } from '@/lib/utils';

interface ReminderSectionProps {
  invoice: Invoice;
  reminders: Reminder[];
  onReminderUpdated: () => void;
}

export function ReminderSection({ invoice, reminders, onReminderUpdated }: ReminderSectionProps) {
  const [selectedTone, setSelectedTone] = useState<'friendly' | 'firm' | 'final'>('friendly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftReminder, setDraftReminder] = useState<Reminder | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const canGenerateReminder = invoice.status === 'sent';

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, tone: selectedTone }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'AI_BUSY') {
          setError('The AI is busy right now. Try again in a moment.');
        } else if (data.error === 'AI_VALIDATION_FAILED') {
          setError(data.message || 'The AI wrote incorrect information. Please try again.');
        } else if (data.error === 'INVALID_STATUS') {
          setError(data.message);
        } else {
          setError(data.message || 'Failed to generate reminder');
        }
        return;
      }

      setDraftReminder(data);
      setEditedSubject(data.subject);
      setEditedBody(data.body);
      onReminderUpdated();
    } catch (err) {
      console.error('Generate reminder error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSent = async (reminderId: number) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editedSubject, body: editedBody }),
      });

      if (response.ok) {
        setDraftReminder(null);
        onReminderUpdated();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to mark reminder as sent');
      }
    } catch (err) {
      console.error('Mark sent error:', err);
      alert('Failed to mark reminder as sent');
    }
  };

  const handleCopy = () => {
    const text = `${editedSubject}\n\n${editedBody}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('Reminder copied to clipboard');
    });
  };

  const handleOpenInEmail = () => {
    const subject = encodeURIComponent(editedSubject);
    const body = encodeURIComponent(editedBody);
    const mailto = `mailto:${invoice.clientEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  };

  return (
    <section className="drawer-section reminders-section">
      <h4>Reminders</h4>

      {!canGenerateReminder && (
        <p className="info-message">Reminders are only available for sent invoices.</p>
      )}

      {canGenerateReminder && (
        <>
          <div className="tone-selector">
            <label>Tone:</label>
            <div className="tone-buttons">
              <button
                onClick={() => setSelectedTone('friendly')}
                className={`tone-button ${selectedTone === 'friendly' ? 'active' : ''}`}
              >
                Friendly
              </button>
              <button
                onClick={() => setSelectedTone('firm')}
                className={`tone-button ${selectedTone === 'firm' ? 'active' : ''}`}
              >
                Firm
              </button>
              <button
                onClick={() => setSelectedTone('final')}
                className={`tone-button ${selectedTone === 'final' ? 'active' : ''}`}
              >
                Final Notice
              </button>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading} className="generate-button">
            {loading ? 'Generating...' : 'Generate Reminder'}
          </button>

          {error && <div className="error-message">{error}</div>}

          {draftReminder && (
            <div className="reminder-draft">
              <p className="draft-label">Drafted by AI, review before sending</p>
              
              <div className="draft-field">
                <label>Subject:</label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="draft-field">
                <label>Body:</label>
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={8}
                  maxLength={2000}
                />
              </div>

              <div className="draft-actions">
                <button onClick={() => handleMarkSent(draftReminder.id)} className="action-button">
                  Mark as sent
                </button>
                <button onClick={handleCopy} className="action-button">
                  Copy
                </button>
                {invoice.clientEmail && (
                  <button onClick={handleOpenInEmail} className="action-button">
                    Open in email app
                  </button>
                )}
                <button onClick={() => setDraftReminder(null)} className="action-button">
                  Discard
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Sent Reminders History */}
      {reminders.length > 0 && (
        <div className="reminders-history">
          <h5>Sent Reminders</h5>
          {reminders.map((reminder) => (
            <div key={reminder.id} className="reminder-item">
              <div className="reminder-header">
                <span className="reminder-tone">{reminder.tone}</span>
                <span className="reminder-date">{formatDate(reminder.createdAt.split('T')[0])}</span>
                <span className={`reminder-status status-${reminder.status}`}>{reminder.status}</span>
              </div>
              <div className="reminder-subject">{reminder.subject}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

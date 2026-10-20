'use client';

import { useState } from 'react';

export function InsightsBrief() {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setBrief(null);

    try {
      const response = await fetch('/api/insights');
      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'AI_BUSY') {
          setError('The AI is busy right now. Try again in a moment.');
        } else if (data.error === 'AI_VALIDATION_FAILED') {
          setError(data.message || 'The AI wrote incorrect information. Please try again.');
        } else {
          setError(data.message || 'Failed to generate insights');
        }
        return;
      }

      setBrief(data.brief);
    } catch (err) {
      console.error('Generate insights error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="insights-brief">
      <button onClick={handleGenerate} disabled={loading} className="brief-button">
        {loading ? 'Generating...' : 'Brief'}
      </button>

      {error && <div className="brief-error">{error}</div>}

      {brief && (
        <div className="brief-content">
          <p className="brief-label">Drafted by AI, based on your ledger</p>
          <p className="brief-text">{brief}</p>
        </div>
      )}
    </div>
  );
}

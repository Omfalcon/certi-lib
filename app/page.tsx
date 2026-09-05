'use client';

import { useState, useRef } from 'react';
import { generateAndDownloadCertificate } from '@/lib/generateCertificate';
import type { SavedNameRegion } from '@/lib/templateTypes';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function HomePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sapid, setSapid] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [templateUrl, setTemplateUrl] = useState('');
  const [nameRegion, setNameRegion] = useState<SavedNameRegion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    // Client-side validation
    if (!name.trim() || !email.trim() || !sapid.trim()) {
      setStatus('error');
      setMessage('Please fill in all fields.');
      return;
    }

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), sapid: sapid.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Verification failed. Please check your details.');
        return;
      }

      setVerifiedName(data.name);
      if (data.templateUrl) {
        setTemplateUrl(data.templateUrl);
      }
      setNameRegion(data.nameRegion ?? null);
      setStatus('success');
    } catch {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Use active template from Supabase
      let activeUrl = templateUrl;
      let activeRegion: SavedNameRegion | null = nameRegion;
      if (!activeUrl) {
        const res = await fetch('/api/template');
        const d = await res.json();
        activeUrl = d.templateUrl;
        activeRegion = d.nameRegion ?? null;
      }

      if (!activeUrl) {
        throw new Error('Certificate template not found in Supabase. Please contact the administrator.');
      }

      await generateAndDownloadCertificate({
        name: verifiedName,
        templateUrl: activeUrl,
        nameRegion: activeRegion,
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to generate certificate.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setMessage('');
    setVerifiedName('');
    setTemplateUrl('');
    setNameRegion(null);
    setName('');
    setEmail('');
    setSapid('');
  };

  return (
    <div className="page-wrapper">
      <div className="page-content">
        {/* Header */}
        <header className="site-header">
          <div className="logo-row">
            <span className="event-badge">
              <span className="dot" />
              Dr. S. J. Chopra Centre for Learning · UPES
            </span>
          </div>
          <h1 className="site-title">
            Workshop on <span>Advanced LaTeX</span>
          </h1>
          <p className="site-subtitle">For Research Writing and Publication</p>
          <div>
            <span className="event-tagline">
              “Write Better. Publish Smarter. Impact Greater.”
            </span>
          </div>

          <div className="event-chips">
            <span className="event-chip">📅 9 September 2026, Wednesday</span>
            <span className="event-chip">⏰ 2:00 PM – 5:30 PM</span>
            <span className="event-chip">📍 Trust Boardroom, Bidholi Campus</span>
          </div>
        </header>

        {/* Main Card */}
        <div className="card">
          {status !== 'success' ? (
            <>
              <h2 className="card-title">Download Your Certificate</h2>
              <p className="card-subtitle">
                Enter your details exactly as registered to retrieve your certificate.
              </p>

              <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="full-name">
                    Full Name
                  </label>
                  <input
                    id="full-name"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={status === 'loading'}
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email-address">
                    Email Address
                  </label>
                  <input
                    id="email-address"
                    className="form-input"
                    type="email"
                    placeholder="e.g. priya@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'loading'}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="sap-id">
                    SAP ID
                  </label>
                  <input
                    id="sap-id"
                    className="form-input"
                    type="text"
                    placeholder="e.g. 500123456"
                    value={sapid}
                    onChange={(e) => setSapid(e.target.value)}
                    disabled={status === 'loading'}
                    inputMode="numeric"
                    required
                  />
                </div>

                {message && (
                  <div
                    className={`alert ${status === 'error' ? 'alert-error' : 'alert-info'}`}
                    role="alert"
                  >
                    <span>⚠</span>
                    {message}
                  </div>
                )}

                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={status === 'loading'}
                    id="verify-btn"
                  >
                    {status === 'loading' ? (
                      <>
                        <span className="spinner" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verify &amp; Get Certificate
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="download-success">
              <div className="check-icon">✓</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-white-muted)', marginBottom: '0.25rem' }}>
                Verified! Your certificate is ready for
              </p>
              <div className="success-name">{verifiedName}</div>
              <p className="success-text" style={{ marginBottom: '1.5rem' }}>
                Click below to download your personalized certificate.
              </p>

              <button
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={isGenerating}
                id="download-btn"
                style={{ marginBottom: '0.75rem' }}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Download Certificate (PDF)
                  </>
                )}
              </button>

              {message && (
                <div className="alert alert-error" role="alert">
                  <span>⚠</span>
                  {message}
                </div>
              )}

              <button className="btn btn-secondary" onClick={handleReset} id="reset-btn" style={{ marginTop: '0.5rem' }}>
                ← Try Another Name
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="site-footer">
          <p>Dr. S. J. Chopra Centre for Learning · UPES</p>
          <p style={{ marginTop: '0.25rem' }}>
            Need assistance?{' '}
            <a href="mailto:librarian@ddn.upes.ac.in">librarian@ddn.upes.ac.in</a>
          </p>
          <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', opacity: 0.6 }}>
            <a href="/admin">Admin Console</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

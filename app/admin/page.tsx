'use client';

import { useState } from 'react';

/* -----------------------------------------------
   Types
----------------------------------------------- */
type AuthState = 'idle' | 'loading' | 'authenticated' | 'error';
type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface DashboardData {
  participantCount: number;
  lastUpload: string | null;
  templateUrl: string | null;
}

/* -----------------------------------------------
   Admin Page
----------------------------------------------- */
export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [authError, setAuthError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Excel upload state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelState, setExcelState] = useState<UploadState>('idle');
  const [excelMessage, setExcelMessage] = useState('');

  // Template upload state
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateState, setTemplateState] = useState<UploadState>('idle');
  const [templateMessage, setTemplateMessage] = useState('');

  // Clear state
  const [clearState, setClearState] = useState<UploadState>('idle');
  const [clearMessage, setClearMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  /* -----------------------------------------------
     Auth
  ----------------------------------------------- */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState('loading');
    setAuthError('');

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthState('error');
        setAuthError(data.error ?? 'Invalid credentials.');
        return;
      }

      setDashboard({
        participantCount: data.participantCount,
        lastUpload: data.lastUpload,
        templateUrl: data.templateUrl,
      });
      setAuthState('authenticated');
    } catch {
      setAuthState('error');
      setAuthError('Network error. Please try again.');
    }
  };

  /* -----------------------------------------------
     Excel Upload
  ----------------------------------------------- */
  const handleExcelUpload = async () => {
    if (!excelFile) return;
    setExcelState('uploading');
    setExcelMessage('');

    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('password', password);

    try {
      const res = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setExcelState('error');
        setExcelMessage(data.error ?? 'Upload failed.');
        return;
      }

      setExcelState('success');
      setExcelMessage(data.message);
      setDashboard((prev) =>
        prev ? { ...prev, participantCount: data.count, lastUpload: new Date().toISOString() } : prev
      );
      setExcelFile(null);
    } catch {
      setExcelState('error');
      setExcelMessage('Network error. Please try again.');
    }
  };

  /* -----------------------------------------------
     Template Upload
  ----------------------------------------------- */
  const handleTemplateUpload = async () => {
    if (!templateFile) return;
    setTemplateState('uploading');
    setTemplateMessage('');

    const formData = new FormData();
    formData.append('file', templateFile);
    formData.append('password', password);

    try {
      const res = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setTemplateState('error');
        setTemplateMessage(data.error ?? 'Upload failed.');
        return;
      }

      setTemplateState('success');
      setTemplateMessage(data.message);
      setDashboard((prev) =>
        prev ? { ...prev, templateUrl: data.url } : prev
      );
      setTemplateFile(null);
    } catch {
      setTemplateState('error');
      setTemplateMessage('Network error. Please try again.');
    }
  };

  /* -----------------------------------------------
     Clear All Data
  ----------------------------------------------- */
  const handleClearData = async () => {
    setClearState('uploading');
    setClearMessage('');
    setShowClearConfirm(false);

    try {
      const res = await fetch('/api/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setClearState('error');
        setClearMessage(data.error ?? 'Failed to clear data.');
        return;
      }

      setClearState('success');
      setClearMessage('All data cleared successfully.');
      setDashboard((prev) =>
        prev ? { ...prev, participantCount: 0, lastUpload: null, templateUrl: null } : prev
      );
    } catch {
      setClearState('error');
      setClearMessage('Network error. Please try again.');
    }
  };

  /* -----------------------------------------------
     Render: Password Gate
  ----------------------------------------------- */
  if (authState !== 'authenticated') {
    return (
      <div className="page-wrapper">
        <div className="page-content">
          <header className="site-header">
            <div className="logo-row">
              <span className="event-badge">
                <span className="dot" />
                Admin Console
              </span>
            </div>
            <h1 className="site-title">
              Certificate <span>Admin</span>
            </h1>
            <p className="site-subtitle">Workshop on Advanced LaTeX — Dr. S. J. Chopra Centre for Learning, UPES</p>
          </header>

          <div className="card">
            <h2 className="card-title">🔐 Secure Login</h2>
            <p className="card-subtitle">Enter your admin password to access the panel.</p>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-password">
                  Admin Password
                </label>
                <input
                  id="admin-password"
                  className="form-input"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authState === 'loading'}
                  required
                  autoComplete="current-password"
                />
              </div>

              {authState === 'error' && (
                <div className="alert alert-error" role="alert">
                  <span>⚠</span>
                  {authError}
                </div>
              )}

              <div style={{ marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={authState === 'loading'}
                  id="admin-login-btn"
                >
                  {authState === 'loading' ? (
                    <>
                      <span className="spinner" />
                      Authenticating...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </div>
            </form>
          </div>

          <footer className="site-footer">
            <p>
              ← <a href="/">Back to student portal</a>
            </p>
          </footer>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------
     Render: Authenticated Dashboard
  ----------------------------------------------- */
  return (
    <div className="page-wrapper" style={{ alignItems: 'stretch' }}>
      <div className="admin-container">
        {/* Wide Admin Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="event-badge">
                <span className="dot" />
                Admin Console
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-white-muted)' }}>
                Dr. S. J. Chopra Centre for Learning · UPES
              </span>
            </div>
            <h1 className="site-title" style={{ textAlign: 'left', marginTop: '0.35rem' }}>
              Certificate <span>Admin Control Center</span>
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-white-muted)' }}>
              Workshop on Advanced LaTeX for Research Writing and Publication
            </p>
          </div>

          <div className="admin-topbar-actions">
            <a href="/" target="_blank" rel="noopener noreferrer" className="btn-nav btn-nav-outline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              Student Portal
            </a>
            <button
              className="btn-nav btn-nav-danger"
              onClick={() => {
                setAuthState('idle');
                setPassword('');
                setDashboard(null);
              }}
              title="Sign out of Admin Console"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Lock Console
            </button>
          </div>
        </header>

        {/* 4-Card Top Metric KPI Bar */}
        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Total Participants</span>
              <span className="stat-card-icon">👥</span>
            </div>
            <div className="stat-card-value">{dashboard?.participantCount ?? 0}</div>
            <div className="stat-card-sub">
              <span style={{ color: 'var(--color-success)' }}>●</span> Synced in Supabase
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Certificate Template</span>
              <span className="stat-card-icon">🖼️</span>
            </div>
            <div
              className="stat-card-value"
              style={{
                fontSize: '1.4rem',
                color: dashboard?.templateUrl ? 'var(--color-success)' : 'var(--color-gold)',
              }}
            >
              {dashboard?.templateUrl ? '✓ Ready' : 'Default Asset'}
            </div>
            <div className="stat-card-sub">
              {dashboard?.templateUrl ? 'Custom uploaded template' : 'Using public template'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Last Database Sync</span>
              <span className="stat-card-icon">⏱️</span>
            </div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>
              {dashboard?.lastUpload
                ? new Date(dashboard.lastUpload).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Initial State'}
            </div>
            <div className="stat-card-sub">
              {dashboard?.lastUpload
                ? new Date(dashboard.lastUpload).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No uploads logged yet'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">System Health</span>
              <span className="stat-card-icon">🛡️</span>
            </div>
            <div
              className="stat-card-value"
              style={{ fontSize: '1.35rem', color: 'var(--color-gold-light)' }}
            >
              Serverless 100%
            </div>
            <div className="stat-card-sub">
              <span style={{ color: 'var(--color-success)' }}>✓</span> RLS &amp; Rate Limiter Active
            </div>
          </div>
        </div>

        {/* 2-Column Dashboard Main Layout */}
        <div className="admin-main-grid">
          {/* Left Column: Participant Management & Excel Ingestion */}
          <div className="admin-col">
            <div className="card">
              <div className="section-title">📊 Participant Data Management</div>
              <h2 className="card-title">Bulk Excel Ingestion</h2>
              <p className="card-subtitle">
                Upload your participant Excel sheet (.xlsx, .xls) to sync student verification records. Matching is
                case-insensitive by <strong>Full Name</strong>, <strong>Email</strong>, and <strong>SAP ID</strong>.
              </p>

              {/* Sample Download Shortcut */}
              <div className="sample-actions-row">
                <span style={{ fontSize: '0.78rem', color: 'var(--color-white-muted)' }}>
                  Need an Excel template?
                </span>
                <a
                  href="/sample-data/participant_template.xlsx"
                  download="participant_template.xlsx"
                  className="sample-btn"
                >
                  📥 Download Excel Template (.xlsx)
                </a>
              </div>

              {/* Drag and Drop Zone */}
              <div className="file-upload-area">
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
                />
                <div className="file-upload-icon">📄</div>
                <p className="file-upload-text">
                  <strong>Click to choose file</strong> or drag and drop here
                </p>
                <p className="file-upload-text" style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                  Supports Microsoft Excel (.xlsx, .xls)
                </p>
                {excelFile && (
                  <div className="file-name">
                    <span>✓</span>
                    <strong>{excelFile.name}</strong> ({(excelFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {excelMessage && (
                <div
                  className={`alert ${excelState === 'error' ? 'alert-error' : 'alert-success'}`}
                  role="alert"
                >
                  <span>{excelState === 'error' ? '⚠' : '✓'}</span>
                  {excelMessage}
                </div>
              )}

              <div style={{ marginTop: '1.25rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleExcelUpload}
                  disabled={!excelFile || excelState === 'uploading'}
                  id="upload-excel-btn"
                >
                  {excelState === 'uploading' ? (
                    <>
                      <span className="spinner" />
                      Parsing &amp; Syncing Participants...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload &amp; Sync Participants
                    </>
                  )}
                </button>
              </div>

              {/* Format Reference Box */}
              <div className="alert alert-info" style={{ marginTop: '1.25rem' }}>
                <span>ℹ</span>
                <div style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
                  <strong>Required Header Columns:</strong>
                  <div style={{ marginTop: '0.35rem', fontFamily: 'monospace', color: 'var(--color-gold-light)' }}>
                    name | email | sapid
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-white-muted)', marginTop: '0.2rem' }}>
                    Note: Existing participants will be replaced atomically with the uploaded sheet.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Template Management & Danger Zone */}
          <div className="admin-col">
            {/* Template Card */}
            <div className="card">
              <div className="section-title">🖼 Certificate Template</div>
              <h2 className="card-title">Certificate Design Template</h2>
              <p className="card-subtitle">
                Upload the high-resolution certificate background image (PNG or JPG).
              </p>

              {dashboard?.templateUrl ? (
                <div
                  style={{
                    marginBottom: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: '1px solid var(--color-white-border)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dashboard.templateUrl}
                    alt="Active Certificate Template"
                    style={{ width: '100%', display: 'block' }}
                  />
                  <div
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(0,0,0,0.4)',
                      fontSize: '0.75rem',
                      color: 'var(--color-success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>●</span> Active Template in Supabase Storage
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-white-border)',
                    marginBottom: '1rem',
                    fontSize: '0.8rem',
                    color: 'var(--color-white-muted)',
                  }}
                >
                  ℹ Currently utilizing default asset (`/certificate-template.png`).
                </div>
              )}

              <div className="file-upload-area">
                <input
                  id="template-file-input"
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
                />
                <div className="file-upload-icon">🖼</div>
                <p className="file-upload-text">
                  <strong>Click to browse</strong> or drag &amp; drop
                </p>
                <p className="file-upload-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  PNG or JPG (Landscape recommended, max 5MB)
                </p>
                {templateFile && (
                  <div className="file-name">
                    <span>✓</span>
                    <strong>{templateFile.name}</strong> ({(templateFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {templateMessage && (
                <div
                  className={`alert ${templateState === 'error' ? 'alert-error' : 'alert-success'}`}
                  role="alert"
                >
                  <span>{templateState === 'error' ? '⚠' : '✓'}</span>
                  {templateMessage}
                </div>
              )}

              <div style={{ marginTop: '1.25rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleTemplateUpload}
                  disabled={!templateFile || templateState === 'uploading'}
                  id="upload-template-btn"
                >
                  {templateState === 'uploading' ? (
                    <>
                      <span className="spinner" />
                      Uploading Template...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload Template to Storage
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ borderColor: 'rgba(255,82,82,0.25)' }}>
              <div
                className="section-title"
                style={{
                  color: 'var(--color-error)',
                  background: 'rgba(255,82,82,0.1)',
                  borderColor: 'rgba(255,82,82,0.25)',
                }}
              >
                ⚠ System Reset
              </div>
              <h2 className="card-title">Danger Zone</h2>
              <p className="card-subtitle" style={{ marginBottom: '1rem' }}>
                Permanently purge all participant records and stored templates.
              </p>

              {clearMessage && (
                <div
                  className={`alert ${clearState === 'error' ? 'alert-error' : 'alert-success'}`}
                  role="alert"
                >
                  <span>{clearState === 'error' ? '⚠' : '✓'}</span>
                  {clearMessage}
                </div>
              )}

              {!showClearConfirm ? (
                <button
                  className="btn btn-danger"
                  onClick={() => setShowClearConfirm(true)}
                  id="clear-data-btn"
                >
                  🗑 Clear All Records
                </button>
              ) : (
                <div
                  style={{
                    background: 'rgba(255, 82, 82, 0.08)',
                    border: '1px solid rgba(255, 82, 82, 0.25)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <p
                    style={{
                      color: 'var(--color-error)',
                      fontSize: '0.85rem',
                      marginBottom: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ Are you absolutely sure? This action is irreversible.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-danger"
                      onClick={handleClearData}
                      disabled={clearState === 'uploading'}
                      id="confirm-clear-btn"
                      style={{ flex: 1 }}
                    >
                      {clearState === 'uploading' ? (
                        <>
                          <span className="spinner" />
                          Purging...
                        </>
                      ) : (
                        'Yes, Wipe All Data'
                      )}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowClearConfirm(false)}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Footer */}
        <footer className="site-footer">
          <p>
            Dr. S. J. Chopra Centre for Learning · UPES · Workshop on Advanced LaTeX
          </p>
          <p style={{ marginTop: '0.35rem' }}>
            <a href="/">← Return to Public Student Verification Portal</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

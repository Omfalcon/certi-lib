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
    <div className="page-wrapper">
      <div className="page-content" style={{ maxWidth: '600px' }}>
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
        </header>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-chip">
            <div className="stat-value">{dashboard?.participantCount ?? 0}</div>
            <div className="stat-label">Participants</div>
          </div>
          <div className="stat-chip">
            <div className="stat-value" style={{ fontSize: '1rem', color: dashboard?.templateUrl ? 'var(--color-success)' : 'var(--color-error)' }}>
              {dashboard?.templateUrl ? '✓ Ready' : '✗ None'}
            </div>
            <div className="stat-label">Template</div>
          </div>
          <div className="stat-chip">
            <div className="stat-value" style={{ fontSize: '0.85rem', color: 'var(--color-white-muted)' }}>
              {dashboard?.lastUpload
                ? new Date(dashboard.lastUpload).toLocaleDateString()
                : '—'}
            </div>
            <div className="stat-label">Last Upload</div>
          </div>
        </div>

        {/* Excel Upload Section */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p className="section-title">📊 Participants Excel</p>
          <h2 className="card-title">Upload Participant List</h2>
          <p className="card-subtitle">
            Upload an Excel (.xlsx) file with columns: <strong>name</strong>, <strong>email</strong>, <strong>sapid</strong>.
            This will <strong>replace</strong> all existing participants.
          </p>

          <div className="file-upload-area">
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
            />
            <div className="file-upload-icon">📄</div>
            <p className="file-upload-text">
              <strong>Click to browse</strong> or drag & drop
            </p>
            <p className="file-upload-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Excel files only (.xlsx, .xls)
            </p>
            {excelFile && (
              <div className="file-name">
                <span>✓</span>
                {excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {excelMessage && (
            <div className={`alert ${excelState === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
              <span>{excelState === 'error' ? '⚠' : '✓'}</span>
              {excelMessage}
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleExcelUpload}
              disabled={!excelFile || excelState === 'uploading'}
              id="upload-excel-btn"
            >
              {excelState === 'uploading' ? (
                <>
                  <span className="spinner" />
                  Uploading...
                </>
              ) : (
                '↑ Upload Participants'
              )}
            </button>
          </div>

          <div className="alert alert-info" style={{ marginTop: '1rem' }}>
            <span>ℹ</span>
            <div>
              <strong>Excel format example:</strong><br />
              <code style={{ fontSize: '0.8rem' }}>name | email | sapid</code><br />
              <code style={{ fontSize: '0.8rem' }}>John Doe | john@upes.ac.in | 500123456</code>
            </div>
          </div>
        </div>

        {/* Template Upload Section */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p className="section-title">🖼 Certificate Template</p>
          <h2 className="card-title">Upload Template</h2>
          <p className="card-subtitle">
            Upload the certificate background image (PNG or JPG). Max 5MB.
          </p>

          {dashboard?.templateUrl && (
            <div style={{ marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-white-border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dashboard.templateUrl}
                alt="Current template"
                style={{ width: '100%', display: 'block' }}
              />
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
              <strong>Click to browse</strong> or drag & drop
            </p>
            <p className="file-upload-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              PNG or JPG, max 5MB
            </p>
            {templateFile && (
              <div className="file-name">
                <span>✓</span>
                {templateFile.name} ({(templateFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {templateMessage && (
            <div className={`alert ${templateState === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
              <span>{templateState === 'error' ? '⚠' : '✓'}</span>
              {templateMessage}
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleTemplateUpload}
              disabled={!templateFile || templateState === 'uploading'}
              id="upload-template-btn"
            >
              {templateState === 'uploading' ? (
                <>
                  <span className="spinner" />
                  Uploading...
                </>
              ) : (
                '↑ Upload Template'
              )}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(255,82,82,0.2)' }}>
          <p className="section-title" style={{ color: 'var(--color-error)' }}>⚠ Danger Zone</p>
          <h2 className="card-title">Clear All Data</h2>
          <p className="card-subtitle">
            This will permanently delete all participants and the uploaded template. This action cannot be undone.
          </p>

          {clearMessage && (
            <div className={`alert ${clearState === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
              <span>{clearState === 'error' ? '⚠' : '✓'}</span>
              {clearMessage}
            </div>
          )}

          {!showClearConfirm ? (
            <button
              className="btn btn-danger"
              onClick={() => setShowClearConfirm(true)}
              id="clear-data-btn"
              style={{ marginTop: '0.75rem' }}
            >
              🗑 Clear All Data
            </button>
          ) : (
            <div style={{ marginTop: '0.75rem' }}>
              <p style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: 500 }}>
                Are you absolutely sure? This is irreversible.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-danger"
                  onClick={handleClearData}
                  disabled={clearState === 'uploading'}
                  id="confirm-clear-btn"
                  style={{ flex: 1 }}
                >
                  {clearState === 'uploading' ? <><span className="spinner" /> Clearing...</> : 'Yes, Clear Everything'}
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

        <footer className="site-footer">
          <p>
            ← <a href="/">Back to student portal</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

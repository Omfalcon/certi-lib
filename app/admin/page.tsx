'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { analyzeTemplateImage, type OCRProgress } from '@/lib/ocr';
import {
  detectNameRegion,
  scoreGapCandidates,
  LOW_CONFIDENCE_THRESHOLD,
} from '@/lib/namePositionDetector';
import type { SavedNameRegion, NameRegion, GapCandidate, OCRLine } from '@/lib/templateTypes';

/* -----------------------------------------------
   Types
----------------------------------------------- */
type AuthState = 'idle' | 'loading' | 'authenticated' | 'error';
type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface DashboardData {
  participantCount: number;
  lastUpload: string | null;
  templateUrl: string | null;
  nameRegion: SavedNameRegion | null;
}

interface ParticipantItem {
  id: number;
  name: string;
  email: string;
  sapid: string;
  created_at?: string;
}

/* -----------------------------------------------
   Admin Page
----------------------------------------------- */
export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [authError, setAuthError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Participant list state
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Direct add participant state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSapid, setNewSapid] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addMessage, setAddMessage] = useState('');
  const [addError, setAddError] = useState('');

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Excel upload state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelState, setExcelState] = useState<UploadState>('idle');
  const [excelMessage, setExcelMessage] = useState('');

  // Template upload state
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateState, setTemplateState] = useState<UploadState>('idle');
  const [templateMessage, setTemplateMessage] = useState('');

  // Name-position detection state
  const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing' | 'detected' | 'manual' | 'error'>('idle');
  const [analysisProgress, setAnalysisProgress] = useState<OCRProgress | null>(null);
  const [detectedRegion, setDetectedRegion] = useState<NameRegion | null>(null);
  const [detectedLines, setDetectedLines] = useState<OCRLine[]>([]);
  const [gapCandidates, setGapCandidates] = useState<GapCandidate[]>([]);
  const [analysisImage, setAnalysisImage] = useState<{ width: number; height: number } | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [manualX, setManualX] = useState('50');
  const [manualY, setManualY] = useState('45.5');
  const [manualFallback, setManualFallback] = useState(false);
  const [isSavingRegion, setIsSavingRegion] = useState(false);

  // Clear state
  const [clearState, setClearState] = useState<UploadState>('idle');
  const [clearMessage, setClearMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  /* -----------------------------------------------
     Fetch Participants
  ----------------------------------------------- */
  const fetchParticipants = useCallback(async (pwd: string) => {
    setLoadingParticipants(true);
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, action: 'list' }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.participants)) {
        setParticipants(data.participants);
        setDashboard((prev) => (prev ? { ...prev, participantCount: data.participants.length } : prev));
      }
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    } finally {
      setLoadingParticipants(false);
    }
  }, []);

  /* -----------------------------------------------
     Authentication & Session Persistence
  ----------------------------------------------- */
  const authenticate = useCallback(
    async (pwd: string) => {
      setAuthState('loading');
      setAuthError('');

      try {
        const res = await fetch('/api/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAuthState('error');
          setAuthError(data.error ?? 'Invalid credentials.');
          sessionStorage.removeItem('admin_token');
          return;
        }

        setPassword(pwd);
        sessionStorage.setItem('admin_token', pwd);
        setDashboard({
          participantCount: data.participantCount,
          lastUpload: data.lastUpload,
          templateUrl: data.templateUrl,
          nameRegion: data.nameRegion ?? null,
        });
        setAnalysisState('idle');
        setAnalysisError('');
        setAnalysisProgress(null);
        setDetectedRegion(null);
        setDetectedLines([]);
        setGapCandidates([]);
        setAnalysisImage(null);
        setAuthState('authenticated');

        // Fetch participant records
        fetchParticipants(pwd);
      } catch {
        setAuthState('error');
        setAuthError('Network error. Please try again.');
      }
    },
    [fetchParticipants]
  );

  // Restore session from sessionStorage on initial mount or refresh
  useEffect(() => {
    const savedToken = sessionStorage.getItem('admin_token');
    if (savedToken) {
      // Session restore must revalidate the stashed token on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      authenticate(savedToken);
    }
  }, [authenticate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    authenticate(password);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setPassword('');
    setDashboard(null);
    setParticipants([]);
    setAnalysisState('idle');
    setAnalysisError('');
    setAnalysisProgress(null);
    setDetectedRegion(null);
    setDetectedLines([]);
    setGapCandidates([]);
    setAnalysisImage(null);
    setAuthState('idle');
  };

  /* -----------------------------------------------
     Direct Add Participant
  ----------------------------------------------- */
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newSapid.trim()) {
      setAddError('All fields are required.');
      return;
    }

    setIsAdding(true);
    setAddError('');
    setAddMessage('');

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          action: 'add',
          name: newName.trim(),
          email: newEmail.trim(),
          sapid: newSapid.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error ?? 'Failed to add participant.');
        return;
      }

      setAddMessage(data.message ?? 'Participant added successfully.');
      setNewName('');
      setNewEmail('');
      setNewSapid('');

      // Refresh list
      fetchParticipants(password);
    } catch {
      setAddError('Network error. Failed to add participant.');
    } finally {
      setIsAdding(false);
    }
  };

  /* -----------------------------------------------
     Direct Delete Participant
  ----------------------------------------------- */
  const handleDeleteParticipant = async (id: number, name: string, sapid?: string, email?: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" (${sapid || 'ID ' + id}) from Supabase?`)) return;

    setDeletingId(id);
    const token = password || (typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') || '' : '');

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: token,
          action: 'delete',
          id,
          sapid,
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error ?? 'Failed to delete participant from Supabase.');
        return;
      }

      // Re-fetch all participants directly from Supabase to guarantee UI sync
      await fetchParticipants(token);
    } catch {
      alert('Network error. Failed to delete participant.');
    } finally {
      setDeletingId(null);
    }
  };

  /* -----------------------------------------------
     Filtered Participants (Search)
  ----------------------------------------------- */
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const q = searchQuery.toLowerCase().trim();
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.sapid.toLowerCase().includes(q)
    );
  }, [participants, searchQuery]);

  /* -----------------------------------------------
     Excel Upload
  ----------------------------------------------- */
  const handleExcelUpload = async () => {
    if (!excelFile) return;
    setExcelState('uploading');
    setExcelMessage('');

    const token = password || (typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') || '' : '');
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('password', token);

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

      // Refresh participant directory from Supabase
      fetchParticipants(token);
    } catch {
      setExcelState('error');
      setExcelMessage('Network error. Please try again.');
    }
  };

  /* -----------------------------------------------
     Name-Position Detection (client-side OCR)
  ----------------------------------------------- */
  const runDetection = async (file: Blob) => {
    const token = password || (typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') || '' : '');
    setAnalysisState('analyzing');
    setAnalysisError('');
    setAnalysisProgress({ status: 'Starting OCR engine...', progress: 0 });
    setDetectedRegion(null);
    setGapCandidates([]);
    setDetectedLines([]);
    setAnalysisImage(null);

    try {
      const result = await analyzeTemplateImage(file, (p) => setAnalysisProgress(p));
      const candidates = scoreGapCandidates(result.lines, result.imageWidth, result.imageHeight);
      const region = detectNameRegion(result.lines, result.imageWidth, result.imageHeight);

      setDetectedLines(result.lines);
      setAnalysisImage({ width: result.imageWidth, height: result.imageHeight });
      setGapCandidates(candidates.slice(0, 5));

      // Save API rejects centerY outside [0.05, 0.95] — treat as not-confident
      const centerYNorm = region ? region.centerY / result.imageHeight : 0;
      if (!region || centerYNorm < 0.05 || centerYNorm > 0.95) {
        setAnalysisState('manual');
        setManualFallback(true);
        setAnalysisError('');
        const saved = dashboard?.nameRegion;
        setManualX(((saved?.centerX ?? 0.5) * 100).toFixed(1));
        setManualY(((saved?.centerY ?? 0.455) * 100).toFixed(1));
        return;
      }

      setDetectedRegion(region);

      const best = candidates[0];
      const gapFrac = best.gapHeight / result.imageHeight;
      const savedRegion: SavedNameRegion = {
        version: 1,
        method: 'auto',
        centerX: region.centerX / result.imageWidth,
        centerY: centerYNorm,
        gapHeight: gapFrac > 0 && gapFrac <= 1 ? gapFrac : null,
        confidence: region.confidence,
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        savedAt: new Date().toISOString(),
      };

      setIsSavingRegion(true);
      try {
        const res = await fetch('/api/save-name-region', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: token, region: savedRegion }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAnalysisState('detected');
          setAnalysisError(
            `Detection succeeded (${Math.round(region.confidence * 100)}% confidence), but saving failed: ${
              data.error ?? 'unknown error'
            }. Click "Re-analyze" to retry.`
          );
          return;
        }
        setAnalysisState('detected');
        setAnalysisError('');
        setDashboard((prev) => (prev ? { ...prev, nameRegion: data.region ?? savedRegion } : prev));
      } catch {
        setAnalysisState('detected');
        setAnalysisError('Detection succeeded, but saving the region failed (network error). Click "Re-analyze" to retry.');
      } finally {
        setIsSavingRegion(false);
      }
    } catch (err) {
      setAnalysisState('error');
      setAnalysisError(err instanceof Error ? err.message : 'OCR analysis failed. Please try again.');
    }
  };

  const handleTemplateUpload = async () => {
    if (!templateFile) return;
    const file = templateFile;
    setTemplateState('uploading');
    setTemplateMessage('');
    setAnalysisState('idle');
    setAnalysisError('');
    setAnalysisProgress(null);
    setDetectedRegion(null);
    setDetectedLines([]);
    setGapCandidates([]);
    setAnalysisImage(null);

    const token = password || (typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') || '' : '');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', token);

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
      // Instantly update dashboard template URL; the saved region was deleted server-side
      setDashboard((prev) => (prev ? { ...prev, templateUrl: data.url, nameRegion: null } : prev));
      setTemplateFile(null);
      // Auto-analyze the newly uploaded template (handles its own errors; never throws)
      await runDetection(file);
    } catch {
      setTemplateState('error');
      setTemplateMessage('Network error. Please try again.');
    }
  };

  const handleReanalyze = async () => {
    if (!dashboard?.templateUrl || analysisState === 'analyzing') return;
    try {
      const res = await fetch(dashboard.templateUrl);
      if (!res.ok) throw new Error(`Could not download the template image (HTTP ${res.status}).`);
      const blob = await res.blob();
      await runDetection(blob);
    } catch (err) {
      setAnalysisState('error');
      setAnalysisError(err instanceof Error ? err.message : 'Could not download the template for analysis.');
    }
  };

  const startManualPlacement = () => {
    setAnalysisError('');
    setManualFallback(false);
    // Prefer the just-detected region (e.g. when auto-save failed), then the saved one
    const base =
      (detectedRegion && analysisImage
        ? {
            centerX: detectedRegion.centerX / analysisImage.width,
            centerY: detectedRegion.centerY / analysisImage.height,
          }
        : null) ?? dashboard?.nameRegion;
    setManualX(((base?.centerX ?? 0.5) * 100).toFixed(1));
    setManualY(((base?.centerY ?? 0.455) * 100).toFixed(1));
    setAnalysisState('manual');
  };

  const handleManualRegionSave = async () => {
    const x = parseFloat(manualX);
    const y = parseFloat(manualY);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
      setAnalysisError('Enter X and Y percentages between 0 and 100.');
      return;
    }
    setAnalysisError('');
    setIsSavingRegion(true);
    const token = password || (typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') || '' : '');

    try {
      // Image dims are diagnostic-only; fall back to decoding the template URL, then 1×1
      let imageWidth = analysisImage?.width ?? dashboard?.nameRegion?.imageWidth ?? 0;
      let imageHeight = analysisImage?.height ?? dashboard?.nameRegion?.imageHeight ?? 0;
      if ((!imageWidth || !imageHeight) && dashboard?.templateUrl) {
        try {
          const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => reject(new Error('decode failed'));
            img.src = dashboard.templateUrl as string;
          });
          imageWidth = dims.w;
          imageHeight = dims.h;
        } catch {
          // fall through with 0 → 1×1 fallback below
        }
      }
      const region: SavedNameRegion = {
        version: 1,
        method: 'manual',
        centerX: x / 100,
        centerY: y / 100,
        gapHeight: null,
        confidence: null,
        imageWidth: imageWidth || 1,
        imageHeight: imageHeight || 1,
        savedAt: new Date().toISOString(),
      };
      const res = await fetch('/api/save-name-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: token, region }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data.error ?? 'Failed to save name position.');
        return;
      }
      setAnalysisState('idle');
      setAnalysisError('');
      setManualFallback(false);
      setDashboard((prev) => (prev ? { ...prev, nameRegion: data.region ?? region } : prev));
    } catch {
      setAnalysisError('Network error. Failed to save name position.');
    } finally {
      setIsSavingRegion(false);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (analysisState !== 'manual') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setManualX(Math.max(0, Math.min(100, x)).toFixed(1));
    setManualY(Math.max(0, Math.min(100, y)).toFixed(1));
  };

  /* -----------------------------------------------
     Clear All Data
  ----------------------------------------------- */
  const handleClearData = async () => {
    setClearState('uploading');
    setClearMessage('');
    setShowClearConfirm(false);

    const token = password || (typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') || '' : '');
    try {
      const res = await fetch('/api/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setClearState('error');
        setClearMessage(data.error ?? 'Failed to clear data.');
        return;
      }

      setClearState('success');
      setClearMessage('All data cleared successfully.');
      setParticipants([]);
      setDashboard((prev) =>
        prev ? { ...prev, participantCount: 0, lastUpload: null, templateUrl: null, nameRegion: null } : prev
      );
      setAnalysisState('idle');
      setAnalysisError('');
      setAnalysisProgress(null);
      setDetectedRegion(null);
      setDetectedLines([]);
      setGapCandidates([]);
      setAnalysisImage(null);
    } catch {
      setClearState('error');
      setClearMessage('Network error. Please try again.');
    }
  };

  /* -----------------------------------------------
     Render: Password Gate (Unauthenticated)
  ----------------------------------------------- */
  if (authState !== 'authenticated') {
    return (
      <div className="page-wrapper">
        <div className="page-content" style={{ maxWidth: '440px' }}>
          <header className="site-header" style={{ marginBottom: '1.75rem' }}>
            <div className="logo-row">
              <span className="event-badge">
                <span className="dot" />
                Admin Console
              </span>
            </div>
            <h1 className="site-title">
              Certificate <span>Console</span>
            </h1>
            <p className="site-subtitle">Dr. S. J. Chopra Centre for Learning · UPES</p>
          </header>

          <div className="card">
            <h2 className="card-title">Admin Authentication</h2>
            <p className="card-subtitle">
              Enter the administrator security key to access database controls and asset managers.
            </p>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-password">
                  Security Key
                </label>
                <input
                  id="admin-password"
                  className="form-input"
                  type="password"
                  placeholder="Enter security key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authState === 'loading'}
                  required
                  autoComplete="current-password"
                />
              </div>

              {authState === 'error' && (
                <div className="alert alert-error" role="alert">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
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
                      Verifying...
                    </>
                  ) : (
                    'Authenticate'
                  )}
                </button>
              </div>
            </form>
          </div>

          <footer className="site-footer" style={{ marginTop: '2rem' }}>
            <p>
              <Link href="/">← Return to Student Portal</Link>
            </p>
          </footer>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------
     Render: Authenticated Wide Dashboard
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              Student Portal
            </a>
            <button className="btn-nav btn-nav-danger" onClick={handleLogout} title="Sign out of Admin Console">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
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
              <span className="stat-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
            </div>
            <div className="stat-card-value">{dashboard?.participantCount ?? 0}</div>
            <div className="stat-card-sub">
              <span style={{ color: 'var(--color-success)' }}>●</span> Synced in Supabase
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Certificate Template</span>
              <span className="stat-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </span>
            </div>
            <div
              className="stat-card-value"
              style={{
                fontSize: '1.4rem',
                color: dashboard?.templateUrl ? 'var(--color-success)' : 'var(--color-gold)',
              }}
            >
              {dashboard?.templateUrl ? 'Active' : 'Default Asset'}
            </div>
            <div className="stat-card-sub">
              {dashboard?.templateUrl ? 'Custom uploaded template' : 'Using public template'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Last Database Sync</span>
              <span className="stat-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
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
              <span className="stat-card-label">System Architecture</span>
              <span className="stat-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
            </div>
            <div className="stat-card-value" style={{ fontSize: '1.35rem', color: 'var(--color-gold-light)' }}>
              Serverless
            </div>
            <div className="stat-card-sub">
              <span style={{ color: 'var(--color-success)' }}>✓</span> RLS &amp; Rate Limiter Active
            </div>
          </div>
        </div>

        {/* Full-Width Section: Participant Directory, Live Search & Direct Add/Remove */}
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <div className="directory-controls">
            <div>
              <div className="section-title">Participant Directory</div>
              <h2 className="card-title">Attendee Records ({participants.length})</h2>
              <p className="card-subtitle" style={{ marginBottom: 0 }}>
                View, search, add individual records, or delete participants directly.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
              <button
                className="btn-nav btn-nav-outline"
                onClick={() => setShowAddForm((v) => !v)}
                style={{ padding: '0.55rem 0.95rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {showAddForm ? 'Hide Form' : 'Add Participant'}
              </button>

              <button
                className="btn-nav btn-nav-outline"
                onClick={() => fetchParticipants(password)}
                disabled={loadingParticipants}
                title="Refresh Participant List"
                style={{ padding: '0.55rem 0.75rem' }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className={loadingParticipants ? 'spin-icon' : ''}
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Add Form Drawer */}
          {showAddForm && (
            <form onSubmit={handleAddParticipant} className="quick-add-panel">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-gold)', marginBottom: '0.75rem' }}>
                Add New Participant
              </div>
              <div className="quick-add-grid">
                <div>
                  <label className="form-label" style={{ fontSize: '0.725rem' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.725rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. rahul@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.725rem' }}>
                    SAP ID
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 500098765"
                    value={newSapid}
                    onChange={(e) => setNewSapid(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isAdding}
                    style={{ whiteSpace: 'nowrap', height: '42px', padding: '0 1.25rem' }}
                  >
                    {isAdding ? 'Adding...' : 'Add Record'}
                  </button>
                </div>
              </div>

              {addError && (
                <div className="alert alert-error" style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem' }}>
                  {addError}
                </div>
              )}
              {addMessage && (
                <div className="alert alert-success" style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem' }}>
                  {addMessage}
                </div>
              )}
            </form>
          )}

          {/* Search Filter Box */}
          <div style={{ marginBottom: '1rem' }}>
            <div className="search-box">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Filter by student name, email, or SAP ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>SAP ID</th>
                  <th style={{ textAlign: 'right', width: '100px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.length > 0 ? (
                  filteredParticipants.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--color-white-muted)', fontSize: '0.75rem' }}>{idx + 1}</td>
                      <td>
                        <strong style={{ color: 'var(--color-white)' }}>{p.name}</strong>
                      </td>
                      <td style={{ color: 'var(--color-white-soft)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {p.email}
                      </td>
                      <td>
                        <span className="sapid-pill">{p.sapid}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-icon-danger"
                          onClick={() => handleDeleteParticipant(p.id, p.name, p.sapid, p.email)}
                          disabled={deletingId === p.id}
                          title="Remove participant from database"
                        >
                          {deletingId === p.id ? (
                            'Removing...'
                          ) : (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Remove
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-white-muted)' }}>
                      {loadingParticipants
                        ? 'Loading participant records...'
                        : searchQuery
                        ? `No participants found matching "${searchQuery}".`
                        : 'No participants in database. Upload an Excel sheet below or click "Add Participant".'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2-Column Dashboard Ingestion & Management Layout */}
        <div className="admin-main-grid">
          {/* Left Column: Participant Management & Excel Ingestion */}
          <div className="admin-col">
            <div className="card">
              <div className="section-title">Bulk Ingestion</div>
              <h2 className="card-title">Bulk Excel Ingestion</h2>
              <p className="card-subtitle">
                Upload your participant Excel sheet (.xlsx, .xls) to sync student verification records. Matching is
                case-insensitive by <strong>Full Name</strong>, <strong>Email</strong>, and <strong>SAP ID</strong>.
              </p>

              {/* Sample Download Shortcut */}
              <div className="sample-actions-row">
                <span style={{ fontSize: '0.78rem', color: 'var(--color-white-muted)' }}>Need an Excel template?</span>
                <a href="/sample-data/participant_template.xlsx" download="participant_template.xlsx" className="sample-btn">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Download Template (.xlsx)
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
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  style={{ margin: '0 auto 0.75rem', display: 'block', color: 'var(--color-gold)' }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <p className="file-upload-text">
                  <strong>Click to choose file</strong> or drag and drop here
                </p>
                <p className="file-upload-text" style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                  Supports Microsoft Excel (.xlsx, .xls)
                </p>
                {excelFile && (
                  <div className="file-name">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <strong>{excelFile.name}</strong> ({(excelFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {excelMessage && (
                <div className={`alert ${excelState === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
                  {excelState === 'error' ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload &amp; Replace All Participants
                    </>
                  )}
                </button>
              </div>

              {/* Format Reference Box */}
              <div className="alert alert-info" style={{ marginTop: '1.25rem' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
                  <strong>Required Header Columns:</strong>
                  <div style={{ marginTop: '0.35rem', fontFamily: 'monospace', color: 'var(--color-gold-light)' }}>
                    name | email | sapid
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-white-muted)', marginTop: '0.2rem' }}>
                    Note: Uploading a new sheet replaces existing records. Use &quot;Add Participant&quot; above to add single records.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Template Management & Danger Zone */}
          <div className="admin-col">
            {/* Template Card */}
            <div className="card">
              <div className="section-title">Certificate Template</div>
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
                  <div
                    style={{ position: 'relative', cursor: analysisState === 'manual' ? 'crosshair' : 'default' }}
                    onClick={handlePreviewClick}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dashboard.templateUrl}
                      alt="Active Certificate Template"
                      style={{ width: '100%', display: 'block' }}
                    />

                    {/* Live detection overlay: blue detected region + green flanking OCR lines */}
                    {analysisState === 'detected' && detectedRegion && analysisImage && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            left: `${(detectedRegion.x / analysisImage.width) * 100}%`,
                            top: `${(detectedRegion.y / analysisImage.height) * 100}%`,
                            width: `${(detectedRegion.width / analysisImage.width) * 100}%`,
                            height: `${(detectedRegion.height / analysisImage.height) * 100}%`,
                            border: '2px solid #38bdf8',
                            background: 'rgba(56,189,248,0.12)',
                          }}
                        />
                        {(['upperLine', 'lowerLine'] as const).map((key) => {
                          const line = detectedRegion[key];
                          if (!line) return null;
                          return (
                            <div
                              key={key}
                              style={{
                                position: 'absolute',
                                pointerEvents: 'none',
                                left: `${(line.x / analysisImage.width) * 100}%`,
                                top: `${(line.y / analysisImage.height) * 100}%`,
                                width: `${(line.width / analysisImage.width) * 100}%`,
                                height: `${(line.height / analysisImage.height) * 100}%`,
                                border: '1px solid #4ade80',
                                background: 'rgba(74,222,128,0.15)',
                              }}
                            />
                          );
                        })}
                        <div
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            left: `${(detectedRegion.centerX / analysisImage.width) * 100}%`,
                            top: `${(detectedRegion.centerY / analysisImage.height) * 100}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <div style={{ position: 'absolute', width: '2px', height: '28px', background: '#38bdf8', left: '-1px', top: '-14px' }} />
                          <div style={{ position: 'absolute', width: '28px', height: '2px', background: '#38bdf8', left: '-14px', top: '-1px' }} />
                          <div style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', left: '-3px', top: '-3px' }} />
                        </div>
                        <div
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            top: '0.5rem',
                            right: '0.5rem',
                            background: 'rgba(0,0,0,0.65)',
                            color: '#38bdf8',
                            fontSize: '0.7rem',
                            fontFamily: 'monospace',
                            padding: '0.25rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          Name position · {Math.round(detectedRegion.confidence * 100)}% confidence
                        </div>
                      </>
                    )}

                    {/* Saved region overlay (idle/error states) */}
                    {analysisState !== 'manual' && analysisState !== 'detected' && dashboard?.nameRegion && (
                      <>
                        {dashboard.nameRegion.gapHeight != null && (
                          <div
                            style={{
                              position: 'absolute',
                              pointerEvents: 'none',
                              left: '5%',
                              right: '5%',
                              top: `${(dashboard.nameRegion.centerY - dashboard.nameRegion.gapHeight / 2) * 100}%`,
                              height: `${dashboard.nameRegion.gapHeight * 100}%`,
                              border: '2px dashed rgba(56,189,248,0.7)',
                            }}
                          />
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            left: `${(dashboard.nameRegion.centerX ?? 0.5) * 100}%`,
                            top: `${dashboard.nameRegion.centerY * 100}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <div style={{ position: 'absolute', width: '2px', height: '28px', background: '#38bdf8', left: '-1px', top: '-14px' }} />
                          <div style={{ position: 'absolute', width: '28px', height: '2px', background: '#38bdf8', left: '-14px', top: '-1px' }} />
                          <div style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', left: '-3px', top: '-3px' }} />
                        </div>
                        <div
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            top: '0.5rem',
                            right: '0.5rem',
                            background: 'rgba(0,0,0,0.65)',
                            color: 'var(--color-gold)',
                            fontSize: '0.7rem',
                            fontFamily: 'monospace',
                            padding: '0.25rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          Saved name position ({dashboard.nameRegion.method})
                        </div>
                      </>
                    )}

                    {/* Manual placement marker */}
                    {analysisState === 'manual' &&
                      Number.isFinite(parseFloat(manualX)) &&
                      Number.isFinite(parseFloat(manualY)) && (
                        <div
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            left: `${parseFloat(manualX)}%`,
                            top: `${parseFloat(manualY)}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <div style={{ position: 'absolute', width: '2px', height: '28px', background: 'var(--color-gold)', left: '-1px', top: '-14px' }} />
                          <div style={{ position: 'absolute', width: '28px', height: '2px', background: 'var(--color-gold)', left: '-14px', top: '-1px' }} />
                          <div style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-gold)', left: '-3px', top: '-3px' }} />
                        </div>
                      )}
                  </div>
                  <div
                    style={{
                      padding: '0.6rem 0.85rem',
                      background: 'rgba(0,0,0,0.5)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--color-white-border)',
                    }}
                  >
                    <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>●</span> Active in Supabase Storage
                    </span>
                    <a
                      href={dashboard.templateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}
                    >
                      Open in New Tab ↗
                    </a>
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
                  Template is managed and served directly from Supabase Storage bucket &quot;certificates&quot;.
                </div>
              )}

              {dashboard?.templateUrl && (
                <div
                  style={{
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--color-white-border)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                  }}
                >
                  <div className="section-title">Name-Position Detection</div>

                  {analysisState === 'analyzing' && analysisProgress && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem',
                          marginBottom: '0.4rem',
                        }}
                      >
                        <span>Running OCR analysis…</span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {Math.round((analysisProgress.progress ?? 0) * 100)}%
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, (analysisProgress.progress ?? 0) * 100))}%`,
                            height: '100%',
                            background: 'var(--color-gold)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          marginTop: '0.4rem',
                          fontSize: '0.72rem',
                          color: 'var(--color-white-muted)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {analysisProgress.status}
                      </div>
                    </div>
                  )}

                  {analysisState === 'error' && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div className="alert alert-error">{analysisError}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={handleReanalyze}>
                          Retry Detection
                        </button>
                        <button className="btn btn-secondary" onClick={startManualPlacement}>
                          Set Manually
                        </button>
                      </div>
                    </div>
                  )}

                  {analysisState === 'detected' && detectedRegion && !analysisError && (
                    <div className="alert alert-success" style={{ marginTop: '0.75rem' }}>
                      Name position detected automatically — confidence {Math.round(detectedRegion.confidence * 100)}%.
                      The blue box on the preview shows where participant names will be printed.
                    </div>
                  )}

                  {analysisState === 'detected' && analysisError && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div className="alert alert-error">{analysisError}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={handleReanalyze} disabled={isSavingRegion}>
                          Re-analyze
                        </button>
                        <button className="btn btn-secondary" onClick={startManualPlacement}>
                          Set Manually
                        </button>
                      </div>
                    </div>
                  )}

                  {analysisState === 'manual' && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {manualFallback ? (
                        <div className="alert alert-error">
                          Automatic name-position detection was not confident enough. Please manually set the name
                          position.
                        </div>
                      ) : (
                        <div className="alert alert-info">
                          Manual placement: click on the preview image to set the name center point, or fine-tune
                          with the X/Y percentage inputs below.
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <label className="form-label" style={{ fontSize: '0.725rem' }}>
                            X (%)
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={manualX}
                            onChange={(e) => setManualX(e.target.value)}
                            inputMode="decimal"
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <label className="form-label" style={{ fontSize: '0.725rem' }}>
                            Y (%)
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={manualY}
                            onChange={(e) => setManualY(e.target.value)}
                            inputMode="decimal"
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="btn btn-primary" onClick={handleManualRegionSave} disabled={isSavingRegion}>
                          {isSavingRegion ? 'Saving...' : 'Save Name Position'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setAnalysisState('idle');
                            setAnalysisError('');
                            setManualFallback(false);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {analysisState === 'idle' && !dashboard?.nameRegion && !manualFallback && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div className="alert alert-info">
                        No name position saved for this template yet. Certificates currently print names at the
                        legacy position. Run automatic detection, or set the position manually.
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={handleReanalyze} disabled={analysisState === 'analyzing'}>
                          Detect Name Position
                        </button>
                        <button className="btn btn-secondary" onClick={startManualPlacement}>
                          Set Manually
                        </button>
                      </div>
                    </div>
                  )}

                  {analysisState === 'idle' && dashboard?.nameRegion && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div className="alert alert-success">
                        Saved name position:{' '}
                        {dashboard.nameRegion.method === 'manual' ? 'manually set' : 'auto-detected'}
                        {dashboard.nameRegion.confidence != null &&
                          ` (${Math.round(dashboard.nameRegion.confidence * 100)}% confidence)`}
                        . Names are printed at the crosshair shown on the preview.
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={handleReanalyze}>
                          Re-analyze
                        </button>
                        <button className="btn btn-secondary" onClick={startManualPlacement}>
                          Adjust Position
                        </button>
                      </div>
                    </div>
                  )}

                  {(detectedRegion || gapCandidates.length > 0) && (
                    <div style={{ marginTop: '0.9rem', fontSize: '0.75rem', color: 'var(--color-white-muted)' }}>
                      <strong style={{ color: 'var(--color-white-soft)' }}>Detection details:</strong> OCR lines:{' '}
                      {detectedLines.length} · accepted at ≥ {Math.round(LOW_CONFIDENCE_THRESHOLD * 100)}%
                      confidence
                      {gapCandidates.length > 0 && (
                        <ul
                          style={{
                            marginTop: '0.4rem',
                            paddingLeft: '1.1rem',
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            lineHeight: 1.8,
                          }}
                        >
                          {gapCandidates.map((c, i) => (
                            <li key={i}>
                              #{i + 1}: score {c.score.toFixed(3)} · gap{' '}
                              {((c.gapHeight / (analysisImage?.height || 1)) * 100).toFixed(1)}% H · gap{' '}
                              {c.scores.gap.toFixed(2)} · align {c.scores.alignment.toFixed(2)} · pos{' '}
                              {c.scores.position.toFixed(2)} · conf {c.scores.confidence.toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="file-upload-area">
                <input
                  id="template-file-input"
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
                />
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  style={{ margin: '0 auto 0.75rem', display: 'block', color: 'var(--color-gold)' }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                <p className="file-upload-text">
                  <strong>Click to browse</strong> or drag &amp; drop
                </p>
                <p className="file-upload-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  PNG or JPG (Landscape recommended, max 5MB)
                </p>
                {templateFile && (
                  <div className="file-name">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <strong>{templateFile.name}</strong> ({(templateFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {templateMessage && (
                <div className={`alert ${templateState === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
                  {templateState === 'error' ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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
                System Maintenance
              </div>
              <h2 className="card-title">Danger Zone</h2>
              <p className="card-subtitle" style={{ marginBottom: '1rem' }}>
                Permanently purge all participant records and stored templates.
              </p>

              {clearMessage && (
                <div className={`alert ${clearState === 'error' ? 'alert-error' : 'alert-success'}`} role="alert">
                  {clearState === 'error' ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {clearMessage}
                </div>
              )}

              {!showClearConfirm ? (
                <button className="btn btn-danger" onClick={() => setShowClearConfirm(true)} id="clear-data-btn">
                  Clear All Records
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
                    This operation is irreversible. All participant data will be erased.
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
          <p>Dr. S. J. Chopra Centre for Learning · UPES · Workshop on Advanced LaTeX</p>
          <p style={{ marginTop: '0.35rem' }}>
            <Link href="/">← Return to Public Student Verification Portal</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

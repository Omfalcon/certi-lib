'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

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

  // Clear state
  const [clearState, setClearState] = useState<UploadState>('idle');
  const [clearMessage, setClearMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  /* -----------------------------------------------
     Fetch Participants
  ----------------------------------------------- */
  const fetchParticipants = useCallback(async () => {
    setLoadingParticipants(true);
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
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
     Authentication & Session Check
  ----------------------------------------------- */
  // Restore session via secure HttpOnly cookie on initial mount or refresh
  useEffect(() => {
    const checkSession = async () => {
      setAuthState('loading');
      try {
        const res = await fetch('/api/admin-login', { method: 'GET' });
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setDashboard({
            participantCount: data.participantCount,
            lastUpload: data.lastUpload,
            templateUrl: data.templateUrl,
          });
          setAuthState('authenticated');
          fetchParticipants();
        } else {
          setAuthState('idle');
        }
      } catch {
        setAuthState('idle');
      }
    };

    checkSession();
  }, [fetchParticipants]);

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

      if (!res.ok || !data.authenticated) {
        setAuthState('error');
        setAuthError(data.error ?? 'Invalid credentials.');
        return;
      }

      // Clear the password input from memory for security
      setPassword('');
      setDashboard({
        participantCount: data.participantCount,
        lastUpload: data.lastUpload,
        templateUrl: data.templateUrl,
      });
      setAuthState('authenticated');

      // Fetch participant records
      fetchParticipants();
    } catch {
      setAuthState('error');
      setAuthError('Network error. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin-login?action=logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout notice:', err);
    }
    setPassword('');
    setDashboard(null);
    setParticipants([]);
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
      fetchParticipants();
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

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      await fetchParticipants();
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

    const formData = new FormData();
    formData.append('file', excelFile);

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
      fetchParticipants();
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

    try {
      const res = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setTemplateState('error');
        setTemplateMessage(data.error ?? 'Template upload failed.');
        return;
      }

      setTemplateState('success');
      setTemplateMessage(data.message);
      setDashboard((prev) => (prev ? { ...prev, templateUrl: data.templateUrl } : prev));
      setTemplateFile(null);
    } catch {
      setTemplateState('error');
      setTemplateMessage('Network error. Please try again.');
    }
  };

  /* -----------------------------------------------
     Clear All Records (Purge)
  ----------------------------------------------- */
  const handleClearData = async () => {
    setClearState('uploading');
    setClearMessage('');

    try {
      const res = await fetch('/api/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        setClearState('error');
        setClearMessage(data.error ?? 'Failed to clear data.');
        return;
      }

      setClearState('success');
      setClearMessage('All participant records and template associations cleared successfully.');
      setShowClearConfirm(false);
      setParticipants([]);
      setDashboard((prev) =>
        prev ? { ...prev, participantCount: 0, lastUpload: null, templateUrl: null } : prev
      );
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
      <div 
        className="min-h-screen relative flex flex-col justify-center items-center p-4 text-[#e2e8f0] font-sans selection:bg-amber-500/30 selection:text-amber-200"
        style={{
          backgroundColor: '#070d1e',
          backgroundImage: `
            radial-gradient(circle at 50% 15%, rgba(30, 58, 138, 0.3) 0%, transparent 65%),
            radial-gradient(circle at 50% 85%, rgba(30, 58, 138, 0.2) 0%, transparent 60%),
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 50px 50px, 50px 50px',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Ambient Math Watermarks */}
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-12 left-10 text-6xl rotate-[-12deg] font-bold font-mono text-white select-none pointer-events-none opacity-[0.02]">
            {`\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}`}
          </div>
          <div className="absolute bottom-24 right-1/4 text-6xl rotate-[8deg] font-mono text-white select-none pointer-events-none opacity-[0.02]">
            {`\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}`}
          </div>
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/15 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <header className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-amber-500/30 backdrop-blur-md shadow-sm mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="text-xs font-semibold text-amber-300 tracking-wider uppercase">
                Admin Console
              </span>
            </div>
            <h1 className="text-3xl font-['Cinzel',serif] font-bold text-white tracking-tight">
              Certificate <span className="text-[#F5B81C]">Console</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
              Dr. S. J. Chopra Centre for Learning · UPES
            </p>
          </header>

          <div className="bg-[#0d1833]/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-7 sm:p-8 shadow-[0_20px_60px_-15px_rgba(2,6,23,0.8),0_0_25px_rgba(37,99,235,0.12)]">
            <h2 className="text-xl font-bold text-white mb-1.5 tracking-tight">
              Admin Authentication
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Enter the administrator security key to access database controls and asset managers.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5" htmlFor="admin-password">
                  Security Key <span className="text-amber-400">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    id="admin-password"
                    type="password"
                    style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                    className="block w-full py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 transition text-sm font-medium hover:border-slate-600"
                    placeholder="Enter security key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={authState === 'loading'}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {authState === 'error' && (
                <div className="p-3 rounded-xl border border-red-900/60 bg-red-950/50 text-red-300 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{authError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authState === 'loading'}
                  id="admin-login-btn"
                  className="w-full bg-[#F5B81C] hover:bg-[#EAB308] active:bg-[#CA8A04] text-slate-950 font-bold text-sm tracking-wide py-3 px-6 rounded-xl shadow-[0_4px_20px_rgba(245,184,28,0.25)] hover:shadow-[0_6px_25px_rgba(245,184,28,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {authState === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Verifying Key...</span>
                    </>
                  ) : (
                    'Authenticate'
                  )}
                </button>
              </div>
            </form>
          </div>

          <footer className="text-center mt-6 text-xs text-slate-400">
            <a href="/" className="text-[#F5B81C] hover:underline flex items-center justify-center gap-1">
              <span>←</span> Return to Student Portal
            </a>
          </footer>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------
     Render: Authenticated Dashboard (Dark LaTeX Theme)
  ----------------------------------------------- */
  return (
    <div 
      className="min-h-screen relative flex flex-col justify-between overflow-x-hidden text-[#e2e8f0] font-sans selection:bg-amber-500/30 selection:text-amber-200 py-8 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: '#070d1e',
        backgroundImage: `
          radial-gradient(circle at 50% 15%, rgba(30, 58, 138, 0.25) 0%, transparent 65%),
          radial-gradient(circle at 50% 85%, rgba(30, 58, 138, 0.2) 0%, transparent 60%),
          linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 50px 50px, 50px 50px',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background Math Impressions */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-12 left-10 text-6xl rotate-[-12deg] font-bold font-mono text-white select-none pointer-events-none opacity-[0.02]">
          {`\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}`}
        </div>
        <div className="absolute top-1/2 right-12 text-7xl rotate-[12deg] font-mono text-white select-none pointer-events-none opacity-[0.02]">
          {`\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}`}
        </div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/15 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl mx-auto z-10 relative">
        {/* Top Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-6 border-b border-slate-800/80 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Admin Console
              </span>
              <span className="text-xs text-slate-400">Dr. S. J. Chopra Centre · UPES</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-['Cinzel',serif] font-bold text-white tracking-tight">
              Certificate <span className="text-[#F5B81C]">Admin Control</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Workshop on Advanced LaTeX for Research Writing and Publication
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a 
              href="/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white hover:border-amber-500/60 transition shadow-sm"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              Student Portal
            </a>
            <button 
              onClick={handleLogout} 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/40 border border-red-900/50 text-xs font-semibold text-red-300 hover:bg-red-900/40 hover:text-white transition shadow-sm cursor-pointer"
              title="Sign out"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Lock
            </button>
          </div>
        </header>

        {/* 4-Card KPI Stat Grid: 2x2 on Mobile (left & right), 4 in a row on Laptop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* Card 1: Participants */}
          <div className="bg-[#0d1833]/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Total Participants</span>
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-[#F5B81C] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{dashboard?.participantCount ?? 0}</div>
            <div className="text-[10px] sm:text-xs text-emerald-400 flex items-center gap-1.5 mt-2">
              <span>●</span> Synced in DB
            </div>
          </div>

          {/* Card 2: Template */}
          <div className="bg-[#0d1833]/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Template</span>
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-[#F5B81C] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </span>
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${dashboard?.templateUrl ? 'text-emerald-400' : 'text-[#F5B81C]'}`}>
              {dashboard?.templateUrl ? 'Active' : 'Default Asset'}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-2 truncate">
              {dashboard?.templateUrl ? 'Custom template live' : 'Using public asset'}
            </div>
          </div>

          {/* Card 3: Last Sync */}
          <div className="bg-[#0d1833]/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Last Sync</span>
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-[#F5B81C] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
            </div>
            <div className="text-base sm:text-xl font-bold text-white truncate">
              {dashboard?.lastUpload
                ? new Date(dashboard.lastUpload).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Initial State'}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-2 truncate">
              {dashboard?.lastUpload
                ? new Date(dashboard.lastUpload).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No uploads logged'}
            </div>
          </div>

          {/* Card 4: Architecture */}
          <div className="bg-[#0d1833]/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Architecture</span>
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-[#F5B81C] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#F5B81C]">Serverless</div>
            <div className="text-[10px] sm:text-xs text-emerald-400 flex items-center gap-1 mt-2">
              <span>✓</span> RLS &amp; Rate Limit
            </div>
          </div>
        </div>

        {/* Full-Width Section: Participant Directory, Live Search & Direct Add/Remove */}
        <div className="bg-[#0d1833]/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-xl mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 gap-4">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10.5px] font-semibold uppercase tracking-wider mb-1.5">
                Directory
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                Attendee Records
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-medium">
                  {participants.length}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                View, search, add individual records, or manage certificate status.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5B81C] hover:bg-[#EAB308] text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {showAddForm ? 'Hide Form' : 'Add Attendee'}
              </button>

              <button
                onClick={() => fetchParticipants()}
                disabled={loadingParticipants}
                title="Refresh Participant List"
                className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600 transition cursor-pointer"
              >
                <svg
                  className={`w-4 h-4 ${loadingParticipants ? 'animate-spin text-[#F5B81C]' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Add Form Drawer */}
          {showAddForm && (
            <form onSubmit={handleAddParticipant} className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 mb-5 shadow-inner">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-3">
                Add Single Participant
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    placeholder="e.g. Rahul Sharma"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    placeholder="e.g. rahul@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 uppercase mb-1">SAP ID</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="e.g. 500098765"
                    value={newSapid}
                    onChange={(e) => setNewSapid(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 bg-[#F5B81C] hover:bg-[#EAB308] text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-60 cursor-pointer"
                >
                  {isAdding ? 'Adding...' : 'Save Participant'}
                </button>
                {addError && <span className="text-xs text-red-400">{addError}</span>}
                {addMessage && <span className="text-xs text-emerald-400">{addMessage}</span>}
              </div>
            </form>
          )}

          {/* Search Filter Box */}
          <div className="relative mb-4">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
              className="w-full py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition"
              placeholder="Filter by student name, email, or SAP ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-[#091122]/60">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#091122] border-b border-slate-700 text-[#F5B81C] uppercase font-bold text-[11px] tracking-wider">
                  <th className="p-3 w-12 text-slate-400">#</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">SAP ID</th>
                  <th className="p-3 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredParticipants.length > 0 ? (
                  filteredParticipants.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="p-3 font-semibold text-white">{p.name}</td>
                      <td className="p-3 font-mono text-slate-300 text-xs">{p.email}</td>
                      <td className="p-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs">
                          {p.sapid}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteParticipant(p.id, p.name, p.sapid, p.email)}
                          disabled={deletingId === p.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/40 hover:text-white transition text-xs cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          {deletingId === p.id ? 'Deleting...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      {loadingParticipants
                        ? 'Loading participant records...'
                        : searchQuery
                        ? `No participants found matching "${searchQuery}".`
                        : 'No participants in database. Upload an Excel sheet below or click "Add Attendee".'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((p, idx) => (
                <div key={p.id} className="bg-[#091122] border border-slate-800 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-[#F5B81C] font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{p.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{p.email}</div>
                      </div>
                    </div>
                    <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold">
                      {p.sapid}
                    </div>
                  </div>

                  <div className="h-px bg-slate-800 my-2.5" />

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Ready to Issue
                    </div>
                    <button
                      onClick={() => handleDeleteParticipant(p.id, p.name, p.sapid, p.email)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-900/50 bg-red-950/30 text-red-400 text-xs hover:bg-red-900/40 transition cursor-pointer"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs border border-slate-800 rounded-xl">
                {loadingParticipants
                  ? 'Loading participant records...'
                  : searchQuery
                  ? `No participants found matching "${searchQuery}".`
                  : 'No participants in database.'}
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Showing {filteredParticipants.length} of {participants.length} participant{participants.length !== 1 && 's'}
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80 text-slate-400 hover:text-white transition">
                Prev
              </button>
              <button className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80 text-slate-400 hover:text-white transition">
                Next
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Section: Bulk Excel Ingestion, Template Management & Danger Zone */}
        {/* On Phone: 1. Bulk Excel -> 2. Template -> 3. Danger Zone (at the end) */}
        {/* On Laptop: Col 1: Bulk Excel + Danger Zone underneath | Col 2: Template Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-start">
          {/* Item 1: Bulk Ingestion (Mobile: 1st, Laptop: Col 1 Row 1) */}
          <div className="lg:col-start-1 lg:row-start-1 bg-[#0d1833]/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 sm:p-7 shadow-xl">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10.5px] font-semibold uppercase tracking-wider mb-2">
              Bulk Ingestion
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Bulk Excel Ingestion</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Upload your participant Excel sheet (.xlsx, .xls) to sync student verification records. Matching is
              case-insensitive by <strong>Full Name</strong>, <strong>Email</strong>, and <strong>SAP ID</strong>.
            </p>

            {/* Template Download */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-slate-400">Need an Excel template?</span>
              <a 
                href="/sample-data/participant_template.xlsx" 
                download="participant_template.xlsx" 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs text-amber-300 hover:border-amber-400 transition"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download Template (.xlsx)
              </a>
            </div>

            {/* Drag & Drop Area */}
            <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500/50 bg-slate-900/60 hover:bg-slate-900/80 rounded-2xl p-6 text-center transition cursor-pointer mb-4">
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
              />
              <svg className="w-9 h-9 text-[#F5B81C] mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p className="text-xs sm:text-sm font-medium text-white">
                <strong className="text-amber-300">Click to choose file</strong> or drag and drop here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports Microsoft Excel (.xlsx, .xls)
              </p>
              {excelFile && (
                <div className="mt-3 text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {excelMessage && (
              <div className={`p-3 rounded-xl border text-xs mb-4 flex items-center gap-2 ${excelState === 'error' ? 'bg-red-950/50 border-red-900/60 text-red-300' : 'bg-emerald-950/50 border-emerald-900/60 text-emerald-300'}`}>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 8 12 12 14 14" />
                </svg>
                <span>{excelMessage}</span>
              </div>
            )}

            <button
              onClick={handleExcelUpload}
              disabled={!excelFile || excelState === 'uploading'}
              className="w-full bg-[#F5B81C] hover:bg-[#EAB308] text-slate-950 font-bold text-xs sm:text-sm py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-md"
            >
              {excelState === 'uploading' ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Parsing &amp; Syncing Participants...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Upload &amp; Replace All Participants</span>
                </>
              )}
            </button>

            {/* Format Reference Box */}
            <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Required Header Columns:</span>
              <div className="mt-1 font-mono text-amber-300 text-xs">name | email | sapid</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Uploading a new sheet replaces existing records. Use &quot;Add Attendee&quot; above to add single records.
              </div>
            </div>
          </div>

          {/* Item 2: Template Card (Mobile: 2nd, Laptop: Col 2 Row 1-2) */}
          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 bg-[#0d1833]/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 sm:p-7 shadow-xl">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10.5px] font-semibold uppercase tracking-wider mb-2">
              Template
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Certificate Design Template</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Upload the high-resolution certificate background image (PNG or JPG).
            </p>

            {dashboard?.templateUrl ? (
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dashboard.templateUrl} alt="Active Certificate Template" className="w-full h-auto block" />
                <div className="p-2.5 bg-slate-900/90 text-xs flex items-center justify-between border-t border-slate-800">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span>●</span> Active in Supabase Storage
                  </span>
                  <a
                    href={dashboard.templateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F5B81C] hover:underline"
                  >
                    Open in New Tab ↗
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400 mb-4">
                Template is managed and served directly from Supabase Storage bucket &quot;certificates&quot;.
              </div>
            )}

            {/* Template Upload Drop Zone */}
            <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500/50 bg-slate-900/60 hover:bg-slate-900/80 rounded-2xl p-6 text-center transition cursor-pointer mb-4">
              <input
                id="template-file-input"
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)}
              />
              <svg className="w-9 h-9 text-[#F5B81C] mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <p className="text-xs sm:text-sm font-medium text-white">
                <strong className="text-amber-300">Click to browse</strong> or drag &amp; drop
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                PNG or JPG (Landscape recommended, max 5MB)
              </p>
              {templateFile && (
                <div className="mt-3 text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{templateFile.name} ({(templateFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {templateMessage && (
              <div className={`p-3 rounded-xl border text-xs mb-4 flex items-center gap-2 ${templateState === 'error' ? 'bg-red-950/50 border-red-900/60 text-red-300' : 'bg-emerald-950/50 border-emerald-900/60 text-emerald-300'}`}>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 8 12 12 14 14" />
                </svg>
                <span>{templateMessage}</span>
              </div>
            )}

            <button
              onClick={handleTemplateUpload}
              disabled={!templateFile || templateState === 'uploading'}
              className="w-full bg-[#F5B81C] hover:bg-[#EAB308] text-slate-950 font-bold text-xs sm:text-sm py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-md"
            >
              {templateState === 'uploading' ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Uploading Template...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Upload Template to Storage</span>
                </>
              )}
            </button>
          </div>

          {/* Item 3: Danger Zone (Mobile: 3rd [at the end], Laptop: Col 1 Row 2 [under bulk excel]) */}
          <div className="lg:col-start-1 lg:row-start-2 bg-[#180e1c]/90 backdrop-blur-xl border border-red-900/40 rounded-3xl p-6 sm:p-7 shadow-xl">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-900/60 text-red-300 text-[10.5px] font-semibold uppercase tracking-wider mb-2">
              System Maintenance
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Danger Zone</h2>
            <p className="text-xs text-slate-400 mb-4">
              Permanently purge all participant records and stored templates from the database.
            </p>

            {clearMessage && (
              <div className={`p-3 rounded-xl border text-xs mb-4 flex items-center gap-2 ${clearState === 'error' ? 'bg-red-950/50 border-red-900/60 text-red-300' : 'bg-emerald-950/50 border-emerald-900/60 text-emerald-300'}`}>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 8 12 12 14 14" />
                </svg>
                <span>{clearMessage}</span>
              </div>
            )}

            {!showClearConfirm ? (
              <button 
                onClick={() => setShowClearConfirm(true)} 
                className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900/50 border border-red-900/70 text-red-300 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Clear All Records
              </button>
            ) : (
              <div className="bg-red-950/40 border border-red-900/60 p-4 rounded-xl">
                <p className="text-xs text-red-300 font-semibold mb-3">
                  This operation is irreversible. All participant data will be erased from Supabase.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearData}
                    disabled={clearState === 'uploading'}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    {clearState === 'uploading' ? 'Purging...' : 'Yes, Wipe All Data'}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin Footer */}
        <footer className="text-center text-xs text-slate-400 space-y-1 py-4 border-t border-slate-800/80">
          <p>Dr. S. J. Chopra Centre for Learning · UPES · Workshop on Advanced LaTeX</p>
          <p>
            <a href="/" className="text-[#F5B81C] hover:underline">
              ← Return to Public Student Verification Portal
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

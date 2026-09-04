'use client';

import { useState } from 'react';
import { generateAndDownloadCertificate } from '@/lib/generateCertificate';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function HomePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sapid, setSapid] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [templateUrl, setTemplateUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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
      setStatus('success');
    } catch {
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      let activeUrl = templateUrl;
      if (!activeUrl) {
        const res = await fetch('/api/template');
        const d = await res.json();
        activeUrl = d.templateUrl;
      }

      if (!activeUrl) {
        throw new Error('Certificate template not found in Supabase. Please contact the administrator.');
      }

      await generateAndDownloadCertificate({
        name: verifiedName,
        templateUrl: activeUrl,
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
    setName('');
    setEmail('');
    setSapid('');
  };

  return (
    <div 
      className="min-h-screen relative flex flex-col justify-between overflow-x-hidden text-[#e2e8f0] font-sans selection:bg-amber-500/30 selection:text-amber-200"
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
      {/* Ambient Background Geometry & Watermarks */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-12 left-6 sm:left-10 text-5xl sm:text-6xl rotate-[-12deg] font-bold font-mono text-white select-none pointer-events-none opacity-[0.025]">
          {`\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}`}
        </div>
        <div className="absolute top-1/3 right-6 sm:right-12 text-6xl sm:text-7xl rotate-[15deg] font-mono text-white select-none pointer-events-none opacity-[0.025]">
          {`\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}`}
        </div>
        <div className="absolute bottom-24 left-1/4 text-4xl sm:text-5xl rotate-[-6deg] font-mono text-white select-none pointer-events-none opacity-[0.025]">
          {`\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}`}
        </div>
        <div className="absolute bottom-1/3 right-1/4 text-5xl sm:text-6xl rotate-[8deg] font-mono text-white select-none pointer-events-none opacity-[0.025]">
          {`\\mathcal{L}\\{f(t)\\} = \\int_{0}^{\\infty} e^{-st} f(t) dt`}
        </div>

        {/* Soft ambient deep-blue glow sphere */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/15 rounded-full blur-[120px]" />
      </div>

      {/* Top Institutional Header */}
      <header className="relative z-10 w-full pt-6 sm:pt-8 pb-3 px-4 flex flex-col items-center text-center">
        {/* Center Institution Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-slate-900/80 border border-amber-500/30 backdrop-blur-md shadow-sm transition hover:border-amber-500/60 cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="text-[11px] sm:text-xs md:text-sm font-medium tracking-wide text-amber-300">
            Dr. S. J. Chopra Centre <span className="hidden sm:inline">for Learning</span> · UPES
          </span>
          <span className="inline-block w-1 h-1 rounded-full bg-slate-600" />
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Research Support
          </span>
        </div>

        {/* Main Title Group */}
        <div className="mt-4 sm:mt-5 max-w-4xl space-y-1 sm:space-y-2">
          <h1 className="tracking-tight text-white uppercase">
            <span className="block text-[11px] sm:text-xs md:text-sm tracking-[0.25em] text-slate-300 font-semibold mb-1 md:inline md:text-4xl lg:text-5xl md:tracking-normal md:font-extrabold md:text-white md:mr-3 font-['Cinzel',serif]">
              WORKSHOP ON
            </span>
            <span className="block md:inline text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-['Cinzel',serif] font-black text-[#F5B81C] tracking-wider filter drop-shadow-[0_2px_12px_rgba(245,184,28,0.35)]">
              ADVANCED LATEX
            </span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-300 font-light tracking-wide pt-1">
            For Research Writing and Publication
          </p>
        </div>

        {/* Motivational Motto Banner */}
        <div className="mt-3.5 sm:mt-4 inline-flex items-center px-4 sm:px-5 py-1.5 rounded-full bg-amber-950/25 border border-amber-500/30 text-amber-300 text-[11px] sm:text-xs md:text-sm italic font-medium shadow-inner tracking-wider backdrop-blur-sm uppercase">
          “Write Better. Publish Smarter. Impact Greater.”
        </div>

        {/* Event Metadata Badges Bar - Responsive: 1 wide + 2-col on Mobile, 1 row on Desktop */}
        {/* Mobile View (< md) */}
        <div className="flex flex-col gap-2 w-full max-w-sm md:hidden mt-5 mb-2">
          <div className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-800 bg-[#0B1220]/90 text-xs text-slate-200 shadow-sm">
            <svg aria-hidden="true" className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span>9 September 2026, Wednesday</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-800 bg-[#0B1220]/90 text-[11px] text-slate-200 shadow-sm">
              <svg aria-hidden="true" className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>2:00 – 5:30 PM IST</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-800 bg-[#0B1220]/90 text-[11px] text-slate-200 shadow-sm">
              <svg aria-hidden="true" className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>Trust Boardroom</span>
            </div>
          </div>
        </div>

        {/* Desktop View (>= md) */}
        <div className="hidden md:flex flex-wrap items-center justify-center gap-2.5 text-xs sm:text-sm text-slate-300 font-normal mt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900/70 border border-slate-700/80 backdrop-blur-sm shadow-sm hover:border-slate-600 transition">
            <svg aria-hidden="true" className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span>9 September 2026, Wednesday</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900/70 border border-slate-700/80 backdrop-blur-sm shadow-sm hover:border-slate-600 transition">
            <svg aria-hidden="true" className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span>2:00 PM – 5:30 PM IST</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900/70 border border-slate-700/80 backdrop-blur-sm shadow-sm hover:border-slate-600 transition">
            <svg aria-hidden="true" className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span>Trust Boardroom, Bidholi Campus</span>
          </div>
        </div>
      </header>

      {/* Main Certificate Verification Workspace */}
      <main className="relative z-10 w-full mx-auto px-4 py-6 sm:py-8 md:py-10 flex-grow flex items-center justify-center max-w-3xl lg:max-w-4xl">
        <div className="w-full bg-[#0d1833]/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-5 sm:p-7 md:p-9 shadow-[0_20px_60px_-15px_rgba(2,6,23,0.8),0_0_25px_rgba(37,99,235,0.12)] relative overflow-hidden">
          {/* Subtle Deep Blue Ambient Accent within card */}
          <div className="absolute -bottom-24 -left-12 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {status !== 'success' ? (
              <div className="flex flex-col justify-between w-full">
                <div>
                  {/* Form Header & Badge */}
                  <div className="flex items-center justify-between gap-3 mb-1.5 sm:mb-2">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                      Download Your Certificate
                    </h2>
                    <span className="shrink-0 px-2.5 py-1 text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 rounded-full flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                      </svg>
                      <span className="sm:hidden">OFFICIAL</span>
                      <span className="hidden sm:inline">Official Registry</span>
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mb-5 sm:mb-6 leading-relaxed">
                    Enter your registered attendee credentials exactly as submitted during registration.
                  </p>

                  {/* Inputs Form */}
                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {/* Full Name Field */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5" htmlFor="fullName">
                        Full Name <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        </div>
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                          className="block w-full py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 transition text-sm font-medium hover:border-slate-600"
                          placeholder="e.g. Priya Sharma"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={status === 'loading'}
                          required
                        />
                      </div>
                    </div>

                    {/* Email Address Field */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5" htmlFor="email">
                        Institutional / Registered Email <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        </div>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                          className="block w-full py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 transition text-sm font-medium hover:border-slate-600"
                          placeholder="e.g. priya@ddn.upes.ac.in"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={status === 'loading'}
                          required
                        />
                      </div>
                    </div>

                    {/* University SAP ID Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="sapId">
                          SAP ID / Student ID <span className="text-amber-400">*</span>
                        </label>
                        <span className="text-[11px] font-mono text-slate-400">9-digit University ID</span>
                      </div>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        </div>
                        <input
                          id="sapId"
                          name="sapId"
                          type="text"
                          maxLength={9}
                          pattern="[0-9]{9}"
                          style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                          className="block w-full py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 transition text-sm font-mono hover:border-slate-600"
                          placeholder="e.g. 500123456"
                          value={sapid}
                          onChange={(e) => setSapid(e.target.value)}
                          disabled={status === 'loading'}
                          required
                        />
                      </div>
                    </div>

                    {/* Status / Error Message */}
                    {message && (
                      <div className={`p-3 rounded-xl border text-sm flex items-start gap-2.5 ${status === 'error' ? 'bg-red-950/50 border-red-900/60 text-red-300' : 'bg-slate-800/60 border-slate-700 text-slate-200'}`}>
                        <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{message}</span>
                      </div>
                    )}

                    {/* Primary Submit CTA - Solid Gold */}
                    <div className="pt-2">
                      <button
                        id="btn-verify"
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full bg-[#F59E0B] hover:bg-[#EAB308] active:bg-[#CA8A04] text-slate-950 font-bold text-sm sm:text-base tracking-wide py-3.5 px-6 rounded-xl shadow-[0_4px_20px_rgba(245,184,28,0.25)] hover:shadow-[0_6px_25px_rgba(245,184,28,0.35)] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {status === 'loading' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            <span>Authenticating Registry Record...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-slate-950 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                            </svg>
                            <span>Verify &amp; Retrieve Certificate</span>
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              /* Success State */
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-950/60 border-2 border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_35px_rgba(16,185,129,0.25)]">
                  <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <span className="inline-block px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/50 text-emerald-400 text-xs font-bold tracking-wider mb-2">
                  OFFICIAL REGISTRY VERIFIED
                </span>
                
                <h3 className="text-2xl sm:text-3xl font-['Cinzel',serif] text-[#F5B81C] font-bold mt-1 mb-2">
                  {verifiedName}
                </h3>
                
                <p className="text-slate-300 text-sm mb-8 max-w-md mx-auto">
                  Your workshop attendance and completion record has been authenticated. Your digital certificate is ready to download.
                </p>

                <button
                  className="w-full h-13 mb-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-base rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_25px_rgba(16,185,129,0.3)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  onClick={handleDownload}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Generating Secure PDF...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      <span>Download Certificate (PDF)</span>
                    </>
                  )}
                </button>

                {message && (
                  <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-900/50 text-red-300 text-sm">
                    {message}
                  </div>
                )}

                <button 
                  className="text-slate-400 hover:text-white text-sm transition-colors inline-flex items-center gap-1.5 mt-2 cursor-pointer" 
                  onClick={handleReset}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Verify another certificate</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Institutional Portal Footer */}
      <footer className="relative z-10 w-full py-6 px-4 border-t border-slate-800/80 bg-[#060b18]/80 backdrop-blur-md text-center text-xs text-slate-400 space-y-1.5">
        <div className="font-medium text-slate-300">
          Dr. S. J. Chopra Centre for Learning · UPES
        </div>
        <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-slate-400">
          <span>Need assistance with your certification?</span>
          <a className="text-amber-400 hover:text-amber-300 underline underline-offset-4 decoration-amber-400/40 hover:decoration-amber-300 transition font-mono" href="mailto:librarian@ddn.upes.ac.in">
            librarian@ddn.upes.ac.in
          </a>
          <span className="text-slate-600">|</span>
          <span className="hover:text-slate-200 transition cursor-pointer">Workshop Helpdesk</span>
          <span className="text-slate-600">|</span>
          <span className="hover:text-slate-200 transition cursor-pointer">LaTeX Templates Repository</span>
        </div>
        <div className="text-[11px] text-slate-400 pt-1">
          © 2026 University of Petroleum and Energy Studies (UPES). All rights reserved.
        </div>
      </footer>
    </div>
  );
}

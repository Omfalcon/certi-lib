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
    <div className="h-screen max-h-screen overflow-hidden bg-[#070D19] text-white flex flex-col justify-between items-center py-3 px-4 sm:px-6 md:px-8 relative font-sans select-none">
      {/* Subtle Math Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-35 z-0"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 15%, rgba(30, 58, 138, 0.25) 0%, transparent 70%),
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 45px 45px, 45px 45px'
        }}
      />

      {/* Decorative LaTeX Mathematical Formulas in Corners/Edges */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none font-serif italic text-slate-400 opacity-[0.05]">
        <div className="absolute -top-6 -left-10 text-6xl md:text-8xl transform -rotate-12">
          {`\\int_{0}^{x} \\frac{1}{\\sqrt{t}} dt`}
        </div>
        <div className="absolute top-1/3 -left-12 text-5xl md:text-7xl transform -rotate-6">
          {`\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}`}
        </div>
        <div className="absolute bottom-16 -left-8 text-5xl md:text-7xl transform rotate-6">
          {`\\mathcal{L}\\{f(t)\\} = F(s)`}
        </div>
        <div className="absolute top-10 -right-6 text-6xl md:text-8xl transform rotate-12">
          {`E = mc^2`}
        </div>
        <div className="absolute top-1/2 -right-16 text-5xl md:text-7xl transform rotate-3">
          {`\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}`}
        </div>
        <div className="absolute bottom-12 -right-10 text-5xl md:text-7xl transform -rotate-12">
          {`e^{i\\pi} + 1 = 0`}
        </div>
      </div>

      {/* Main Container - Widened for Laptop View & Centered Vertically */}
      <div className="flex flex-col items-center w-full max-w-5xl xl:max-w-6xl mx-auto z-10 relative my-auto">
        
        {/* Top Institutional Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full border border-amber-500/30 bg-[#0c1424]/80 text-[10.5px] sm:text-[11px] font-semibold mb-2 shadow-md backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5B81C] inline-block shadow-[0_0_8px_#F5B81C]" />
          <span className="text-[#F5B81C] tracking-wide">Dr. S. J. Chopra Centre for Learning · UPES</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">LIBRARY & RESEARCH SUPPORT</span>
        </div>

        {/* Title: WORKSHOP ON ADVANCED LATEX */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-serif font-black tracking-wide text-center text-white mb-1.5 leading-tight uppercase">
          <span className="inline-block">WORKSHOP ON</span>{' '}
          <span className="inline-block text-[#F5B81C] tracking-wider drop-shadow-[0_2px_12px_rgba(245,184,28,0.3)]">
            ADVANCED LATEX
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-300 text-xs sm:text-sm md:text-base mb-1.5 text-center font-normal">
          For Research Writing and Publication
        </p>

        {/* Tagline Pill */}
        <div className="px-4 py-1 rounded-full border border-amber-600/30 bg-amber-950/25 mb-3.5 backdrop-blur-sm shadow-inner">
          <p className="italic text-[#F5B81C] font-semibold text-[11px] sm:text-xs tracking-wide">
            “Write Better. Publish Smarter. Impact Greater.”
          </p>
        </div>

        {/* 3 Event Detail Pills - Filling Width Evenly */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-4xl lg:max-w-5xl mb-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-800/90 bg-[#0B1220]/90 shadow-sm">
            <svg className="w-4 h-4 text-[#F5B81C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div className="text-xs leading-tight">
              <div className="text-slate-200 font-medium">9 September 2026,</div>
              <div className="text-slate-400 text-[11px]">Wednesday</div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-800/90 bg-[#0B1220]/90 shadow-sm">
            <svg className="w-4 h-4 text-[#F5B81C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div className="text-xs leading-tight">
              <div className="text-slate-200 font-medium">2:00 PM – 5:30 PM</div>
              <div className="text-slate-400 text-[11px]">IST</div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-800/90 bg-[#0B1220]/90 shadow-sm">
            <svg className="w-4 h-4 text-[#F5B81C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div className="text-xs leading-tight">
              <div className="text-slate-200 font-medium">Trust Boardroom,</div>
              <div className="text-slate-400 text-[11px]">Bidholi Campus</div>
            </div>
          </div>
        </div>

        {/* Main Form Card - Widened to utilize the full laptop canvas */}
        <div className="w-full max-w-4xl lg:max-w-5xl bg-[#0D1526] rounded-2xl border border-slate-800/90 shadow-2xl p-5 sm:p-6 lg:p-7 relative">
          
          {status !== 'success' ? (
            <>
              {/* Card Header Row */}
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                  Download Your Certificate
                </h2>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/40 text-emerald-400 text-[10.5px] font-bold tracking-wider shrink-0">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  OFFICIAL REGISTRY
                </div>
              </div>

              {/* Card Subtitle */}
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                Enter your registered attendee credentials exactly as submitted during the workshop registration to access and authenticate your digital credential.
              </p>

              {/* Form - 3 Columns on Laptop/Desktop for perfect proportion and no wasted space */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-slate-300 text-[11px] font-bold tracking-wider uppercase mb-1">
                      FULL NAME <span className="text-[#F5B81C]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-500 pointer-events-none flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        style={{ paddingLeft: '2.65rem', paddingRight: '0.85rem' }}
                        className="w-full h-11 bg-[#080E1A] border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all font-medium"
                        placeholder="e.g. Priya Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={status === 'loading'}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-slate-300 text-[11px] font-bold tracking-wider uppercase mb-1">
                      INSTITUTIONAL EMAIL <span className="text-[#F5B81C]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-500 pointer-events-none flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        style={{ paddingLeft: '2.65rem', paddingRight: '0.85rem' }}
                        className="w-full h-11 bg-[#080E1A] border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all font-medium"
                        placeholder="e.g. priya@ddn.upes.ac.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={status === 'loading'}
                        required
                      />
                    </div>
                  </div>

                  {/* SAP ID */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-300 text-[11px] font-bold tracking-wider uppercase">
                        SAP ID / STUDENT ID <span className="text-[#F5B81C]">*</span>
                      </label>
                      <span className="text-slate-500 text-[10px] font-mono">9-digit ID</span>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-500 pointer-events-none flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        style={{ paddingLeft: '2.65rem', paddingRight: '0.85rem' }}
                        className="w-full h-11 bg-[#080E1A] border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all font-mono tracking-wider"
                        placeholder="e.g. 500123456"
                        value={sapid}
                        onChange={(e) => setSapid(e.target.value)}
                        disabled={status === 'loading'}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Feedback / Error Message */}
                {message && (
                  <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${status === 'error' ? 'bg-red-950/40 border-red-900/60 text-red-300' : 'bg-slate-800/60 border-slate-700 text-slate-200'}`}>
                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{message}</span>
                  </div>
                )}

                {/* Submit Action - Bold Full Width Bar */}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full h-11 sm:h-12 mt-1 bg-[#F5B81C] hover:bg-[#EAB308] active:bg-[#CA8A04] text-black font-bold text-xs sm:text-sm md:text-base rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(245,184,28,0.25)] hover:shadow-[0_6px_24px_rgba(245,184,28,0.35)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {status === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Verifying Credential...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>Verify & Retrieve Certificate</span>
                      <span className="text-base font-bold ml-0.5">→</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-5">
              <div className="w-12 h-12 bg-emerald-950/50 border-2 border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div className="inline-block px-3 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 text-[10.5px] font-bold tracking-wider mb-1">
                VERIFIED CREDENTIAL
              </div>
              
              <h3 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#F5B81C] font-bold mt-0.5 mb-1.5">
                {verifiedName}
              </h3>
              
              <p className="text-slate-300 text-xs sm:text-sm mb-5 max-w-md mx-auto">
                Your workshop attendance and completion record has been authenticated. Your digital certificate is ready to download.
              </p>

              <button
                className="w-full max-w-md mx-auto h-11 sm:h-12 mb-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs sm:text-sm md:text-base rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(16,185,129,0.3)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                onClick={handleDownload}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>Generating Secure PDF...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    <span>Download Certificate (PDF)</span>
                  </>
                )}
              </button>

              {message && (
                <div className="mb-3 p-2.5 rounded-lg bg-red-950/50 border border-red-900/50 text-red-300 text-xs max-w-md mx-auto">
                  {message}
                </div>
              )}

              <div>
                <button 
                  className="text-slate-400 hover:text-white text-xs transition-colors inline-flex items-center gap-1 mt-1 cursor-pointer" 
                  onClick={handleReset}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Verify another certificate</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-3 text-center text-[10.5px] sm:text-[11px] text-slate-400 space-y-0.5 z-10 relative">
          <div className="font-semibold text-slate-300 tracking-wide">
            Dr. S. J. Chopra Centre for Learning · UPES
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-slate-400">
            <span>Need assistance with your certification?</span>
            <a href="mailto:librarian@ddn.upes.ac.in" className="text-[#F5B81C] hover:underline">
              librarian@ddn.upes.ac.in
            </a>
            <span className="text-slate-600">|</span>
            <span>Workshop Helpdesk</span>
            <span className="text-slate-600">|</span>
            <span>LaTeX Templates Repository</span>
          </div>
          <div className="text-slate-500 text-[9.5px]">
            © 2026 University of Petroleum and Energy Studies (UPES). All rights reserved.
          </div>
        </footer>

      </div>
    </div>
  );
}

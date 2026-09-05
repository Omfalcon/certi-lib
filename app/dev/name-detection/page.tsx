'use client';

/**
 * Debug playground for the OCR name-position detection pipeline.
 * Client-only: no secrets, no DB writes. Upload any PNG/JPEG and inspect
 * OCR lines, ranked gap candidates, and the selected name region.
 *
 * Test scenarios this page is used for:
 *  1. The original certificate template
 *  2. Template with a large blank space
 *  3. Template with no horizontal line under the name area
 *  4. Template with multiple decorative areas
 *  5. Footer/logo plus a blank area elsewhere
 *  6. Long participant name (font-fit behaviour)
 *  7. Same template at a different image resolution
 *  8. Portrait certificate image
 */

import { useEffect, useRef, useState } from 'react';
import { analyzeTemplateImage, OCRError, type OCRProgress } from '@/lib/ocr';
import {
  detectNameRegion,
  scoreGapCandidates,
  LOW_CONFIDENCE_THRESHOLD,
} from '@/lib/namePositionDetector';
import type { OCRLine, NameRegion, GapCandidate } from '@/lib/templateTypes';

type TestStatus = 'idle' | 'analyzing' | 'done' | 'error';

export default function NameDetectionPlaygroundPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<TestStatus>('idle');
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [lines, setLines] = useState<OCRLine[]>([]);
  const [candidates, setCandidates] = useState<GapCandidate[]>([]);
  const [region, setRegion] = useState<NameRegion | null>(null);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string>('');
  const [showLineBoxes, setShowLineBoxes] = useState(true);

  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const runAnalysis = async (file: File) => {
    setStatus('analyzing');
    setError('');
    setProgress({ status: 'Starting OCR engine…', progress: 0 });
    setLines([]);
    setCandidates([]);
    setRegion(null);
    setImageDims(null);

    try {
      const result = await analyzeTemplateImage(file, (p) => setProgress(p));

      const scored = scoreGapCandidates(result.lines, result.imageWidth, result.imageHeight);
      const detected = detectNameRegion(result.lines, result.imageWidth, result.imageHeight);

      setLines(result.lines);
      setCandidates(scored.slice(0, 10));
      setRegion(detected);
      setImageDims({ width: result.imageWidth, height: result.imageHeight });
      setStatus('done');
      setProgress(null);
    } catch (err) {
      const message = err instanceof OCRError ? err.message : 'Unexpected error during analysis.';
      setError(message);
      setStatus('error');
      setProgress(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageUrl(url);

    await runAnalysis(file);
  };

  const centerYNorm = region && imageDims ? region.centerY / imageDims.height : null;
  const lowConfidence = status === 'done' && (!region || (region && region.confidence < LOW_CONFIDENCE_THRESHOLD));

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0b1220',
        color: '#e8eaf0',
        padding: '2rem 1.25rem',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Name-Detection Playground</h1>
        <p style={{ fontSize: '0.85rem', color: '#9aa3b2', marginBottom: '1.5rem' }}>
          Dev-only test page. Upload any PNG/JPEG to run the same OCR + gap-scoring pipeline the admin
          template analysis uses. Nothing is saved or sent to the server.
        </p>

        <div
          style={{
            padding: '1rem',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.03)',
            marginBottom: '1.5rem',
          }}
        >
          <input
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={handleFileChange}
            disabled={status === 'analyzing'}
            style={{ marginBottom: '0.75rem' }}
          />

          {status === 'analyzing' && progress && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  marginBottom: '0.4rem',
                }}
              >
                <span>Running OCR…</span>
                <span style={{ fontFamily: 'monospace' }}>{Math.round((progress.progress ?? 0) * 100)}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, (progress.progress ?? 0) * 100))}%`,
                    height: '100%',
                    background: '#d4af37',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: '#9aa3b2', fontFamily: 'monospace' }}>
                {progress.status}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.6rem 0.85rem',
                background: 'rgba(220,60,60,0.12)',
                border: '1px solid rgba(220,60,60,0.4)',
                borderRadius: '4px',
                fontSize: '0.8rem',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {status === 'done' && imageDims && (
          <>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                fontFamily: 'monospace',
                color: '#9aa3b2',
              }}
            >
              <span>
                image: {imageDims.width}×{imageDims.height}px
              </span>
              <span>OCR lines: {lines.length}</span>
              <span>gap candidates: {candidates.length}</span>
              {centerYNorm != null && <span>selected centerY: {(centerYNorm * 100).toFixed(1)}%</span>}
              {region && <span>confidence: {Math.round(region.confidence * 100)}%</span>}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={showLineBoxes} onChange={(e) => setShowLineBoxes(e.target.checked)} />
                show OCR line boxes
              </label>
            </div>

            {lowConfidence && (
              <div
                style={{
                  padding: '0.6rem 0.85rem',
                  marginBottom: '1rem',
                  background: 'rgba(220,60,60,0.12)',
                  border: '1px solid rgba(220,60,60,0.4)',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                }}
              >
                No confident gap found (threshold {Math.round(LOW_CONFIDENCE_THRESHOLD * 100)}%). The admin flow would
                fall back to manual placement for this image.
              </div>
            )}

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Image with overlays */}
              {imageUrl && (
                <div style={{ flex: '2 1 480px', minWidth: '320px' }}>
                  <div style={{ position: 'relative', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Uploaded template" style={{ width: '100%', display: 'block' }} />

                    {showLineBoxes &&
                      lines.map((l, i) => (
                        <div
                          key={`line-${i}`}
                          title={`${l.text} (${l.confidence}%)`}
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            left: `${(l.x / imageDims.width) * 100}%`,
                            top: `${(l.y / imageDims.height) * 100}%`,
                            width: `${(l.width / imageDims.width) * 100}%`,
                            height: `${(l.height / imageDims.height) * 100}%`,
                            border: '1px solid #4ade80',
                            background: 'rgba(74,222,128,0.12)',
                          }}
                        />
                      ))}

                    {region && (
                      <>
                        <div
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            left: `${(region.x / imageDims.width) * 100}%`,
                            top: `${(region.y / imageDims.height) * 100}%`,
                            width: `${(region.width / imageDims.width) * 100}%`,
                            height: `${(region.height / imageDims.height) * 100}%`,
                            border: '2px solid #38bdf8',
                            background: 'rgba(56,189,248,0.12)',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            left: `${(region.centerX / imageDims.width) * 100}%`,
                            top: `${(region.centerY / imageDims.height) * 100}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <div style={{ position: 'absolute', width: '2px', height: '28px', background: '#38bdf8', left: '-1px', top: '-14px' }} />
                          <div style={{ position: 'absolute', width: '28px', height: '2px', background: '#38bdf8', left: '-14px', top: '-1px' }} />
                          <div style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', left: '-3px', top: '-3px' }} />
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9aa3b2', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                    green = OCR lines · blue = selected name region
                  </div>
                </div>
              )}

              {/* Details panel */}
              <div style={{ flex: '1 1 340px', minWidth: '300px', fontSize: '0.8rem' }}>
                <div
                  style={{
                    padding: '0.9rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                  }}
                >
                  <div className="section-title" style={{ fontSize: '0.8rem' }}>
                    Gap candidates (ranked)
                  </div>
                  {candidates.length === 0 ? (
                    <p style={{ color: '#9aa3b2', marginTop: '0.5rem' }}>No valid gaps found.</p>
                  ) : (
                    <ol style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.9 }}>
                      {candidates.map((c, i) => (
                        <li key={i}>
                          score {c.score.toFixed(3)} · gap {((c.gapHeight / imageDims.height) * 100).toFixed(1)}% H · gap{' '}
                          {c.scores.gap.toFixed(2)} · align {c.scores.alignment.toFixed(2)} · pos{' '}
                          {c.scores.position.toFixed(2)} · conf {c.scores.confidence.toFixed(2)}
                          <div style={{ color: '#9aa3b2' }}>
                            ↑ &quot;{c.upperLine.text.slice(0, 30)}&quot; ↓ &quot;{c.lowerLine.text.slice(0, 30)}&quot;
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <div
                  style={{
                    padding: '0.9rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                  }}
                >
                  <div className="section-title" style={{ fontSize: '0.8rem' }}>
                    OCR lines (y-sorted)
                  </div>
                  <table style={{ width: '100%', marginTop: '0.5rem', borderCollapse: 'collapse', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ color: '#9aa3b2', textAlign: 'left' }}>
                        <th style={{ padding: '0.2rem 0.4rem' }}>text</th>
                        <th style={{ padding: '0.2rem 0.4rem' }}>conf</th>
                        <th style={{ padding: '0.2rem 0.4rem' }}>y%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <td style={{ padding: '0.2rem 0.4rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {l.text || '—'}
                          </td>
                          <td style={{ padding: '0.2rem 0.4rem', color: l.confidence >= 40 ? '#4ade80' : '#f87171' }}>
                            {l.confidence}
                          </td>
                          <td style={{ padding: '0.2rem 0.4rem' }}>
                            {((l.y / imageDims.height) * 100).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

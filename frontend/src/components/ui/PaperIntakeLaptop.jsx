import React from 'react';
import { Box } from '@mui/material';

/**
 * PaperIntakeLaptop — brand animation for the login page.
 *
 * Question papers, answer sheets (OMR), files and excel sheets fly in from
 * the edges and get "sucked into" a laptop, whose screen glows and shows the
 * SL EXAMS wordmark. Pure CSS keyframes (GPU transforms only) on a 6s loop;
 * honours prefers-reduced-motion by showing just the laptop.
 */

const DOCS = [
  // label, accent, start offset (x,y in px), rotation, delay (s)
  { label: 'Q-PAPER', color: '#60a5fa', x: -190, y: -120, rot: -18, delay: 0.0 },
  { label: 'OMR',     color: '#34d399', x: 195,  y: -95,  rot: 14,  delay: 0.9 },
  { label: '.XLSX',   color: '#4ade80', x: -205, y: 40,   rot: -10, delay: 1.8 },
  { label: '.CSV',    color: '#fbbf24', x: 205,  y: 55,   rot: 12,  delay: 2.7 },
  { label: 'MARKS',   color: '#f472b6', x: -120, y: -175, rot: 8,   delay: 3.6 },
  { label: 'RESULT',  color: '#f68914', x: 130,  y: -165, rot: -12, delay: 4.5 },
];

export default function PaperIntakeLaptop({ scale = 1 }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        width: 340 * scale,
        height: 290 * scale,
        mx: 'auto',
        userSelect: 'none',
        pointerEvents: 'none',

        '--dur': '6s',

        /* ── flying documents ── */
        '& .pil-doc': {
          position: 'absolute',
          top: '38%', left: '50%',
          width: 74 * scale, height: 92 * scale,
          borderRadius: '8px',
          background: 'linear-gradient(180deg, #f8fafc, #e2e8f0)',
          border: '1px solid rgba(255,255,255,0.65)',
          boxShadow: '0 10px 24px rgba(2,6,23,0.45)',
          display: 'flex', flexDirection: 'column',
          padding: `${10 * scale}px ${8 * scale}px`,
          gap: `${5 * scale}px`,
          opacity: 0,
          animation: 'pilSuck var(--dur) cubic-bezier(.45,.05,.55,.95) infinite',
        },
        // text lines on each paper
        '& .pil-doc i': {
          display: 'block', height: 3 * scale, borderRadius: 2,
          background: 'rgba(15,23,42,0.18)',
        },
        '& .pil-doc i:nth-of-type(2)': { width: '72%' },
        '& .pil-doc i:nth-of-type(3)': { width: '85%' },
        '& .pil-doc i:nth-of-type(4)': { width: '58%' },
        '& .pil-doc em': {
          marginTop: 'auto', fontStyle: 'normal', fontWeight: 800,
          fontSize: 9 * scale, letterSpacing: '0.08em',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: '#0f172a',
          padding: `${2 * scale}px ${5 * scale}px`,
          borderRadius: 4, alignSelf: 'flex-start',
        },

        '@keyframes pilSuck': {
          '0%':   { opacity: 0, transform: 'translate(-50%,-50%) translate(var(--sx),var(--sy)) rotate(var(--rot)) scale(1)' },
          '8%':   { opacity: 1 },
          '38%':  { opacity: 1, transform: 'translate(-50%,-50%) translate(calc(var(--sx)*0.25),calc(var(--sy)*0.25)) rotate(calc(var(--rot)*0.4)) scale(0.8)' },
          '52%':  { opacity: 0, transform: 'translate(-50%,-50%) translate(0px,0px) rotate(0deg) scale(0.06)' },
          '100%': { opacity: 0, transform: 'translate(-50%,-50%) translate(0px,0px) rotate(0deg) scale(0.06)' },
        },

        /* ── laptop ── */
        '& .pil-screen': {
          position: 'absolute', left: '50%', top: '14%', transform: 'translateX(-50%)',
          width: 250 * scale, height: 158 * scale,
          borderRadius: `${12 * scale}px ${12 * scale}px 4px 4px`,
          background: '#ffffff',
          border: '3px solid #232c4d',
          boxShadow: '0 24px 60px rgba(2,6,23,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          animation: 'pilGlow var(--dur) ease-in-out infinite',
        },
        '@keyframes pilGlow': {
          '0%, 35%':  { boxShadow: '0 24px 60px rgba(2,6,23,0.6)' },
          '50%, 62%': { boxShadow: '0 24px 60px rgba(2,6,23,0.6), 0 0 46px rgba(246,137,20,0.4), inset 0 0 30px rgba(246,137,20,0.08)' },
          '85%, 100%': { boxShadow: '0 24px 60px rgba(2,6,23,0.6)' },
        },
        // Full-screen logo on a white display (no wordmark text)
        '& .pil-logo': {
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pilLogoPop var(--dur) ease-in-out infinite',
        },
        '& .pil-logo img': {
          height: '100%', width: 'auto', display: 'block',
        },
        '@keyframes pilLogoPop': {
          '0%, 38%':  { transform: 'scale(0.96)', opacity: 0.9 },
          '52%, 66%': { transform: 'scale(1.04)', opacity: 1 },
          '90%, 100%': { transform: 'scale(0.96)', opacity: 0.9 },
        },
        // camera dot (subtle on the white display)
        '& .pil-cam': {
          position: 'absolute', top: 5 * scale, left: '50%', transform: 'translateX(-50%)',
          width: 5 * scale, height: 5 * scale, borderRadius: '50%', background: '#c7cede',
          zIndex: 1,
        },
        '& .pil-base': {
          position: 'absolute', left: '50%', top: `calc(14% + ${158 * scale}px)`,
          transform: 'translateX(-50%)',
          width: 300 * scale, height: 12 * scale,
          borderRadius: `0 0 ${14 * scale}px ${14 * scale}px`,
          background: 'linear-gradient(180deg, #2a3459, #1a2240)',
          boxShadow: '0 16px 30px rgba(2,6,23,0.5)',
        },
        '& .pil-base::after': {
          content: '""', position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
          width: 56 * scale, height: 5 * scale, borderRadius: '0 0 8px 8px',
          background: '#101835',
        },

        /* intake glow at the screen mouth */
        '& .pil-vortex': {
          position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%,-50%)',
          width: 90 * scale, height: 90 * scale, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(246,137,20,0.28), transparent 65%)',
          filter: 'blur(6px)',
          animation: 'pilVortex var(--dur) ease-in-out infinite',
        },
        '@keyframes pilVortex': {
          '0%, 20%':  { opacity: 0.25, transform: 'translate(-50%,-50%) scale(0.8)' },
          '40%, 50%': { opacity: 0.9, transform: 'translate(-50%,-50%) scale(1.25)' },
          '70%, 100%': { opacity: 0.25, transform: 'translate(-50%,-50%) scale(0.8)' },
        },

        /* accessibility: static laptop only */
        '@media (prefers-reduced-motion: reduce)': {
          '& .pil-doc, & .pil-vortex': { display: 'none' },
          '& .pil-screen, & .pil-logo': { animation: 'none' },
        },
      }}
    >
      {/* laptop — logo fills the white display */}
      <Box className="pil-screen">
        <Box className="pil-cam" />
        <Box className="pil-logo">
          <img src="/logo-mark.png" alt="" />
        </Box>
      </Box>
      <Box className="pil-base" />
      <Box className="pil-vortex" />

      {/* flying papers */}
      {DOCS.map((d) => (
        <Box
          key={d.label}
          className="pil-doc"
          style={{
            '--sx': `${d.x * scale}px`,
            '--sy': `${d.y * scale}px`,
            '--rot': `${d.rot}deg`,
            animationDelay: `${d.delay}s`,
          }}
        >
          <i /><i /><i /><i />
          <em style={{ background: `${d.color}33`, color: '#0f172a', border: `1px solid ${d.color}66` }}>
            {d.label}
          </em>
        </Box>
      ))}
    </Box>
  );
}

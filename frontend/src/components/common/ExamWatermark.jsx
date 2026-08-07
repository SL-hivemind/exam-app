import React, { useMemo } from 'react';
import { Box } from '@mui/material';

const xmlEscape = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * A tiled, diagonal "SLPL + student ID" watermark for the exam screens.
 *
 * Drawn as a repeating SVG background rather than hundreds of DOM nodes, so it
 * costs nothing to repaint while the timer ticks and the student scrolls. It is
 * aria-hidden and pointerEvents:none — purely decorative/deterrent, never in the
 * way of a click or a screen reader.
 *
 * Renders position:fixed so it covers the viewport even when a mobile browser
 * toolbar makes 100vh taller than what is actually on screen. It sits at
 * zIndex 0, so whatever it sits behind must be raised (position:relative +
 * zIndex >= 1) or the watermark will paint on top of it.
 *
 * Fonts inside an SVG data URI cannot use the app's webfont — only fonts the OS
 * already has resolve — hence the system stack below.
 */
export default function ExamWatermark({
  label,
  brand = 'SLPL',
  opacity = 0.055,
  tileWidth = 260,
  tileHeight = 150,
  sx = {},
}) {
  const backgroundImage = useMemo(() => {
    const line1 = xmlEscape(brand);
    const line2 = xmlEscape((label || '').slice(0, 28)).trim();
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}">` +
      `<g transform="translate(28 ${tileHeight - 34}) rotate(-24)" fill="#ffffff" ` +
      `font-family="Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif">` +
      `<text x="0" y="0" font-size="17" font-weight="700" letter-spacing="3.5" fill-opacity="${opacity}">${line1}</text>` +
      (line2
        ? `<text x="0" y="21" font-size="11.5" font-weight="600" letter-spacing="1.6" fill-opacity="${opacity * 0.85}">${line2}</text>`
        : '') +
      `</g></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, [brand, label, opacity, tileWidth, tileHeight]);

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        userSelect: 'none',
        backgroundImage,
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center',
        ...sx,
      }}
    />
  );
}

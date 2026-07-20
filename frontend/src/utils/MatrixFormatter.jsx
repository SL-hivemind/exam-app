import React from 'react';
import { Box } from '@mui/material';

/**
 * MatrixFormatter (Enhanced with Math Expression Support)
 *
 * Parses text and dynamically renders:
 * - Inline matrices:    [[a,b],[c,d]]
 * - Superscripts/powers: x^2, x^{2n+1}
 * - Subscripts:          H_2, x_{ij}
 * - Square roots:        sqrt(x+1), sqrt{x+1}
 *
 * Works with CSV uploads, copy-paste, and smart-paste inputs.
 * Leaves normal text untouched.
 */

/* ------------------------------------------------------------------ */
/*  Step A – Process math notation (powers, subscripts, roots)        */
/* ------------------------------------------------------------------ */
function processMathExpressions(text, keyPrefix = 'm') {
  if (!text || typeof text !== 'string') return text;

  // Combined regex – order matters:
  // 1  sqrt{…} or sqrt(…)
  // 2  ^{multi-char}   (after alnum / ) / ] / })
  // 3  ^single-char    (after alnum / ) / ] / })
  // 4  _{multi-char}   (after alnum / ) / ] / })
  // 5  _single-char    (after alnum / ) / ] / })
  const mathRegex =
    /sqrt[{(]([^})]+)[})]|(?<=[a-zA-Z0-9)\]}])\^{([^}]+)}|(?<=[a-zA-Z0-9)\]}])\^([a-zA-Z0-9])|(?<=[a-zA-Z0-9)\]}])_{([^}]+)}|(?<=[a-zA-Z0-9)\]}])_([a-zA-Z0-9])/g;

  const parts = [];
  let lastIndex = 0;
  let match;
  let hasMatch = false;

  while ((match = mathRegex.exec(text)) !== null) {
    hasMatch = true;

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const key = `${keyPrefix}-${match.index}`;

    if (match[1] !== undefined) {
      /* sqrt(…) / sqrt{…} */
      parts.push(
        <span
          key={key}
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            verticalAlign: 'baseline',
          }}
        >
          <span style={{ fontSize: '1.15em', marginRight: 1 }}>√</span>
          <span
            style={{
              borderTop: '1.5px solid currentColor',
              paddingLeft: 2,
              paddingRight: 2,
              paddingTop: 1,
            }}
          >
            {processMathExpressions(match[1], `${key}r`)}
          </span>
        </span>
      );
    } else if (match[2] !== undefined) {
      /* ^{multi-char superscript} */
      parts.push(
        <sup key={key} style={{ fontSize: '0.75em' }}>
          {processMathExpressions(match[2], `${key}s`)}
        </sup>
      );
    } else if (match[3] !== undefined) {
      /* ^single superscript */
      parts.push(
        <sup key={key} style={{ fontSize: '0.75em' }}>
          {match[3]}
        </sup>
      );
    } else if (match[4] !== undefined) {
      /* _{multi-char subscript} */
      parts.push(
        <sub key={key} style={{ fontSize: '0.75em' }}>
          {processMathExpressions(match[4], `${key}b`)}
        </sub>
      );
    } else if (match[5] !== undefined) {
      /* _single subscript */
      parts.push(
        <sub key={key} style={{ fontSize: '0.75em' }}>
          {match[5]}
        </sub>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (!hasMatch) return text;

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/* ------------------------------------------------------------------ */
/*  Step B – Main component: matrices first, then math expressions    */
/* ------------------------------------------------------------------ */
export default function MatrixFormatter({ text }) {
  if (!text || typeof text !== 'string') return text;

  // Match the pattern [[…]]
  const regex = /\[\[(.*?)\]\]/g;
  const parts = [];
  let lastIndex = 0;

  text.replace(regex, (match, inner, offset) => {
    // Push preceding text – run math processing on it
    const preceding = text.slice(lastIndex, offset);
    if (preceding) {
      const processed = processMathExpressions(preceding, `p${offset}`);
      if (Array.isArray(processed)) {
        parts.push(...processed);
      } else if (processed) {
        parts.push(processed);
      }
    }
    lastIndex = offset + match.length;

    try {
      // Parse the inner contents into a grid.
      // Example inner: "1,2],[3,4"
      // Split by "],[" to get rows, then by "," to get cells.
      const rowStrings = inner.split('],[');
      const matrixData = rowStrings.map(row => 
        row.replace(/^\[|\]$/g, '').split(',').map(cell => cell.trim())
      );

      // Render the CSS Grid Matrix
      parts.push(
        <Box 
          key={offset} 
          component="span" 
          sx={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            verticalAlign: 'middle',
            mx: 0.5,
            borderLeft: '2px solid rgba(255,255,255,0.7)',
            borderRight: '2px solid rgba(255,255,255,0.7)',
            borderRadius: '4px',
            px: 0.5,
            py: 0.2,
            backgroundColor: 'rgba(0,0,0,0.1)'
          }}
        >
          {matrixData.map((row, i) => (
            <Box 
              component="span" 
              key={i} 
              sx={{ 
                display: 'flex', 
                gap: 2, 
                mb: i === matrixData.length - 1 ? 0 : 0.5 
              }}
            >
              {row.map((cell, j) => (
                <Box 
                  component="span" 
                  key={j} 
                  sx={{ 
                    minWidth: '1.2rem', 
                    textAlign: 'center', 
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    fontSize: '0.95em'
                  }}
                >
                  {cell}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      );
    } catch (e) {
      // If parsing fails for some reason, just render the original string
      parts.push(match);
    }
  });

  // Push any remaining text after the last match – with math processing
  const remaining = text.slice(lastIndex);
  if (remaining) {
    const processed = processMathExpressions(remaining, `r${lastIndex}`);
    if (Array.isArray(processed)) {
      parts.push(...processed);
    } else if (processed) {
      parts.push(processed);
    }
  }

  // If no special formatting was found, just return the plain string
  if (parts.length === 0) return text;
  if (parts.length === 1 && typeof parts[0] === 'string') return text;

  // Otherwise, return a React fragment mapping the parts
  return (
    <React.Fragment>
      {parts.map((part, index) => (
        <React.Fragment key={index}>{part}</React.Fragment>
      ))}
    </React.Fragment>
  );
}

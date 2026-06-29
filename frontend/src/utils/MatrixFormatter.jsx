import React from 'react';
import { Box } from '@mui/material';

/**
 * MatrixFormatter
 * Parses text and dynamically renders inline matrices formatted as [[a,b],[c,d]].
 * Leaves normal text untouched.
 */
export default function MatrixFormatter({ text }) {
  if (!text || typeof text !== 'string') return text;

  // Match the pattern [[...]]
  // We use a non-greedy match to grab individual matrices.
  const regex = /\[\[(.*?)\]\]/g;
  const parts = [];
  let lastIndex = 0;

  text.replace(regex, (match, inner, offset) => {
    // Push the preceding text
    parts.push(text.slice(lastIndex, offset));
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

  // Push any remaining text after the last match
  parts.push(text.slice(lastIndex));

  // If no matrices were found, just return the plain string
  if (parts.length === 1 && typeof parts[0] === 'string') {
    return text;
  }

  // Otherwise, return a React fragment mapping the parts
  return (
    <React.Fragment>
      {parts.map((part, index) => (
        <React.Fragment key={index}>{part}</React.Fragment>
      ))}
    </React.Fragment>
  );
}

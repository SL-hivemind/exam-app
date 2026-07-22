import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";

import { g, fluidCell } from "./gameTheme";
import { gridlockValues } from "./gameRules";

/**
 * Gridlock — fill the blanks so every row and column hits its target.
 *
 * Given cells are fixed and rendered flat; blanks are single-digit inputs.
 * Row and column totals are recomputed on every keystroke so a student can
 * see a line go green the moment it balances, which is the whole feedback
 * loop of the puzzle. Nothing here decides correctness — a row can hit its
 * target with the wrong digits, and only the server's stored solution says
 * whether the grid is right.
 *
 * Sizing is fluid rather than stepped at a breakpoint: a 6x6 grid plus its
 * target column is seven columns wide, which no fixed cell size fits on a
 * 360px phone. `fluidCell` divides the available width instead.
 */

const opLabel = (op) => (op === "product" ? "×" : "+");

function targetTone(actual, target, complete) {
  if (!complete) return { color: g.textSoft, bg: g.surfaceRaised };
  return actual === target
    ? { color: g.success, bg: g.successTint }
    : { color: g.danger, bg: g.dangerTint };
}

export default function GridlockBoard({ payload, state, onChange, disabled }) {
  const { size, grid, row_targets: rowTargets, col_targets: colTargets, col_ops: colOps } = payload;

  const values = useMemo(() => gridlockValues(payload, state), [payload, state]);

  const setCell = (r, c, raw) => {
    if (disabled) return;
    const digit = raw.replace(/[^1-9]/g, "").slice(-1);
    const next = values.map((row) => row.slice());
    next[r][c] = digit ? Number(digit) : null;
    onChange({ grid: next });
  };

  const lineTotal = (cells, op) => {
    if (cells.some((v) => v == null)) return null;
    return op === "product"
      ? cells.reduce((a, b) => a * b, 1)
      : cells.reduce((a, b) => a + b, 0);
  };

  // size + 1 columns: the row-target column counts too.
  const cell = fluidCell(size + 1, 56);
  const digitSize = `clamp(15px, ${Math.round(90 / (size + 1))}px, 20px)`;

  const Cellbox = ({ children, sx, ...rest }) => (
    <Box
      sx={{
        width: cell, height: cell, minWidth: 0, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 1.5, fontWeight: 700, fontSize: digitSize, ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );

  return (
    <Box
      sx={{
        display: "inline-block", mx: "auto", p: { xs: 1, sm: 1.5 },
        borderRadius: 3, bgcolor: g.surfaceSunken,
        border: `1px solid ${g.border}`, maxWidth: "100%",
      }}
      role="group"
      aria-label="Gridlock puzzle grid"
    >
      {/* Column targets */}
      <Box sx={{ display: "flex", gap: 0.75, mb: 0.75 }}>
        <Box sx={{ width: cell, flexShrink: 0 }} />
        {colTargets.map((target, c) => {
          const column = values.map((row) => row[c]);
          const actual = lineTotal(column, colOps[c]);
          const tone = targetTone(actual, target, actual !== null);
          return (
            <Cellbox
              key={c}
              sx={{ bgcolor: tone.bg, color: tone.color, flexDirection: "column", gap: 0 }}
              aria-label={`Column ${c + 1} target ${target} by ${colOps[c] === "product" ? "multiplication" : "addition"}`}
            >
              <Typography component="span" sx={{ fontSize: "clamp(11px, 3vw, 14px)", fontWeight: 800, lineHeight: 1, color: "inherit" }}>
                {target}
              </Typography>
              <Typography component="span" sx={{ fontSize: 10, lineHeight: 1, opacity: 0.75, color: "inherit" }}>
                {opLabel(colOps[c])}
              </Typography>
            </Cellbox>
          );
        })}
      </Box>

      {values.map((row, r) => {
        const actual = lineTotal(row, "sum");
        const tone = targetTone(actual, rowTargets[r], actual !== null);
        return (
          <Box key={r} sx={{ display: "flex", gap: 0.75, mb: 0.75 }}>
            <Cellbox
              sx={{ bgcolor: tone.bg, color: tone.color, fontSize: "clamp(12px, 3.2vw, 15px)" }}
              aria-label={`Row ${r + 1} target ${rowTargets[r]}`}
            >
              {rowTargets[r]}
            </Cellbox>
            {row.map((value, c) => {
              const given = grid[r][c] !== null;
              return given ? (
                <Cellbox key={c} sx={{ bgcolor: g.surfaceRaised, color: g.text }}>
                  {value}
                </Cellbox>
              ) : (
                <Box
                  key={c}
                  component="input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={`Row ${r + 1}, column ${c + 1}`}
                  value={value ?? ""}
                  disabled={disabled}
                  onChange={(e) => setCell(r, c, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  sx={{
                    width: cell, height: cell, minWidth: 0, flexShrink: 0,
                    textAlign: "center", fontSize: digitSize, fontWeight: 800,
                    border: `2px solid ${g.borderStrong}`, borderRadius: 1.5,
                    bgcolor: "rgba(255,255,255,0.06)", color: g.accent,
                    outline: "none", fontFamily: "inherit",
                    "&:focus": { borderColor: g.accent, bgcolor: g.accentTint },
                    "&:focus-visible": { outline: `2px solid ${g.accent}`, outlineOffset: 2 },
                    "&:disabled": { color: g.text, opacity: 1, WebkitTextFillColor: g.text },
                  }}
                />
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}

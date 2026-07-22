import React, { useMemo, useState } from "react";
import { Box, Chip, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";

import { g, TOUCH } from "./gameTheme";

/**
 * Splice — rebuild four syllabus words from eight shuffled fragments.
 *
 * Placement supports drag *and* tap-to-select. The tap path is
 * not a nicety: HTML5 drag events are unreliable on the Android tablets and
 * budget phones a lot of these students are on, and without it the puzzle is
 * simply unplayable for them.
 *
 * Slots advertise a length, a part count and a subject, which is what makes
 * the puzzle solvable by reasoning rather than by trying all permutations.
 */

export default function SpliceBoard({ payload, state, onChange, disabled }) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const { fragments, slots } = payload;
  const [selected, setSelected] = useState(null);

  const placed = useMemo(() => {
    const saved = state?.slots;
    if (Array.isArray(saved) && saved.length === slots.length) return saved;
    return slots.map(() => []);
  }, [state, slots]);

  const used = useMemo(() => new Set(placed.flat()), [placed]);
  const unplaced = fragments.filter((f) => !used.has(f));

  const emit = (next) => {
    // `words` is what the server grades and hints against; `slots` exists so
    // a half-finished board survives a reload.
    const words = next.map((parts) => parts.join("")).filter(Boolean);
    onChange({ slots: next, words });
  };

  const place = (fragment, slotIndex) => {
    if (disabled || !fragment) return;
    const next = placed.map((parts) => parts.filter((p) => p !== fragment));
    if (next[slotIndex].length < slots[slotIndex].parts) {
      next[slotIndex] = [...next[slotIndex], fragment];
    }
    setSelected(null);
    emit(next);
  };

  const pullBack = (fragment) => {
    if (disabled) return;
    emit(placed.map((parts) => parts.filter((p) => p !== fragment)));
  };

  const chipSx = (active) => ({
    fontWeight: 800,
    letterSpacing: 0.5,
    fontSize: isSmall ? 14 : 16,
    height: isSmall ? 38 : TOUCH,
    px: 0.5,
    cursor: disabled ? "default" : "pointer",
    bgcolor: active ? g.accent : g.surfaceRaised,
    color: active ? "#1a1206" : g.text,
    border: "2px solid",
    borderColor: active ? g.accent : g.borderStrong,
    "& .MuiChip-label": { color: "inherit" },
    "&:hover": { bgcolor: active ? g.accent : "rgba(255,255,255,0.13)", borderColor: g.accent },
    "&:focus-visible": { outline: `2px solid ${g.accent}`, outlineOffset: 2 },
  });

  return (
    <Box sx={{ width: "100%" }}>
      {/* Fragment pool */}
      <Box
        role="group"
        aria-label="Word fragments. Select one, then choose a slot."
        sx={{
          p: 1.5, mb: 2, borderRadius: 3,
          bgcolor: g.surfaceSunken, border: `1px solid ${g.border}`,
          minHeight: isSmall ? 64 : 74,
          display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", alignItems: "center",
        }}
      >
        {unplaced.length === 0 ? (
          <Typography variant="body2" sx={{ color: g.textSoft }}>
            All fragments placed — check your words below.
          </Typography>
        ) : (
          unplaced.map((fragment) => (
            <Chip
              key={fragment}
              label={fragment}
              clickable={!disabled}
              draggable={!disabled}
              aria-pressed={selected === fragment}
              onDragStart={(e) => e.dataTransfer.setData("text/plain", fragment)}
              onClick={() => !disabled && setSelected(selected === fragment ? null : fragment)}
              sx={chipSx(selected === fragment)}
            />
          ))
        )}
      </Box>

      {/* Word slots */}
      <Stack spacing={1.25}>
        {slots.map((slot, i) => {
          const parts = placed[i] || [];
          const assembled = parts.join("");
          const full = parts.length === slot.parts && assembled.length === slot.length;

          return (
            <Box
              key={i}
              onClick={() => selected && place(selected, i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fragment = e.dataTransfer.getData("text/plain");
                if (fragment) place(fragment, i);
              }}
              sx={{
                p: 1.25, borderRadius: 2.5,
                border: "2px dashed",
                borderColor: full ? g.success : selected ? g.accent : g.border,
                bgcolor: full ? g.successTint : g.surface,
                cursor: selected && !disabled ? "pointer" : "default",
                transition: "border-color .15s, background-color .15s",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography
                  variant="caption"
                  sx={{ minWidth: 92, color: g.textSoft, fontWeight: 700 }}
                >
                  {slot.category} · {slot.length}
                </Typography>

                {parts.map((fragment) => (
                  <Chip
                    key={fragment}
                    label={fragment}
                    clickable={!disabled}
                    aria-label={`Remove ${fragment}`}
                    onClick={(e) => { e.stopPropagation(); pullBack(fragment); }}
                    sx={{
                      ...chipSx(false),
                      bgcolor: g.infoTint,
                      color: g.text,
                      borderColor: "rgba(96,165,250,0.45)",
                    }}
                  />
                ))}

                {Array.from({ length: Math.max(0, slot.parts - parts.length) }).map((_, k) => (
                  <Box
                    key={`gap-${k}`}
                    sx={{
                      width: isSmall ? 52 : 64, height: isSmall ? 36 : 40,
                      borderRadius: 2, bgcolor: "rgba(255,255,255,0.04)",
                      border: `1px dashed ${g.border}`,
                    }}
                  />
                ))}

                {full && (
                  <Typography sx={{ ml: "auto", fontWeight: 800, color: g.success, letterSpacing: 0.5 }}>
                    {assembled}
                  </Typography>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {selected && (
        <Typography
          variant="caption"
          aria-live="polite"
          sx={{ display: "block", mt: 1.5, textAlign: "center", color: g.accent }}
        >
          Now tap a word slot to drop <b>{selected}</b> into it.
        </Typography>
      )}
    </Box>
  );
}

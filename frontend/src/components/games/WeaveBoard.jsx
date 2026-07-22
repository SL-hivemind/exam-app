import React, { useEffect, useMemo, useRef } from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

import { g, fluidCell } from "./gameTheme";
import { matchedCells, rotateMask, weaveRotations } from "./gameRules";

/**
 * Weave — tap a tile to turn it a quarter turn; join every tile into one network.
 *
 * Tiles are drawn once from their base mask and then rotated with a CSS
 * transform rather than by redrawing the paths. That keeps the SVG static,
 * lets framer-motion animate the turn for free, and means the only state the
 * board owns is an array of quarter-turn counts — exactly what the server
 * grades.
 *
 * The connected/unconnected colouring is computed here purely for feedback.
 * It is never trusted: the server re-derives the whole network on submit.
 *
 * Each tile is a real <button>, not a clickable div, so the puzzle is playable
 * with a keyboard and announced by a screen reader.
 */

const UP = 1, RIGHT = 2, DOWN = 4, LEFT = 8;

// Re-exported for the callers that imported it from here before the rules
// moved into gameRules.js.
export { rotateMask };

function Tile({ mask, connected }) {
  // Only the base mask is drawn; the parent applies the rotation.
  const arms = [
    [UP, 50, 50, 50, 0],
    [RIGHT, 50, 50, 100, 50],
    [DOWN, 50, 50, 50, 100],
    [LEFT, 50, 50, 0, 50],
  ].filter(([dir]) => mask & dir);

  const stroke = connected ? g.success : g.textMuted;
  const isEndpoint = arms.length === 1;

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      {arms.map(([dir, x1, y1, x2, y2]) => (
        <line
          key={dir}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={stroke} strokeWidth={14} strokeLinecap="round"
        />
      ))}
      <circle
        cx={50} cy={50} r={isEndpoint ? 17 : 10}
        fill={isEndpoint ? stroke : "#0b1130"}
        stroke={stroke}
        strokeWidth={isEndpoint ? 0 : 6}
      />
    </svg>
  );
}

export default function WeaveBoard({ payload, state, onChange, disabled }) {
  const { size, tiles } = payload;

  const rotations = useMemo(() => weaveRotations(payload, state), [payload, state]);

  const effective = useMemo(
    () => tiles.map((mask, i) => rotateMask(mask, rotations[i])),
    [tiles, rotations]
  );
  const matched = useMemo(() => matchedCells(size, effective), [size, effective]);

  // Taps are counted against a ref, not against the last rendered props.
  // A tile animates its turn, so two quick taps can both run before React has
  // re-rendered with the first one's result — read from props and the second
  // tap overwrites the first, losing a quarter turn the player made.
  const latest = useRef(rotations);
  useEffect(() => { latest.current = rotations; }, [rotations]);

  const turn = (index) => {
    if (disabled) return;
    const next = latest.current.slice();
    next[index] = (next[index] + 1) % 4;
    latest.current = next;
    onChange({ rotations: next });
  };

  const cell = fluidCell(size, 74, 80);

  return (
    <Box
      role="group"
      aria-label="Weave puzzle. Activate a tile to turn it a quarter turn."
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${size}, ${cell})`,
        gap: 0,
        justifyContent: "center",
        mx: "auto",
        p: { xs: 1, sm: 1.5 },
        borderRadius: 3,
        bgcolor: g.surfaceSunken,
        border: `1px solid ${g.border}`,
        width: "fit-content",
        maxWidth: "100%",
      }}
    >
      {tiles.map((mask, i) => (
        <motion.button
          key={i}
          type="button"
          onClick={() => turn(i)}
          disabled={disabled}
          aria-label={`Tile row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}. ${matched[i] ? "Connected" : "Not connected"}.`}
          animate={{ rotate: rotations[i] * 90 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          style={{
            width: cell,
            height: cell,
            cursor: disabled ? "default" : "pointer",
            padding: 2,
            background: "transparent",
            border: "none",
            borderRadius: 10,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Tile mask={mask} connected={matched[i]} />
        </motion.button>
      ))}
    </Box>
  );
}

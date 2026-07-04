import React, { useRef } from 'react';
import { Box } from '@mui/material';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Frosted-glass surface with optional 3D pointer-tilt, hover lift + glow, and a
 * one-shot sheen sweep. The base building block of the Aurora Glass UI.
 *
 * <GlassCard interactive tilt glow="indigo" onClick={...}>...</GlassCard>
 */
const GLOWS = {
  indigo: '0 20px 50px rgba(91,108,255,0.30)',
  blue: '0 20px 50px rgba(47,107,255,0.32)',
  orange: '0 20px 50px rgba(246,137,20,0.34)',
  purple: '0 20px 50px rgba(246,137,20,0.34)', // alias → orange
  success: '0 20px 50px rgba(52,211,153,0.26)',
  warning: '0 20px 50px rgba(251,191,36,0.26)',
  none: '0 24px 60px rgba(2,6,23,0.6)',
};

export default function GlassCard({
  children,
  interactive = false,
  tilt = false,
  glow = 'indigo',
  onClick,
  sx,
  sheen = false,
  ...rest
}) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [3.5, -3.5]), { stiffness: 150, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-3.5, 3.5]), { stiffness: 150, damping: 20 });

  const handleMove = (e) => {
    if (!tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const handleLeave = () => { mx.set(0); my.set(0); };

  return (
    <Box
      component={motion.div}
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={interactive ? { y: -4, boxShadow: GLOWS[glow] || GLOWS.blue } : undefined}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      style={tilt ? { rotateX: rx, rotateY: ry, transformPerspective: 900 } : undefined}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        p: 3,
        width: '100%',
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
        color: 'text.primary',
        backgroundColor: 'rgba(255,255,255,0.055)',
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.015))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 10px 40px rgba(2,6,23,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        transformStyle: 'preserve-3d',
        // top edge highlight
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          padding: '1px',
          background: 'linear-gradient(140deg, rgba(148,163,255,0.45), rgba(255,255,255,0) 40%)',
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          opacity: 0.6,
          pointerEvents: 'none',
        },
        ...(sheen && {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, width: '40%', height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
            transform: 'translateX(-120%)',
            pointerEvents: 'none',
          },
          '&:hover::after': { animation: 'glassSheen 0.9s ease' },
        }),
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function TargetCursor() {
  const [hoveredEl, setHoveredEl] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Top-left coordinates and dimensions
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const cursorWidth = useMotionValue(24);
  const cursorHeight = useMotionValue(24);

  // Smooth springs for exact Target Cursor physics
  const springConfig = { damping: 25, stiffness: 350, mass: 0.5 };
  const xSpring = useSpring(cursorX, springConfig);
  const ySpring = useSpring(cursorY, springConfig);
  const widthSpring = useSpring(cursorWidth, springConfig);
  const heightSpring = useSpring(cursorHeight, springConfig);

  const lastMousePos = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // Hide OS cursor globally while TargetCursor is active
    document.body.style.cursor = 'none';

    const moveCursor = (e) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
      if (!hoveredEl) {
        cursorX.set(e.clientX - 12);
        cursorY.set(e.clientY - 12);
        cursorWidth.set(24);
        cursorHeight.set(24);
      }
    };

    const handleMouseOver = (e) => {
      const target = e.target.closest('.cursor-target');
      if (target) {
        setHoveredEl(target);
      } else {
        setHoveredEl(null);
      }
    };

    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', moveCursor);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', moveCursor);
      document.body.style.cursor = 'auto';
    };
  }, [cursorX, cursorY, cursorWidth, cursorHeight, isVisible, hoveredEl]);

  // RequestAnimationFrame loop to lock onto target even if scrolling
  useEffect(() => {
    if (!hoveredEl) return;
    let rafId;
    const loop = () => {
      const rect = hoveredEl.getBoundingClientRect();
      const padding = 12; // Extra padding around the element
      cursorX.set(rect.left - padding);
      cursorY.set(rect.top - padding);
      cursorWidth.set(rect.width + padding * 2);
      cursorHeight.set(rect.height + padding * 2);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [hoveredEl, cursorX, cursorY, cursorWidth, cursorHeight]);

  if (!isVisible) return null;

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        x: xSpring,
        y: ySpring,
        width: widthSpring,
        height: heightSpring,
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'difference', // Gives that clean inverted look on dark backgrounds
      }}
    >
      {/* Top Left Bracket */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '12px', height: '12px', borderTop: '2px solid #fff', borderLeft: '2px solid #fff' }} />
      {/* Top Right Bracket */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: '12px', height: '12px', borderTop: '2px solid #fff', borderRight: '2px solid #fff' }} />
      {/* Bottom Left Bracket */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '12px', height: '12px', borderBottom: '2px solid #fff', borderLeft: '2px solid #fff' }} />
      {/* Bottom Right Bracket */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderBottom: '2px solid #fff', borderRight: '2px solid #fff' }} />

      {/* Center Dot - fades out when locked on target */}
      <motion.div
        animate={{ scale: hoveredEl ? 0 : 1, opacity: hoveredEl ? 0 : 1 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '4px',
          height: '4px',
          marginLeft: '-2px',
          marginTop: '-2px',
          backgroundColor: '#fff',
          borderRadius: '50%',
        }}
      />
    </motion.div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography } from '@mui/material';

// --- ANIMATION VARIANTS ---
const variants = {
  split: {
    container: {
      hidden: { opacity: 0 },
      visible: (i = 1) => ({ opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 * i } }),
    },
    child: {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 12, stiffness: 100 } },
    },
  },
  blur: {
    container: {
      hidden: { opacity: 0 },
      visible: (i = 1) => ({ opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 * i } }),
    },
    child: {
      hidden: { opacity: 0, filter: "blur(10px)" },
      visible: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.4 } },
    },
  },
  fade: {
    container: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    },
    child: {}
  }
};

export default function AnimatedText({
  text,
  words = [],
  type = 'split',
  className = '',
  color = 'inherit',
  tag = 'p',
  delay = 0,
  interval = 3000
}) {

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (type === 'rotate') {
      const timer = setInterval(() => {
        setIndex((prev) => (prev + 1) % words.length);
      }, interval);
      return () => clearInterval(timer);
    }
  }, [type, words.length, interval]);

  // 1. RENDER: ROTATING TEXT
  if (type === 'rotate') {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        flexWrap: 'wrap',
        width: '100%'
      }}>
        {/* Static Prefix */}
        <Typography
          variant="h2"
          component="span"
          fontWeight={800}
          sx={{
            color: '#0d1b2a',
            fontSize: { xs: '2.5rem', md: '4rem' },
            lineHeight: 1.2,
            whiteSpace: 'nowrap'
          }}
        >
          {text}
        </Typography>

        {/* Rotating Part */}
        <Box sx={{
          position: 'relative',
          height: { xs: '4rem', md: '6rem' }, // Increased height to prevent vertical clipping
          // FIX: Increased minWidth to fit "Publications" and "Student Growth"
          minWidth: { xs: '320px', md: '550px' },
          overflow: 'hidden',
          bgcolor: 'rgba(25, 118, 210, 0.08)', // Very light blue
          borderRadius: '15px',
          px: { xs: 2, md: 4 }, // More padding
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <AnimatePresence mode='wait'>
            <motion.div
              key={words[index]}
              initial={{ y: 60, opacity: 0 }} // Start lower
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }} // Exit higher
              transition={{ duration: 0.4, ease: "backOut" }}
              style={{
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                textAlign: 'center'
              }}
            >
              <Typography
                variant="h2"
                component="span"
                fontWeight={900}
                sx={{
                  fontSize: { xs: '2.2rem', md: '4rem' },
                  lineHeight: 1,
                  pb: 1, // Padding bottom to catch descenders (g, y, p)
                  background: `linear-gradient(45deg, ${color}, #0d47a1)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  whiteSpace: 'nowrap'
                }}
              >
                {words[index]}
              </Typography>
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    );
  }

  // 2. RENDER: SIMPLE FADE & SPLIT (Unchanged)
  const Tag = motion[tag];
  const variant = variants[type] || variants['split'];

  if (type === 'fade') {
    return (
      <Tag
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={variant.container}
        transition={{ delay }}
        className={className}
        style={{ color }}
      >
        {text}
      </Tag>
    );
  }

  return (
    <Tag
      style={{ display: "flex", flexWrap: "wrap", color: color, margin: 0 }}
      className={className}
      variants={variant.container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={delay}
    >
      {text.split(" ").map((word, index) => (
        <motion.span
          key={index}
          style={{ display: "inline-block", marginRight: "0.25em", whiteSpace: "nowrap" }}
        >
          {word.split("").map((letter, i) => (
            <motion.span key={i} style={{ display: "inline-block" }} variants={variant.child}>
              {letter}
            </motion.span>
          ))}
        </motion.span>
      ))}
    </Tag>
  );
}
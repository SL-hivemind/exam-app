import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * Centered (or left-aligned) marketing section heading: overline pill + title +
 * subtitle, with a gentle reveal-on-scroll. Promoted from Home.jsx so the
 * public marketing surfaces share one heading style.
 */
export default function SectionHeading({
  overline,
  title,
  subtitle,
  align = 'center',
  light = false,
  mb = 8,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <Box textAlign={align} mb={mb} position="relative" zIndex={1}>
        {overline && (
          <Typography
            variant="overline"
            sx={{
              display: 'inline-block', px: 3, py: 0.5, mb: 2, borderRadius: 20,
              fontWeight: 800, letterSpacing: 4,
              bgcolor: 'rgba(246,137,20,0.10)',
              border: '1px solid rgba(246,137,20,0.22)',
              color: '#ffce9e',
            }}
          >
            {overline}
          </Typography>
        )}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800, mb: 2,
            background: 'linear-gradient(120deg,#ffffff,#c7d2fe 75%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="h6"
            sx={{
              color: '#9fb0d6',
              maxWidth: align === 'center' ? 700 : '100%',
              mx: align === 'center' ? 'auto' : 0,
              fontWeight: 400, lineHeight: 1.6,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </motion.div>
  );
}

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box } from '@mui/material';

const AutoCollage = ({ images }) => {
  // To ensure the background is sufficiently filled, we replicate images if there are too few,
  // topping out at 15 scattered images.
  const displayImages = images.length > 0 
    ? [...images, ...images, ...images, ...images, ...images].slice(0, 15)
    : [];

  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, opacity: 0.25 }}>
      {/* We uniquely identify the active images collage by joining their URLs, this forces AnimatePresence to remount the collage smoothly */}
      <AnimatePresence mode="popLayout">
        <Box key={images.join(',')} sx={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          {displayImages.map((src, index) => {
            // Predictable scatter deterministic values
            const top = 10 + Math.abs(Math.sin(index * 12.34)) * 80; // 10% to 90%
            const left = 5 + Math.abs(Math.cos(index * 34.56)) * 90; // 5% to 95%
            const rotation = Math.sin(index * 56.78) * 35; // -35deg to +35deg

            return (
              <motion.div
                key={`${src}-${index}`}
                initial={{ opacity: 0, scale: 0.5, filter: 'blur(10px)', y: 50 }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                transition={{ duration: 0.8, delay: index * 0.05 }}
                style={{
                  position: 'absolute',
                  top: `${top}%`,
                  left: `${left}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                }}
              >
                <Box
                  component="img"
                  src={src}
                  sx={{
                    width: { xs: 80, sm: 120, md: 160 },
                    height: 'auto',
                    objectFit: 'cover',
                    borderRadius: 2,
                    boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
                    border: '4px solid rgba(255,255,255,0.8)'
                  }}
                />
              </motion.div>
            );
          })}
        </Box>
      </AnimatePresence>
    </Box>
  );
};

export default AutoCollage;

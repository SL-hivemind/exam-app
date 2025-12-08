import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { motion } from 'framer-motion';

export default function BookStack({ category, books, color }) {
  return (
    <Box 
      sx={{ 
        position: 'relative', 
        width: 220, 
        height: 320, 
        mx: 'auto',
        perspective: '1000px', // Gives 3D depth
        cursor: 'pointer'
      }}
      component={motion.div}
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      {/* Label for the Category */}
      <Typography 
        variant="h6" 
        fontWeight={800} 
        align="center" 
        sx={{ 
            position: 'absolute', 
            bottom: -50, 
            width: '100%', 
            color: 'text.primary',
            zIndex: 10
        }}
      >
        {category}
      </Typography>

      {books.map((book, index) => {
        // Reverse index so first item is on top
        const reverseIndex = books.length - 1 - index;
        
        return (
          <motion.div
            key={index}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              transformOrigin: 'bottom center',
              zIndex: index,
            }}
            variants={{
              rest: {
                rotate: (index - 1) * 5, // Slight random-looking rotation
                y: index * -5, // Slight vertical stack
                scale: 1 - (reverseIndex * 0.05),
                boxShadow: '0px 5px 15px rgba(0,0,0,0.2)'
              },
              hover: {
                rotate: (index - 1) * 15, // Fan out wider
                x: (index - 1) * 60, // Spread horizontally
                y: -20,
                scale: 1,
                boxShadow: '0px 15px 30px rgba(0,0,0,0.3)',
                transition: { type: 'spring', stiffness: 300, damping: 20 }
              }
            }}
          >
            <Paper
              elevation={4}
              sx={{
                width: '100%',
                height: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                border: `1px solid rgba(0,0,0,0.1)`,
                bgcolor: 'white'
              }}
            >
                {/* Placeholder Book Spine/Cover Design */}
                <Box sx={{ height: '100%', bgcolor: color, display: 'flex', flexDirection: 'column', p: 2, color: 'white' }}>
                    {/* If you have real images, use <img src={book.cover} /> here instead */}
                    <Box sx={{ height: '70%', bgcolor: 'rgba(255,255,255,0.2)', mb: 2, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {book.cover ? (
                             <img src={book.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <Typography variant="caption">COVER</Typography>
                        )}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>{book.title}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>{book.desc}</Typography>
                </Box>
            </Paper>
          </motion.div>
        );
      })}
    </Box>
  );
}
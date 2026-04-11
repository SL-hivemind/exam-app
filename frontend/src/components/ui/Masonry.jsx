import React from 'react';
import { Box } from '@mui/material';

const Masonry = ({ data }) => {
  return (
    <Box sx={{
      columnCount: { xs: 1, sm: 2, md: 3, lg: 4 },
      columnGap: '1rem',
      width: '100%',
      p: 2,
    }}>
      {data.map((item, index) => (
        <Box 
          key={index} 
          sx={{
            breakInside: 'avoid',
            mb: '1rem',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            transition: 'transform 0.4s ease, box-shadow 0.4s ease',
            cursor: 'pointer',
            bgcolor: '#f1f5f9',
            '&:hover': {
              transform: 'scale(1.02) translateY(-4px)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
              zIndex: 1,
              '& .masonry-overlay': {
                opacity: 1
              }
            }
          }}
        >
          <Box 
            component="img"
            src={item.image}
            alt={item.title || "Gallery item"}
            sx={{
              display: 'block',
              width: '100%',
              height: 'auto',
              borderRadius: 3,
            }}
            loading="lazy"
          />
          {item.title && (
            <Box 
              className="masonry-overlay"
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(transparent, rgba(15,23,42,0.8))',
                p: 2,
                pt: 8,
                opacity: 0,
                transition: 'opacity 0.3s ease',
                color: '#fff',
                borderRadius: '0 0 12px 12px'
              }}
            >
              <Box sx={{ fontWeight: 700, fontSize: '1rem' }}>{item.title}</Box>
              {item.desc && <Box sx={{ fontSize: '0.8rem', opacity: 0.8 }}>{item.desc}</Box>}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default Masonry;

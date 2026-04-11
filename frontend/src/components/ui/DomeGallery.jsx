import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

const DomeGallery = ({ data }) => {
  const [rotation, setRotation] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const requestRef = useRef();

  useEffect(() => {
    const animate = () => {
      if (!isPaused) {
        setRotation(prev => prev - 0.12); // Smooth slow rotation
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPaused]);

  // Duplicate data to create a massively wide continuous ring
  const expandedData = [...data, ...data, ...data];
  const itemCount = expandedData.length;
  const angleDelta = 360 / itemCount;

  // To make cards touch exactly edge-to-edge horizontally:
  // Math: radius = (width / 2) / tan(angle / 2)
  const cardWidth = 300;
  const cardHeight = 380;
  const gap = 40; // Space between images
  const tz = Math.round(((cardWidth + gap) / 2) / Math.tan((angleDelta / 2) * (Math.PI / 180)));

  const renderRow = (yOffset, reverseDirection = false) => {
    return (
      <Box
        sx={{
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          position: 'absolute',
          top: yOffset,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${-tz}px) rotateY(${reverseDirection ? -rotation : rotation}deg)`,
          transition: isPaused ? 'transform 0.5s ease-out' : 'none',
        }}
      >
        {expandedData.map((item, index) => (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              width: `${cardWidth}px`,
              height: `${cardHeight}px`,
              left: 0,
              top: 0,
              borderRadius: 0,
              overflow: 'hidden',
              transform: `rotateY(${index * angleDelta}deg) translateZ(${tz}px)`,
              bgcolor: '#fff',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              border: '1px solid rgba(0,0,0,0.1)'
            }}
          >
            <Box
              component="img"
              src={item.image}
              alt={item.title}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        perspective: '2000px',
        height: '500px', // Adjusted for 1 row
        width: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
        maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Center Row */}
      {renderRow('calc(50% - 190px)', false)}
    </Box>
  );
};

export default DomeGallery;

import React, { useRef, useEffect } from 'react';

const Waves = ({ lineColor = 'rgba(15, 23, 42, 0.2)', speed = 0.03 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const render = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const waveCount = 5;
      const centerY = canvas.height / 2;

      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        // Make lines fade out at edges
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
        gradient.addColorStop(0.5, lineColor);
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.strokeStyle = gradient;
        
        for (let x = 0; x < canvas.width; x++) {
          // Calculate wave height based on position and time
          const frequency = 0.005 + (i * 0.002);
          const amplitude = 40 + (Math.sin(time + i) * 60);
          
          // Audio-visualizer like pulsing effect combined with sine wave
          const y = centerY + Math.sin(x * frequency + time + (i * 0.5)) * amplitude;
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      time += speed;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
    };
  }, [lineColor, speed]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'absolute', 
        top: 0, left: 0, zIndex: 0,
        pointerEvents: 'none'
      }} 
    />
  );
};

export default Waves;

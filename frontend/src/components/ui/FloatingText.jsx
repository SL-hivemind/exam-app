import React, { useRef, useEffect } from 'react';

const FloatingText = ({ color = 'rgba(15, 23, 42, 0.05)', speed = 0.5 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    let drops = [];

    const init = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const columns = Math.floor(canvas.width / 40);
      drops = [];
      for(let x = 0; x < columns; x++) {
        drops[x] = {
            y: Math.random() * canvas.height, // start at random heights
            char: letters[Math.floor(Math.random() * letters.length)],
            speed: (Math.random() * 0.5 + 0.2) * speed * 4,
            fontSize: Math.random() * 20 + 20
        };
      }
    };
    init();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      
      for(let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        ctx.font = `${drop.fontSize}px "Cinzel", serif`;
        ctx.fillText(drop.char, i * 40, drop.y);
        
        // Random chance to change character occasionally
        if (Math.random() > 0.98) {
            drop.char = letters[Math.floor(Math.random() * letters.length)];
        }
        
        drop.y += drop.speed;
        
        if(drop.y > canvas.height + drop.fontSize) {
          drop.y = -drop.fontSize;
          drop.char = letters[Math.floor(Math.random() * letters.length)];
          drop.speed = (Math.random() * 0.5 + 0.2) * speed * 6; // slightly faster drift
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener('resize', init);
    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', init);
    };
  }, [color, speed]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} 
    />
  );
};

export default FloatingText;

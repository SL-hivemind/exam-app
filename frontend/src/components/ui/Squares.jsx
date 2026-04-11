import React, { useRef, useEffect } from 'react';

const Squares = ({ 
  direction = 'Right', 
  speed = 1, 
  borderColor = '#e2e8f0', // Light professional border
  squareSize = 40,
  hoverFillColor = '#f1f5f9' 
}) => {
  const canvasRef = useRef(null);
  const squaresRef = useRef([]);
  const hoveredSquareRef = useRef(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const numCols = Math.ceil(canvas.width / squareSize) + 1;
      const numRows = Math.ceil(canvas.height / squareSize) + 1;
      
      squaresRef.current = [];
      for (let y = 0; y < numRows; y++) {
        for (let x = 0; x < numCols; x++) {
          squaresRef.current.push({ x: x * squareSize, y: y * squareSize });
        }
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      offsetRef.current += (direction === 'Right' ? speed : -speed) * 0.5;
      if (Math.abs(offsetRef.current) >= squareSize) {
        offsetRef.current = 0;
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = borderColor;

      squaresRef.current.forEach(square => {
        const drawX = square.x + offsetRef.current;
        const drawY = square.y + (direction === 'Down' ? offsetRef.current : 0);

        ctx.beginPath();
        ctx.rect(drawX, drawY, squareSize, squareSize);
        ctx.stroke();

        // Check hover
        if (hoveredSquareRef.current) {
          const { hx, hy } = hoveredSquareRef.current;
          if (drawX <= hx && drawX + squareSize >= hx && drawY <= hy && drawY + squareSize >= hy) {
            ctx.fillStyle = hoverFillColor;
            ctx.fill();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const hx = e.clientX - rect.left;
      const hy = e.clientY - rect.top;
      hoveredSquareRef.current = { hx, hy };
    };

    const handleMouseLeave = () => {
      hoveredSquareRef.current = null;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [direction, speed, borderColor, squareSize, hoverFillColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0,
        pointerEvents: 'auto',
      }}
    />
  );
};

export default Squares;

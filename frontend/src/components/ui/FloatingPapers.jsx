import React, { useRef, useEffect } from 'react';

const FloatingPapers = ({ color = 'rgba(15, 23, 42, 0.05)', count = 15, speed = 0.5 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let papersArray = [];

    class Paper {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.width = Math.random() * 40 + 40;
        this.height = this.width * 1.4; // roughly A4 ratio
        this.speedX = (Math.random() - 0.5) * speed;
        this.speedY = (Math.random() - 0.5) * speed;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 0.5;
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.fillStyle = 'transparent';
        
        // Draw the document outline
        ctx.beginPath();
        ctx.rect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Draw some subtle line details inside the paper
        ctx.moveTo(-this.width/2 + 10, -this.height/2 + 15);
        ctx.lineTo(this.width/2 - 10, -this.height/2 + 15);
        
        ctx.moveTo(-this.width/2 + 10, -this.height/2 + 30);
        ctx.lineTo(this.width/2 - 10, -this.height/2 + 30);
        
        ctx.moveTo(-this.width/2 + 10, -this.height/2 + 45);
        ctx.lineTo(0, -this.height/2 + 45);
        
        ctx.stroke();
        ctx.restore();
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;
        
        // wrap around logic
        if (this.x > canvas.width + this.width) this.x = -this.width;
        if (this.x < -this.width) this.x = canvas.width + this.width;
        if (this.y > canvas.height + this.height) this.y = -this.height;
        if (this.y < -this.height) this.y = canvas.height + this.height;
        
        this.draw();
      }
    }

    const init = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      papersArray = [];
      for (let i = 0; i < count; i++) {
        papersArray.push(new Paper());
      }
    };
    init();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < papersArray.length; i++) {
        papersArray[i].update();
      }
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener('resize', init);
    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', init);
    };
  }, [color, count, speed]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }} 
    />
  );
};

export default FloatingPapers;

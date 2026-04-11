import React, { useRef, useEffect } from 'react';

const RisingStars = ({ color = 'rgba(239, 68, 68, 0.1)', count = 20, speed = 1 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particlesArray = [];

    class RisingParticle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height + canvas.height;
        this.size = Math.random() * 40 + 10;
        this.speedY = -(Math.random() * 1.5 + 0.5) * speed;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 2;
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = color;
        // Draw an arrowhead / chevron shape denoting leadership
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, this.size);
        ctx.lineTo(0, this.size * 0.5);
        ctx.lineTo(-this.size, this.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotationSpeed;
        if (this.y < -this.size * 2) {
            this.y = canvas.height + this.size * 2;
            this.x = Math.random() * canvas.width;
        }
        this.draw();
      }
    }

    const init = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      particlesArray = [];
      for (let i = 0; i < count; i++) {
        particlesArray.push(new RisingParticle());
      }
    };
    init();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
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

export default RisingStars;

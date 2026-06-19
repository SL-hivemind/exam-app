import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const SplitText = ({ text, className = '', style = {}, delay = 100, animationFrom, animationTo, easing = 'easeOut', threshold = 0.1, rootMargin = '-50px' }) => {
  const letters = text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current);
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <p
      ref={ref}
      className={className}
      style={{
        display: 'inline-block',
        overflow: 'hidden',
        margin: 0,
        ...style
      }}
    >
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={animationFrom || { y: '100%', opacity: 0 }}
          animate={inView ? (animationTo || { y: 0, opacity: 1 }) : (animationFrom || { y: '100%', opacity: 0 })}
          transition={{
            delay: i * (delay / 1000),
            duration: 0.6,
            ease: easing,
          }}
          style={{ display: 'inline-block', whiteSpace: letter === ' ' ? 'pre' : 'normal' }}
        >
          {letter}
        </motion.span>
      ))}
    </p>
  );
};

export default SplitText;

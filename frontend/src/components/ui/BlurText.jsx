import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const BlurText = ({ text, delay = 200, className = '', style = {} }) => {
  const words = text.split(' ');
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
      { threshold: 0.1, rootMargin: '-50px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <p ref={ref} className={className} style={{ margin: 0, display: 'flex', flexWrap: 'wrap', ...style }}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={{ filter: 'blur(10px)', opacity: 0, transform: 'translate3d(0, 10px, 0)' }}
          animate={inView ? { filter: 'blur(0px)', opacity: 1, transform: 'translate3d(0,0,0)' } : {}}
          transition={{ duration: 0.8, delay: index * (delay / 1000), ease: 'easeOut' }}
          style={{ display: 'inline-block', marginRight: '0.4em' }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
};

export default BlurText;

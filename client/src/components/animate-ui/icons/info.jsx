'use client';

import * as React from 'react';
import { motion, useAnimation } from 'motion/react';

export function Info({
  size = 14,
  className = '',
  animateOnHover = true,
  ...props
}) {
  const controls = useAnimation();

  const handleMouseEnter = () => {
    if (animateOnHover) {
      controls.start({
        y: [0, -2.5, 0, -1, 0],
        transition: {
          duration: 0.6,
          ease: 'easeInOut',
          times: [0, 0.3, 0.55, 0.75, 1],
        },
      });
    }
  };

  const handleMouseLeave = () => {
    controls.set({ y: 0 });
  };

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <circle cx={12} cy={12} r={10} />
      <motion.g animate={controls} initial={{ y: 0 }}>
        <path d="M12 8h.01" />
        <path d="M12 16v-4" />
      </motion.g>
    </motion.svg>
  );
}

export default Info;

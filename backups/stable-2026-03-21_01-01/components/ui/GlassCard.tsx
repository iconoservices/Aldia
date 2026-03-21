import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  variant?: 'subtle' | 'normal' | 'strong';
  hoverable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'normal',
  hoverable = true,
  ...props
}) => {
  const getShadow = () => {
    switch (variant) {
      case 'subtle': return '0 2px 8px rgba(0, 0, 0, 0.02)';
      case 'strong': return '0 15px 40px rgba(0, 0, 0, 0.08)';
      default: return '0 10px 30px rgba(0, 0, 0, 0.03)';
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--white)', // O rgba(255, 255, 255, 0.8) para efecto real
    borderRadius: '24px',
    boxShadow: getShadow(),
    padding: '1rem',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(10px)',
  };

  return (
    <motion.div
      style={cardStyle}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverable ? { y: -4, boxShadow: '0 15px 40px rgba(0, 0, 0, 0.06)' } : {}}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`glass-card-component ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

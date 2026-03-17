import React from 'react';
import { motion } from 'framer-motion';

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

export const ModernInput: React.FC<ModernInputProps> = ({
  label,
  icon,
  error,
  containerClassName = '',
  className = '',
  ...props
}) => {
  return (
    <div className={`modern-input-container flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-slate-400">
            {icon}
          </div>
        )}
        <motion.input
          {...(props as any)}
          whileFocus={{ scale: 1.01, borderColor: 'var(--domain-blue)' }}
          className={`
            w-full bg-white border-2 border-slate-100 rounded-2xl py-3 px-4
            ${icon ? 'pl-11' : ''}
            text-sm font-semibold text-slate-700 outline-none
            placeholder:text-slate-300 placeholder:font-medium
            transition-all duration-200
            ${error ? 'border-red-400' : 'focus:border-blue-400'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[10px] font-bold text-red-500 ml-2 mt-0.5 uppercase">
          {error}
        </span>
      )}
    </div>
  );
};

import React from 'react';
import { 
  Briefcase, 
  Target, 
  Zap, 
  Wallet, 
  BookOpen, 
  Settings
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type DomainType = 'finanzas' | 'misiones' | 'proyectos' | 'vida' | 'cerebro' | 'ajustes';

interface DomainIconProps {
  domain: DomainType;
  size?: number;
  className?: string;
  variant?: 'solid' | 'subtle';
}

const domainConfig: Record<DomainType, { icon: LucideIcon, color: string, bg: string }> = {
  finanzas: { icon: Wallet, color: 'var(--domain-blue)', bg: 'rgba(0, 85, 255, 0.1)' },
  misiones: { icon: Target, color: 'var(--domain-orange)', bg: 'rgba(255, 140, 66, 0.1)' },
  proyectos: { icon: Briefcase, color: 'var(--domain-purple)', bg: 'rgba(212, 196, 251, 0.1)' },
  vida: { icon: Zap, color: 'var(--domain-green)', bg: 'rgba(168, 218, 220, 0.1)' },
  cerebro: { icon: BookOpen, color: '#3D312E', bg: 'rgba(61, 49, 46, 0.1)' },
  ajustes: { icon: Settings, color: '#888', bg: 'rgba(136, 136, 136, 0.1)' }
};

export const DomainIcon: React.FC<DomainIconProps> = ({ 
  domain, 
  size = 20, 
  className = '', 
  variant = 'subtle' 
}) => {
  const config = domainConfig[domain];
  const Icon = config.icon;

  const style: React.CSSProperties = variant === 'subtle' 
    ? { backgroundColor: config.bg, color: config.color, padding: '8px', borderRadius: '12px' }
    : { color: config.color };

  return (
    <div 
      className={`domain-icon-wrapper flex items-center justify-center ${className}`}
      style={style}
    >
      <Icon size={size} />
    </div>
  );
};

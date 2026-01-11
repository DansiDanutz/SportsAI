import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  glow?: boolean;
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-700/50 text-gray-300 border-gray-600/50',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  premium: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
};

const glowStyles = {
  default: '',
  success: 'shadow-[0_0_10px_rgba(34,197,94,0.3)]',
  warning: 'shadow-[0_0_10px_rgba(234,179,8,0.3)]',
  danger: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]',
  info: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
  premium: 'shadow-[0_0_10px_rgba(245,158,11,0.3)]',
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  animated = false,
  glow = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        'transition-all duration-200',
        variantStyles[variant],
        sizeStyles[size],
        glow && glowStyles[variant],
        animated && 'animate-pulse',
        className
      )}
    >
      {children}
    </span>
  );
}

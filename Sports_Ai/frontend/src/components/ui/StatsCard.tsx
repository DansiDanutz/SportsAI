import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { AnimatedCounter } from './AnimatedCounter';

interface StatsCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  default: {
    bg: 'from-gray-800/80 to-gray-900/80',
    border: 'border-gray-700/30 hover:border-gray-600/50',
    icon: 'bg-gray-700/50 text-gray-400',
  },
  success: {
    bg: 'from-green-900/30 to-gray-900/80',
    border: 'border-green-500/20 hover:border-green-500/40',
    icon: 'bg-green-500/20 text-green-400',
  },
  warning: {
    bg: 'from-yellow-900/30 to-gray-900/80',
    border: 'border-yellow-500/20 hover:border-yellow-500/40',
    icon: 'bg-yellow-500/20 text-yellow-400',
  },
  danger: {
    bg: 'from-red-900/30 to-gray-900/80',
    border: 'border-red-500/20 hover:border-red-500/40',
    icon: 'bg-red-500/20 text-red-400',
  },
};

const sizeStyles = {
  sm: {
    padding: 'p-3',
    iconSize: 'w-8 h-8',
    titleSize: 'text-xs',
    valueSize: 'text-xl',
  },
  md: {
    padding: 'p-4',
    iconSize: 'w-10 h-10',
    titleSize: 'text-sm',
    valueSize: 'text-2xl',
  },
  lg: {
    padding: 'p-5',
    iconSize: 'w-12 h-12',
    titleSize: 'text-base',
    valueSize: 'text-3xl',
  },
};

export function StatsCard({
  title,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  icon,
  trend,
  variant = 'default',
  size = 'md',
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border',
        'bg-gradient-to-br backdrop-blur-sm',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        styles.bg,
        styles.border,
        sizes.padding,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={clsx('text-gray-400 font-medium', sizes.titleSize)}>
            {title}
          </p>
          <div className={clsx('font-bold text-white', sizes.valueSize)}>
            <AnimatedCounter
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
              duration={800}
            />
          </div>
          {trend && (
            <div
              className={clsx(
                'flex items-center gap-1 text-xs font-medium',
                trend.isPositive ? 'text-green-400' : 'text-red-400'
              )}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500">vs last week</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'flex items-center justify-center rounded-lg',
              styles.icon,
              sizes.iconSize
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Decorative gradient */}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl" />
    </div>
  );
}

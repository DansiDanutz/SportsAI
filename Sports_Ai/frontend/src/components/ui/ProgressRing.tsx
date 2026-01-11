import { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  strokeWidth?: number;
  color?: 'green' | 'blue' | 'orange' | 'red' | 'purple';
  showValue?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const sizeConfigs = {
  sm: { size: 60, fontSize: 'text-sm' },
  md: { size: 80, fontSize: 'text-lg' },
  lg: { size: 120, fontSize: 'text-2xl' },
};

const colorStyles = {
  green: {
    stroke: '#22c55e',
    gradient: ['#22c55e', '#10b981'],
  },
  blue: {
    stroke: '#3b82f6',
    gradient: ['#3b82f6', '#0ea5e9'],
  },
  orange: {
    stroke: '#f97316',
    gradient: ['#f97316', '#eab308'],
  },
  red: {
    stroke: '#ef4444',
    gradient: ['#ef4444', '#f97316'],
  },
  purple: {
    stroke: '#a855f7',
    gradient: ['#a855f7', '#6366f1'],
  },
};

export function ProgressRing({
  value,
  max = 100,
  size = 'md',
  strokeWidth = 6,
  color = 'green',
  showValue = true,
  label,
  animated = true,
  className,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(animated ? 0 : value);

  useEffect(() => {
    if (!animated) {
      setAnimatedValue(value);
      return;
    }

    const duration = 1000;
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (value - startValue) * easeOut;

      setAnimatedValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, animated]);

  const config = sizeConfigs[size];
  const colors = colorStyles[color];
  const radius = (config.size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = (animatedValue / max) * 100;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const gradientId = `progress-gradient-${color}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg
        width={config.size}
        height={config.size}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="100%" stopColor={colors.gradient[1]} />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-700"
        />

        {/* Progress circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className={clsx('font-bold text-white', config.fontSize)}>
            {Math.round(animatedValue)}%
          </span>
        )}
        {label && (
          <span className="text-xs text-gray-400 mt-0.5">{label}</span>
        )}
      </div>
    </div>
  );
}

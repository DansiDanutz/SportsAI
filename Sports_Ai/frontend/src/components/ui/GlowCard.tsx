import { ReactNode, useState, useRef, MouseEvent } from 'react';
import { clsx } from 'clsx';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'green' | 'blue' | 'orange' | 'red' | 'purple';
  variant?: 'default' | 'gradient' | 'glass';
  hover?: boolean;
}

const glowColors = {
  green: 'rgba(34, 197, 94, 0.4)',
  blue: 'rgba(59, 130, 246, 0.4)',
  orange: 'rgba(249, 115, 22, 0.4)',
  red: 'rgba(239, 68, 68, 0.4)',
  purple: 'rgba(168, 85, 247, 0.4)',
};

const gradientColors = {
  green: 'from-green-500/20 to-emerald-500/10',
  blue: 'from-blue-500/20 to-cyan-500/10',
  orange: 'from-orange-500/20 to-amber-500/10',
  red: 'from-red-500/20 to-rose-500/10',
  purple: 'from-purple-500/20 to-violet-500/10',
};

const borderColors = {
  green: 'border-green-500/20 hover:border-green-500/40',
  blue: 'border-blue-500/20 hover:border-blue-500/40',
  orange: 'border-orange-500/20 hover:border-orange-500/40',
  red: 'border-red-500/20 hover:border-red-500/40',
  purple: 'border-purple-500/20 hover:border-purple-500/40',
};

export function GlowCard({
  children,
  className,
  glowColor = 'green',
  variant = 'default',
  hover = true,
}: GlowCardProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const baseClasses = clsx(
    'relative rounded-xl p-4 transition-all duration-300',
    'bg-gray-800/50 border',
    borderColors[glowColor],
    hover && 'hover:-translate-y-1 hover:shadow-lg',
    variant === 'gradient' && `bg-gradient-to-br ${gradientColors[glowColor]}`,
    variant === 'glass' && 'backdrop-blur-md bg-white/5',
    className
  );

  return (
    <div
      ref={cardRef}
      className={baseClasses}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        boxShadow: isHovered
          ? `0 0 40px ${glowColors[glowColor]}, 0 0 60px ${glowColors[glowColor].replace('0.4', '0.2')}`
          : undefined,
      }}
    >
      {/* Spotlight effect */}
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-50 transition-opacity duration-300"
          style={{
            background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${glowColors[glowColor].replace('0.4', '0.15')}, transparent 40%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

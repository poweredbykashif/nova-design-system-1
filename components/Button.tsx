import React from 'react';
import { ButtonProps } from '../types';

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-250 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-bg disabled:opacity-50 disabled:cursor-not-allowed rounded-xl';

  const variants = {
    // Primary: Enhanced hover with subtle lift and glow shadow
    primary: 'bg-brand-primary text-white hover:-translate-y-0.5 hover:shadow-[0_12px_20px_-10px_rgba(255,77,45,0.5),0_0_15px_-3px_rgba(255,77,45,0.2)] active:translate-y-0 active:shadow-none focus:ring-brand-primary',
    // Metallic: Premium orange with gradient, inner highlights, and depth
    metallic: 'relative overflow-hidden bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white border border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:brightness-[1.05] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.2),0_12px_24px_-8px_rgba(255,77,45,0.5)] active:translate-y-0 active:brightness-[0.95] active:shadow-inner focus:ring-brand-primary',
    // Secondary: Stronger contrast for secondary buttons
    secondary: 'bg-surface-overlay text-white hover:bg-white/[0.08] hover:border-white/20 focus:ring-surface-overlay border border-surface-border',
    // More visible border emphasis for outlines
    outline: 'bg-transparent border-2 border-surface-border text-white hover:border-white/40 hover:bg-white/[0.02] focus:ring-brand-primary',
    // Subtle background shift for ghost buttons
    ghost: 'bg-transparent text-gray-400 hover:text-white hover:bg-white/[0.06] focus:ring-surface-overlay',
    error: 'bg-brand-error text-white hover:brightness-110 hover:shadow-lg hover:shadow-brand-error/20 focus:ring-brand-error',
    success: 'bg-brand-success text-white hover:brightness-110 hover:shadow-lg hover:shadow-brand-success/20 focus:ring-brand-success',
    // Recessed: Deep sunken/machined look (Nova Recessed)
    recessed: 'bg-black/40 text-gray-400 border border-white/[0.05] shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] hover:bg-black/50 hover:text-white transition-all',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
    xl: 'px-10 py-5 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Metallic Shine Overlay */}
      {variant === 'metallic' && (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50" />
      )}
      {variant === 'recessed' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {/* Inner Top Shadow for carved-in look */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent" />
          {/* Subtle Diagonal Machined Sheen */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30" />
        </div>
      )}

      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : leftIcon && <span className="mr-2 relative z-10">{leftIcon}</span>}
      <span className="relative z-10">{children}</span>
      {!isLoading && rightIcon && <span className="ml-2 relative z-10">{rightIcon}</span>}
    </button>
  );
};

export default Button;
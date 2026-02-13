import React, { useState } from 'react';
import { InputProps, ComponentProps } from '../types';
import { IconEye, IconEyeOff, IconMaximize } from './Icons';

export const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  helperText,
  className = '',
  leftIcon,
  rightIcon,
  type,
  size = 'md',
  variant = 'primary',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const sizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-4 text-base',
  };

  const iconSizes = {
    sm: 'left-3',
    md: 'left-4',
    lg: 'left-4',
  };

  const iconRightSizes = {
    sm: 'right-3',
    md: 'right-4',
    lg: 'right-4',
  };

  // Extract any cursor classes from className for the input element
  const inputCursorClass = className?.includes('cursor-') ? className.match(/!?cursor-[\w-]+/g)?.join(' ') || '' : '';
  const wrapperClassName = className?.replace(/!?cursor-[\w-]+/g, '').trim() || '';

  return (
    <div className={`flex flex-col gap-2 w-full ${wrapperClassName}`}>
      {label && <label className="text-sm font-medium text-gray-400 ml-1">{label}</label>}
      <div className="relative group">
        {leftIcon && (
          <div className={`absolute ${iconSizes[size]} top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-primary transition-colors`}>
            {leftIcon}
          </div>
        )}
        <input
          type={inputType}
          className={`w-full transition-all duration-300 outline-none rounded-xl ${sizes[size]} border ${variant === 'metallic'
            ? 'bg-black/40 border-white/[0.05] text-white font-bold placeholder:text-gray-600 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] focus:bg-black/60'
            : `bg-surface-input border-2 text-white placeholder:text-gray-600 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 ${error ? 'border-brand-error' : success ? 'border-brand-success' : 'border-surface-border'}`
            } ${leftIcon ? (size === 'sm' ? 'pl-9' : 'pl-12') : ''} ${isPassword || rightIcon ? (size === 'sm' ? 'pr-9' : 'pr-12') : ''} ${inputType === 'number' ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''} ${inputCursorClass || (props.disabled ? 'cursor-not-allowed' : props.readOnly ? 'cursor-pointer' : '')}`}
          {...props}
        />
        {/* Metallic Depth Overlay for Recessed Input */}
        {variant === 'metallic' && (
          <div className="absolute inset-[1px] pointer-events-none rounded-xl overflow-hidden">
            {/* Inner Top Shadow for carved-in look */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/60 to-transparent" />
            {/* Subtle Diagonal Machined Sheen */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-40" />
          </div>
        )}
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute ${iconRightSizes[size]} top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors`}
          >
            {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        ) : rightIcon && (
          <div className={`absolute ${iconRightSizes[size]} top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-primary transition-colors`}>
            {rightIcon}
          </div>
        )}
      </div>
      {(error || helperText) && (
        <span className={`text-xs ml-1 ${error ? 'text-brand-error' : success ? 'text-brand-success' : 'text-gray-500'}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string,
  error?: string,
  variant?: 'primary' | 'metallic',
  onExpand?: () => void
}> = ({ label, error, variant = 'primary', onExpand, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && <label className="text-sm font-medium text-gray-400 ml-1">{label}</label>}
      <div className="relative group">
        <textarea
          className={`w-full transition-all duration-300 outline-none rounded-xl px-4 py-3 min-h-[120px] resize-none ${onExpand ? 'pr-12' : ''} ${variant === 'metallic'
            ? 'bg-black/40 border-white/[0.05] text-white font-bold placeholder:text-gray-600 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] focus:border-white/20 focus:bg-black/60'
            : `bg-surface-input border-2 text-white placeholder:text-gray-600 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 ${error ? 'border-brand-error' : 'border-surface-border'}`
            } ${props.readOnly || props.disabled ? 'cursor-not-allowed' : ''}`}
          {...props}
        />
        {/* Metallic Depth Overlay for Recessed TextArea */}
        {variant === 'metallic' && (
          <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
            {/* Inner Top Shadow for carved-in look */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/60 to-transparent" />
            {/* Subtle Diagonal Machined Sheen */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30" />
          </div>
        )}
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="absolute top-3 right-3 p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
          >
            <IconMaximize size={16} />
          </button>
        )}
      </div>
      {error && <span className="text-xs ml-1 text-brand-error">{error}</span>}
    </div>
  );
};


import React from 'react';
import { AvatarProps } from '../types';

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  initials,
  size = 'md',
  status,
  disabled,
  className = '',
  children
}) => {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const statusColors = {
    online: 'bg-brand-success',
    offline: 'bg-gray-500',
    busy: 'bg-brand-error',
    away: 'bg-brand-warning',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  return (
    <div className={`relative inline-block ${disabled ? 'opacity-40 grayscale' : ''} ${className} rounded-full`}>
      <div className={`${sizes[size]} rounded-full bg-surface-overlay border border-surface-border flex items-center justify-center overflow-hidden transition-all duration-200 shadow-sm`}>
        {src ? (
          <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-gray-300 uppercase leading-none">{initials || '??'}</span>
        )}
        {children}
      </div>
      {status && (
        <span className={`absolute bottom-0 right-0 ${statusSizes[size]} ${statusColors[status]} rounded-full border-2 border-surface-bg z-10`} />
      )}
    </div>
  );
};

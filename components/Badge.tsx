import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'metallic';
    size?: 'sm' | 'md';
    className?: string;
    icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'secondary',
    size = 'md',
    className = '',
    icon
}) => {
    const variants = {
        primary: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
        secondary: 'bg-white/5 text-gray-400 border-white/10',
        success: 'bg-brand-success/10 text-brand-success border-brand-success/20',
        warning: 'bg-brand-warning/10 text-brand-warning border-brand-warning/20',
        error: 'bg-brand-error/10 text-brand-error border-brand-error/20',
        ghost: 'bg-transparent text-gray-500 border-white/5',
        metallic: 'bg-black/40 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    };

    const sizes = {
        sm: 'px-1.5 py-0.5 text-[9px]',
        md: 'px-2 py-0.5 text-[10px]'
    };

    return (
        <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-widest rounded-md border ${variants[variant]} ${sizes[size]} ${className}`}>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
        </span>
    );
};

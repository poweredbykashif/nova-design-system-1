import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DatePickerProps } from '../types';
import { Input } from './Input';
import { Calendar } from './Calendar';
import { IconCalendar } from './Icons';

export const formatDate = (date: Date | null) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
};

export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    label,
    placeholder = "01 Jan 2026",
    error,
    disabled,
    className = "",
    children,
    inputProps = {},
    variant = 'primary'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [popoverState, setPopoverState] = useState<{
        top: number;
        left: number;
        placement: 'top' | 'bottom';
        isReady: boolean;
    }>({ top: 0, left: 0, placement: 'bottom', isReady: false });

    const triggerRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const gap = 8;
            const calendarHeight = 340;

            // Strictly prioritize bottom: only flip if space below is critically tight
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            // Flip only if necessary and space above is actually sufficient
            const shouldFlip = spaceBelow < 280 && spaceAbove > 340;

            if (shouldFlip) {
                setPopoverState({
                    top: rect.top - gap,
                    left: rect.left,
                    placement: 'top',
                    isReady: true
                });
            } else {
                setPopoverState({
                    top: rect.bottom + gap,
                    left: rect.left,
                    placement: 'bottom',
                    isReady: true
                });
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                calendarRef.current && !calendarRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            setPopoverState(prev => ({ ...prev, isReady: false }));
        }

        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const calendarContent = (
        <div
            ref={calendarRef}
            className={`fixed z-[99999] animate-in fade-in duration-150 ${popoverState.placement === 'bottom' ? 'origin-top' : 'origin-bottom -translate-y-full'
                }`}
            style={{
                top: `${popoverState.top}px`,
                left: `${popoverState.left}px`,
            }}
        >
            <Calendar
                selectedDate={value || new Date()}
                onDateChange={(date) => {
                    onChange(date);
                    setIsOpen(false);
                }}
            />
        </div>
    );

    return (
        <div className={`relative w-full ${className}`} ref={triggerRef}>
            {children ? (
                <div
                    onClick={() => {
                        if (!disabled) {
                            // Pre-calculate to avoid flicker
                            if (!isOpen) updateCoords();
                            setIsOpen(!isOpen);
                        }
                    }}
                    className="cursor-pointer"
                >
                    {children}
                </div>
            ) : (
                <Input
                    label={label}
                    placeholder={placeholder}
                    value={formatDate(value)}
                    readOnly
                    disabled={disabled}
                    error={error}
                    variant={variant}
                    leftIcon={<IconCalendar className="w-4 h-4" />}
                    onClick={() => {
                        if (!disabled) {
                            if (!isOpen) updateCoords();
                            setIsOpen(!isOpen);
                        }
                    }}
                    className={`!cursor-pointer ${(inputProps as any).className || ''}`}
                    {...inputProps}
                />
            )}
            {isOpen && popoverState.isReady && createPortal(calendarContent, document.body)}
        </div>
    );
};

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DropdownProps } from '../types';
import { IconSearch } from './Icons';

export const Dropdown: React.FC<DropdownProps> = ({
  options = [],
  value,
  onChange,
  label,
  placeholder = "Select an option",
  disabled,
  isMulti = false,
  showSearch = false,
  searchPlaceholder = "Search...",
  error,
  className = "",
  size = "md",
  variant = "primary",
  selectionLabel,
  menuClassName = "",
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-4 text-base'
  };

  // Helper to check if a value is selected
  const isValueSelected = (val: string) => {
    if (isMulti && Array.isArray(value)) {
      return value.includes(val);
    }
    return value === val;
  };

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(query) ||
      opt.description?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Partition options for multi-select (using filtered options)
  const selectedOptions = useMemo(() =>
    filteredOptions.filter(opt => isValueSelected(opt.value)),
    [filteredOptions, value, isMulti]
  );

  const unselectedOptions = useMemo(() =>
    isMulti ? filteredOptions.filter(opt => !isValueSelected(opt.value)) : filteredOptions,
    [filteredOptions, value, isMulti]
  );

  const hasAnyIcon = useMemo(() => (options || []).some(opt => !!opt.icon), [options]);

  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;

      // If less than 280px below (typical max-height of dropdown), check if we should flip
      if (spaceBelow < 280 && rect.top > spaceBelow) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }

      setCoords({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(!isOpen);
    if (isOpen) setSearchQuery(''); // Clear search when closing
  };

  const handleSelect = (optionValue: string) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      let nextValues;
      if (currentValues.includes(optionValue)) {
        nextValues = currentValues.filter(v => v !== optionValue);
      } else {
        nextValues = [...currentValues, optionValue];
      }
      onChange(nextValues);
      // STRICT: Never close for multi-select here
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = dropdownRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);

      // Portal check: if click is outside both trigger and the floating menu, close it
      if (!isInsideTrigger && !isInsideMenu) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const renderOption = (option: any, isSelected: boolean) => (
    <button
      key={option.value}
      type="button"
      disabled={option.disabled}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        handleSelect(option.value);
      }}
      className={`w-full flex items-start gap-4 px-3 py-2.5 text-left transition-all duration-200 rounded-lg relative group ${isSelected
        ? 'bg-brand-primary/10 text-brand-primary'
        : option.disabled
          ? 'opacity-40 cursor-not-allowed grayscale'
          : 'text-gray-300 hover:bg-white/[0.08] hover:text-white'
        }`}
    >
      {hasAnyIcon && (
        <div className={`mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center transition-colors duration-200 ${isSelected ? 'text-brand-primary' : 'text-gray-500 group-hover:text-gray-200'}`}>
          {option.icon}
        </div>
      )}

      <div className="flex items-center justify-between flex-1 overflow-hidden gap-4">
        <span className={`font-semibold text-sm truncate transition-colors duration-200 ${isSelected ? 'text-brand-primary' : 'text-gray-100 group-hover:text-white'}`}>
          {option.label}
        </span>
        {option.description && (
          <span className="text-sm text-gray-600 shrink-0 transition-colors group-hover:text-gray-500 uppercase font-medium">
            {option.description}
          </span>
        )}
      </div>

      {isSelected && (
        <svg className="w-5 h-5 ml-2 shrink-0 animate-in zoom-in duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );

  const dropdownMenu = (
    <div
      ref={menuRef}
      className={`fixed z-[99999] bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150 flex flex-col ${placement === 'bottom' ? 'origin-top' : 'origin-bottom'} ${menuClassName}`}
      style={{
        top: placement === 'bottom' ? `${coords.bottom + 8}px` : 'auto',
        bottom: placement === 'top' ? `${window.innerHeight - coords.top + 8}px` : 'auto',
        left: `${coords.left}px`,
        width: menuClassName.includes('w-') ? undefined : `${coords.width}px`,
        minWidth: `${coords.width}px`
      }}
    >
      {showSearch && (
        <div className="p-2 border-b border-surface-border flex-shrink-0">
          <div className="relative group">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              autoFocus
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-input border border-brand-primary/40 transition-all duration-200 outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="max-h-60 overflow-y-auto py-1.5 px-1.5 space-y-0.5 flex-1
        [&::-webkit-scrollbar]:w-1.5 
        [&::-webkit-scrollbar-track]:bg-transparent 
        [&::-webkit-scrollbar-thumb]:bg-white/10 
        [&::-webkit-scrollbar-thumb]:rounded-full 
        hover:[&::-webkit-scrollbar-thumb]:bg-white/25 
        transition-colors">

        {isMulti ? (
          <>
            {selectedOptions.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Selected</div>
                {selectedOptions.map(opt => renderOption(opt, true))}
              </>
            )}

            {selectedOptions.length > 0 && unselectedOptions.length > 0 && (
              <div className="my-1.5 border-t border-surface-border mx-2 opacity-50" />
            )}

            {unselectedOptions.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Available</div>
                {unselectedOptions.map(opt => renderOption(opt, false))}
              </>
            )}

            {filteredOptions.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                {searchQuery ? 'No results found' : 'No options available'}
              </div>
            )}
          </>
        ) : (
          filteredOptions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              {searchQuery ? 'No results found' : 'No options available'}
            </div>
          ) : (
            filteredOptions.map(opt => renderOption(opt, value === opt.value))
          )
        )}
      </div>
    </div>
  );

  const getTriggerLabel = () => {
    if (isMulti && Array.isArray(value) && value.length > 0) {
      // Find selected options from the original options array to ensure labels are always available
      const currentSelected = options.filter(opt => value.includes(opt.value));
      if (currentSelected.length === 1) return currentSelected[0]?.label || placeholder;
      if (currentSelected.length <= 2) return currentSelected.map(o => o.label).join(', ');
      return `${currentSelected.length} ${selectionLabel || 'items selected'}`;
    }
    const selected = options.find(o => o.value === value);
    return selected ? selected.label : placeholder;
  };

  return (
    <div className={`flex flex-col gap-2 w-full relative ${className}`} ref={dropdownRef}>
      {label && <label className="text-sm font-medium text-gray-400 ml-1">{label}</label>}

      {children ? (
        <div
          ref={triggerRef as any}
          onClick={handleToggle}
          className="cursor-pointer"
        >
          {children}
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          className={`w-full flex items-center justify-between transition-all duration-300 ease-out outline-none rounded-xl ${sizes[size]} text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border relative overflow-hidden ${variant === 'metallic'
            ? 'bg-black/40 border-white/[0.05] font-bold shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] focus:border-white/20 focus:bg-black/60'
            : `bg-surface-input border-2 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 ${error ? 'border-brand-error' : isOpen ? 'border-brand-primary' : 'border-surface-border'}`
            }`}
        >
          {/* Metallic Depth Overlay for Recessed Dropdown */}
          {variant === 'metallic' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Inner Top Shadow for carved-in look */}
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/60 to-transparent" />
              {/* Subtle Diagonal Machined Sheen */}
              <div className={`absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-40`} />
            </div>
          )}
          <div className={`flex items-center ${size === 'sm' ? 'gap-2' : 'gap-3'} overflow-hidden flex-1 mr-2`}>
            {!isMulti && options.find(o => o.value === value)?.icon && <span className="text-brand-primary shrink-0">{options.find(o => o.value === value)?.icon}</span>}
            <div className="flex items-center justify-between flex-1 truncate">
              <span className={`truncate ${(isMulti && (!Array.isArray(value) || value.length === 0)) || (!isMulti && !value) ? 'text-gray-600' : 'text-white'}`}>
                {getTriggerLabel()}
              </span>
              {!isMulti && value && options.find(o => o.value === value)?.description && (
                <span className="text-xs text-gray-500 ml-2 shrink-0">
                  {options.find(o => o.value === value)?.description}
                </span>
              )}
            </div>
          </div>
          <svg
            className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} text-gray-500 transition-transform duration-200 ease-out ${isOpen ? 'rotate-180 text-brand-primary' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {isOpen && createPortal(dropdownMenu, document.body)}

      {error && <span className="text-xs ml-1 text-brand-error">{error}</span>}
    </div>
  );
};

import React, { useState } from 'react';
import { CalendarProps } from '../types';

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateChange, className = "" }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const renderDays = () => {
    const totalDays = daysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
    const startOffset = startDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
    const elements = [];

    // Empty cells for offset
    for (let i = 0; i < startOffset; i++) {
      elements.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const isSelected = selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth.getMonth() &&
        selectedDate.getFullYear() === currentMonth.getFullYear();

      elements.push(
        <button
          key={day}
          onClick={() => {
            // Create local date at noon to avoid midnight boundary issues
            const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0);
            onDateChange?.(d);
          }}
          className={`h-9 w-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${isSelected
              ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
              : 'text-gray-400 hover:bg-white/[0.08] hover:text-white'
            }`}
        >
          {day}
        </button>
      );
    }
    return elements;
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  return (
    <div className={`bg-surface-card border border-surface-border rounded-2xl p-4 w-[280px] shadow-nova ${className}`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <h4 className="font-bold text-white text-sm">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h4>
        <div className="flex gap-1">
          <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-all text-gray-500 hover:text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-all text-gray-500 hover:text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {days.map(d => <span key={d} className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
    </div>
  );
};

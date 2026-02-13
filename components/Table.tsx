import React from 'react';
import { TableProps } from '../types';
import { EmptyState, SkeletonTable } from './Feedback';

export function Table<T>({
  columns = [],
  data = [],
  onRowClick,
  emptyMessage = "No data available",
  className = "",
  isLoading = false,
  isMetallicHeader = false
}: TableProps<T>) {
  if (isLoading) {
    return <SkeletonTable rows={5} className={className} />;
  }

  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-nova ${className}`}>
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 transition-colors">
        <table className="w-full text-left border-collapse table-auto">
          <thead className={isMetallicHeader ? "relative z-20" : ""}>
            <tr
              className={`
                ${isMetallicHeader
                  ? 'bg-white/[0.03] relative'
                  : 'bg-surface-overlay border-b border-surface-border'}
              `}
              style={isMetallicHeader ? {
                backgroundImage: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
                backgroundSize: '100% 100%'
              } : {}}
            >
              {columns.map((col, idx) => {
                const headerAlignmentClasses = col.className
                  ? col.className.split(' ').filter(c =>
                    (c.startsWith('text-') && ['left', 'center', 'right'].includes(c.split('-')[1])) ||
                    c.startsWith('w-') ||
                    c.startsWith('min-w-')
                  ).join(' ')
                  : '';

                return (
                  <th
                    key={idx}
                    className={`px-6 py-4 text-[11px] font-bold uppercase tracking-widest ${isMetallicHeader ? 'text-white' : 'text-gray-400'} ${headerAlignmentClasses} relative`}
                  >
                    {isMetallicHeader && idx === 0 && (
                      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                    )}
                    {isMetallicHeader && (
                      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-surface-border/50 pointer-events-none" />
                    )}
                    {col.header}
                  </th>
                );
              })}
            </tr>
            {isMetallicHeader && (
              <tr className="h-0 p-0 border-none pointer-events-none">
                <td colSpan={columns.length} className="p-0 relative h-0 border-none">
                  {/* Nova Elevated Shadow Depth Falloff */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
                    <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
                  </div>
                </td>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-surface-border">
            {!data || data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="mb-4 text-gray-600">
                      <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No Data</h3>
                    <p className="text-gray-400 max-w-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr
                  key={rowIdx}
                  onClick={() => onRowClick?.(item)}
                  className={`transition-all duration-200 ease-out group ${onRowClick
                    ? 'cursor-pointer hover:bg-white/[0.06] active:bg-white/[0.08]'
                    : 'hover:bg-white/[0.03]'
                    }`}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`px-6 py-4 text-sm text-gray-300 ${colIdx % 2 === 1 ? 'bg-white/[0.02]' : ''} ${col.className || ''}`}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
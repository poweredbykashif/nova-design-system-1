import React from 'react';

export const Tabs: React.FC<{
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}> = ({ tabs, activeTab, onTabChange, className = '' }) => {
  return (
    <div className={`flex items-center gap-1.5 p-1.5 bg-black/40 border border-white/5 rounded-2xl w-fit shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors duration-200 text-sm font-medium outline-none overflow-hidden ${activeTab === tab.id
            ? 'text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
          {/* Active State Background & Border */}
          {activeTab === tab.id && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2),0_10px_15px_-3px_rgba(255,77,45,0.3)] rounded-xl animate-in fade-in zoom-in-95 duration-200" />
          )}

          {/* Metallic Shine Overlay */}
          {activeTab === tab.id && (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50 z-10" />
          )}

          <span className="relative z-20 flex items-center gap-2">
            {tab.icon}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export const Breadcrumbs: React.FC<{ items: { label: string; href?: string }[] }> = ({ items }) => {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-gray-600">/</span>}
          <span className={`${idx === items.length - 1 ? 'text-white font-medium' : 'text-gray-500 hover:text-gray-300 transition-colors'}`}>
            {item.label}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
};

export const Pagination: React.FC<{ current: number; total: number; onChange: (p: number) => void }> = ({ current, total, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        className="p-2 bg-surface-overlay border border-surface-border rounded-xl disabled:opacity-50 hover:bg-surface-card transition-colors outline-none"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      {[...Array(total)].map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i + 1)}
          className={`relative w-10 h-10 rounded-xl transition-colors duration-200 font-bold outline-none overflow-hidden ${current === i + 1
            ? 'text-white'
            : 'bg-surface-overlay border border-surface-border text-gray-400 hover:text-white hover:bg-surface-card'
            }`}
        >
          {/* Active State Background & Border */}
          {current === i + 1 && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2),0_4px_12px_-2px_rgba(255,77,45,0.3)] rounded-xl animate-in fade-in zoom-in-95 duration-200" />
          )}

          {/* Metallic Shine Overlay */}
          {current === i + 1 && (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50 z-10" />
          )}
          <span className="relative z-20">{i + 1}</span>
        </button>
      ))}
      <button
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        className="p-2 bg-surface-overlay border border-surface-border rounded-xl disabled:opacity-50 hover:bg-surface-card transition-colors outline-none"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};
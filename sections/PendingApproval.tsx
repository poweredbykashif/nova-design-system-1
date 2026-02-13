import React from 'react';
import Button from '../components/Button';

interface PendingApprovalProps {
    role: string | null;
    onSignOut?: () => void;
}

const PendingApproval: React.FC<PendingApprovalProps> = ({ role, onSignOut }) => {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface-bg">
            <div className="relative w-full max-w-md bg-surface-card bg-surface-overlay/20 border border-surface-border p-10 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-500 -mt-8 overflow-hidden group">
                {/* Diagonal Metallic Shine Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none z-10" />

                {/* Center-weighted Shadow Depth Falloff */}
                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] pointer-events-none z-0">
                    <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
                </div>

                {/* Icon */}
                <div className="relative z-20 flex justify-center mb-8">
                    <div className="relative">
                        <div className="w-24 h-24 bg-brand-warning/10 rounded-full flex items-center justify-center border-2 border-brand-warning/30">
                            <svg className="w-12 h-12 text-brand-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        {/* Pulse animation */}
                        <div className="absolute inset-0 w-24 h-24 bg-brand-warning/20 rounded-full animate-ping" />
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-20 text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-3">Pending Approval</h2>
                    <p className="text-gray-400 text-lg mb-2">
                        Your profile is under review
                    </p>
                    <p className="text-gray-500 text-sm">
                        We're reviewing your {role || 'account'} registration. You'll be notified once approved.
                    </p>
                </div>

                {/* Actions */}
                <div className="relative z-20 pt-6 border-t border-surface-border">
                    <Button
                        variant="metallic"
                        onClick={onSignOut}
                        className="w-full"
                    >
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;

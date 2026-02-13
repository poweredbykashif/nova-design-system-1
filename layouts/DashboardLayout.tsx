import React, { useState, useEffect } from 'react';
import {
  IconLayout,
  IconCreditCard,
  IconCloudUpload,
  IconUser,
  IconFilter,
  IconRefreshCw,
  IconSettings,
  IconLogout,
  IconBell,
  IconChevronLeft,
  IconChevronRight,
  IconMessageSquare,
  IconLink,
  IconBriefcase,
  IconLayoutSidebar,
  IconBuilding,
  IconBox,
  IconDollar
} from '../components/Icons';
import { Avatar } from '../components/Avatar';
import { supabase } from '../lib/supabase';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import { Card, Modal } from '../components/Surfaces';
import Button from '../components/Button';

import { useUser } from '../contexts/UserContext';

export type DashboardView = 'Dashboard' | 'Projects' | 'Finances' | 'Earnings' | 'Accounts' | 'Assets' | 'Chats' | 'Users' | 'Channels' | 'Integrations' | 'Settings' | 'Reminders';

export const DashboardLayout: React.FC<{
  children: React.ReactNode;
  onSignOut?: () => void;
  activeItem: DashboardView;
  onItemSelect: (item: DashboardView) => void;
  onProjectOpen?: (projectId: string) => void;
  noPadding?: boolean;
}> = ({ children, onSignOut, activeItem, onItemSelect, onProjectOpen, noPadding }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { notifications, fetchNotifications } = useNotifications();
  const { profile } = useUser();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);

    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    // Refresh notifications from context
    await fetchNotifications();
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications?.filter(n => !n.is_read).map(n => n.id) || [];

    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      // Refresh notifications from context
      await fetchNotifications();
    }
  };

  const isFreelancer = profile?.role === 'Freelancer';

  const navItems: { name: DashboardView; icon: React.ReactNode }[] = isFreelancer
    ? [
      { name: 'Dashboard', icon: <IconLayout /> },
      { name: 'Projects', icon: <IconBriefcase /> },
      { name: 'Earnings', icon: <IconDollar /> },
      { name: 'Assets', icon: <IconBox /> },
      { name: 'Chats', icon: <IconMessageSquare /> },
      { name: 'Reminders', icon: <IconBell /> },
      { name: 'Channels', icon: <IconFilter /> },
      { name: 'Settings', icon: <IconSettings /> },
    ]
    : [
      { name: 'Dashboard', icon: <IconLayout /> },
      { name: 'Projects', icon: <IconBriefcase /> },
      { name: 'Finances', icon: <IconDollar /> },
      { name: 'Accounts', icon: <IconCreditCard /> },
      { name: 'Assets', icon: <IconBox /> },
      { name: 'Chats', icon: <IconMessageSquare /> },
      { name: 'Reminders', icon: <IconBell /> },
      { name: 'Users', icon: <IconUser /> },
      { name: 'Channels', icon: <IconFilter /> },
      { name: 'Integrations', icon: <IconLink /> },
      { name: 'Settings', icon: <IconSettings /> },
    ];

  return (
    <div className="flex h-screen bg-surface-bg text-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-surface-border sticky top-0 h-screen transition-all duration-300 ease-in-out ${isExpanded ? 'w-56' : 'w-20'}`}
      >
        <div className={`h-20 shrink-0 flex items-center border-b border-surface-border transition-all duration-300 ${isExpanded ? 'px-5 gap-3' : 'justify-center'}`}>
          <div className="shrink-0">
            <Avatar
              size={isExpanded ? "sm" : "md"}
              status="online"
              src={profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"}
              initials={profile?.name?.split(' ').map(n => n[0]).join('')}
              className="transition-all duration-300"
            />
          </div>
          <div className={`flex flex-col min-w-0 transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 pointer-events-none w-0 h-0 overflow-hidden'}`}>
            <span className="text-sm font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
              {profile?.name
                ? profile.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
                : 'Loading...'}
            </span>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest whitespace-nowrap overflow-hidden text-ellipsis min-w-0">{profile?.role || 'User'}</span>
          </div>
        </div>

        <nav className="flex-1 px-3 mt-6 space-y-2 overflow-x-hidden">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => onItemSelect(item.name)}
              className={`w-full flex items-center h-12 transition-none font-medium group relative rounded-xl px-4 overflow-hidden outline-none focus:outline-none ${activeItem === item.name
                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white border border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2),0_8px_16px_-4px_rgba(255,77,45,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
            >
              {/* Metallic Shine Overlay */}
              {activeItem === item.name && (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50" />
              )}

              <span className={`shrink-0 transition-colors relative z-10 ${activeItem === item.name ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className={`ml-3 transition-all duration-300 font-semibold whitespace-nowrap overflow-hidden text-ellipsis min-w-0 relative z-10 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'} ${activeItem === item.name ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                {item.name}
              </span>

              {/* Tooltip for collapsed state */}
              <div className={`absolute left-full ml-4 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-xs font-bold text-white whitespace-nowrap shadow-xl z-50 transition-all duration-200 ${!isExpanded ? 'opacity-0 invisible group-hover:opacity-100 group-hover:visible' : 'opacity-0 invisible pointer-events-none'}`}>
                {item.name}
              </div>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-surface-border space-y-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full h-12 flex items-center transition-all duration-200 group relative rounded-xl px-4 hover:bg-white/[0.04]"
          >
            <span className="shrink-0 transition-colors text-gray-400 group-hover:text-white">
              <IconLayoutSidebar />
            </span>
            <span className={`ml-3 font-medium transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'} text-gray-400 group-hover:text-white`}>
              {isExpanded ? 'Collapse' : 'Expand Menu'}
            </span>

            {/* Tooltip for collapsed state */}
            <div className={`absolute left-full ml-4 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-xs font-bold text-white whitespace-nowrap shadow-xl z-50 transition-all duration-200 ${!isExpanded ? 'opacity-0 invisible group-hover:opacity-100 group-hover:visible' : 'opacity-0 invisible pointer-events-none'}`}>
              Expand Menu
            </div>
          </button>

          <button
            onClick={onSignOut}
            className="w-full h-12 flex items-center transition-all duration-200 group relative rounded-xl px-4 hover:bg-white/[0.04]"
          >
            <span className="shrink-0 transition-colors text-gray-400 group-hover:text-white">
              <IconLogout />
            </span>
            <span className={`ml-3 font-medium transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'} text-gray-400 group-hover:text-white`}>
              Sign Out
            </span>

            {/* Tooltip for collapsed state */}
            <div className={`absolute left-full ml-4 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-xs font-bold text-white whitespace-nowrap shadow-xl z-50 transition-all duration-200 ${!isExpanded ? 'opacity-0 invisible group-hover:opacity-100 group-hover:visible' : 'opacity-0 invisible pointer-events-none'}`}>
              Sign Out
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 transition-all duration-300 overflow-hidden">
        <header className="h-20 border-b border-surface-border flex items-center justify-between px-8 bg-surface-bg/50 backdrop-blur-xl sticky top-0 z-30 w-full">
          <div className="flex items-center gap-4 min-w-[200px]">
            <h2 className="text-lg font-bold">{activeItem}</h2>
          </div>

          {/* Centered Slot for Page-Specific Controls (e.g. Projects Search) */}
          <div id="header-center-slot" className="flex-1 flex justify-center items-center h-full px-4" />

          <div className="flex items-center gap-2 min-w-[200px] justify-end relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-white transition-all"
            >
              <IconBell />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-brand-primary rounded-full border-2 border-surface-bg flex items-center justify-center text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Panel */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-96 bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-surface-border flex items-center justify-between">
                  <h3 className="font-bold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-brand-primary hover:text-brand-primary/80 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications === null ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 border-b border-surface-border last:border-0 cursor-pointer transition-colors ${notification.is_read ? 'bg-transparent' : 'bg-brand-primary/5 hover:bg-brand-primary/10'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notification.is_read ? 'bg-gray-600' : 'bg-brand-primary'
                            }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className={`${noPadding ? '' : 'p-8'} flex-1 flex flex-col overflow-y-auto scrollbar-hide`}>
          {children}
        </main>
      </div>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowNotifications(false)}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Notification Details"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="px-8 h-12 text-sm font-bold"
            >
              Close
            </Button>
            {selectedNotification?.reference_id && (
              <Button
                variant="primary"
                onClick={() => {
                  if (onProjectOpen && selectedNotification.reference_id) {
                    onItemSelect('Projects');
                    onProjectOpen(selectedNotification.reference_id);
                    setIsModalOpen(false);
                  }
                }}
                className="px-8 h-12 text-sm font-bold bg-brand-primary"
              >
                Open Project
              </Button>
            )}
          </div>
        }
      >
        {selectedNotification && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-2">
            <div className="space-y-6">
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-white">
                  {selectedNotification.type === 'project_created' && 'New Project Created'}
                  {selectedNotification.type === 'timeline_update' && 'Timeline Update'}
                  {!['project_created', 'timeline_update'].includes(selectedNotification.type) && 'Notification Update'}
                </h3>

                <div className="space-y-4">
                  {selectedNotification.reference_id && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest w-24">Project ID:</span>
                      <span className="text-sm font-mono text-brand-primary font-bold">{selectedNotification.reference_id}</span>
                    </div>
                  )}

                  {selectedNotification.type === 'timeline_update' && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Update Summary</span>
                      <p className="text-sm text-gray-400 bg-white/[0.03] border border-white/5 rounded-xl p-4 leading-relaxed">
                        {selectedNotification.message.includes(':')
                          ? selectedNotification.message.split(':')[0].trim()
                          : selectedNotification.message}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                <span>Log Entry</span>
                <span className="text-gray-400">
                  {new Date(selectedNotification.created_at).toLocaleString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

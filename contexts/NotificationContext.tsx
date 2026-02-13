import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Notification {
    id: string;
    type: string;
    reference_id: string | null;
    message: string;
    is_read: boolean;
    created_at: string;
}

interface NotificationContextType {
    notifications: Notification[] | null;
    fetchNotifications: () => Promise<void>;
    addNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3';

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[] | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isInitialLoad = useRef(true);
    const prevCount = useRef<number>(0);

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 1.0; // Max volume for better noticeability
    }, []);

    const playSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.warn('Sound play failed (interaction required):', e));
        }
    };

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data);
            prevCount.current = data.length;
        }
    };

    const addNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
        const { data, error } = await supabase
            .from('notifications')
            .insert([notification])
            .select()
            .single();

        if (!error && data) {
            // State update triggers the sound effect below
            setNotifications(prev => {
                const exists = prev?.some(n => n.id === data.id);
                if (exists) return prev;
                return [data, ...(prev || [])];
            });
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchNotifications().then(() => {
            // Brief delay to ensure initial state doesn't trigger sound
            setTimeout(() => {
                isInitialLoad.current = false;
            }, 100);
        });
    }, []);

    // Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('notifications_changes')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => {
                        const exists = prev?.some(n => n.id === newNotif.id);
                        if (exists) return prev;
                        return [newNotif, ...(prev || [])];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Sound Trigger Logic
    useEffect(() => {
        if (!isInitialLoad.current && notifications !== null) {
            if (notifications.length > prevCount.current) {
                playSound();
            }
            prevCount.current = notifications.length;
        }
    }, [notifications]);

    return (
        <NotificationContext.Provider value={{ notifications, fetchNotifications, addNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

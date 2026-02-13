
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import {
    IconChevronLeft,
    IconLayoutSidebar,
    IconBriefcase,
    IconClock,
    IconUser,
    IconCreditCard,
    IconAlertTriangle,
    IconPaperclip,
    IconSend,
    IconCheckCircle,
    IconMoreVertical,
    IconX,
    IconFile,
    IconFileImage,
    IconFileText,
    IconChartBar,
    IconFileVideo,
    IconFileArchive,
    IconDownload,
    IconLink,
    IconRefreshCw,
    IconChevronRight,
    IconCalendar
} from '../components/Icons';
import { formatTime, formatDeadlineDate, getTimeLeft } from '../utils/formatter';
import { DatePicker } from '../components/DatePicker';
import { TimeSelect } from '../components/TimeSelect';
import { ElevatedMetallicCard } from '../components/ElevatedMetallicCard';
import { Dropdown } from '../components/Dropdown';
import { addToast } from '../components/Toast';
import { useNotifications } from '../contexts/NotificationContext';
import { useUser } from '../contexts/UserContext';

interface ProjectDetailsProps {
    projectId: string;
    onBack: () => void;
    onStatusChange?: () => void;
}

// Helper for dynamic status styles driven by Nova Design System tokens
const getStatusStyles = (status: string) => {
    const s = status?.toLowerCase() || '';

    // Done Status: NO COLOR (Neutral/Border Only) - per user request
    if (s.includes('done')) {
        return 'bg-white/[0.02] border-white/10 text-gray-400';
    }

    // In Progress Status: GREEN - per user request
    if (s.includes('in progress')) {
        return 'bg-brand-success/10 border-brand-success/20 text-brand-success';
    }

    // Approved: High Success Green
    if (s.includes('approved')) {
        return 'bg-brand-success/15 border-brand-success/30 text-brand-success';
    }

    // Urgent State: 
    if (s.includes('urgent')) {
        return 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary';
    }

    // Warning State: Revision
    if (s.includes('revision')) {
        return 'bg-brand-warning/10 border-brand-warning/20 text-brand-warning';
    }

    // Error State: Cancelled, Removed
    if (s.includes('cancelled') || s.includes('removed')) {
        return 'bg-brand-error/10 border-brand-error/20 text-brand-error';
    }

    // Default Neutral for Others
    return 'bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary';
};

const getRoleStyles = (role: string = 'Project Manager') => {
    const r = role.toLowerCase();
    if (r.includes('admin')) return {
        color: 'text-brand-error',
        bg: 'bg-brand-error/10',
        border: 'border-brand-error/20',
        label: 'Admin',
        glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]'
    };
    if (r.includes('manager')) return {
        color: 'text-brand-secondary',
        bg: 'bg-brand-secondary/10',
        border: 'border-brand-secondary/20',
        label: 'Project Manager',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]'
    };
    if (r.includes('presentation')) return {
        color: 'text-brand-accent',
        bg: 'bg-brand-accent/10',
        border: 'border-brand-accent/20',
        label: 'Presentation Designer',
        glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]'
    };
    if (r.includes('designer')) return {
        color: 'text-brand-success',
        bg: 'bg-brand-success/10',
        border: 'border-brand-success/20',
        label: 'Designer',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]'
    };
    return {
        color: 'text-gray-400',
        bg: 'bg-gray-400/10',
        border: 'border-gray-400/10',
        label: 'Team Member',
        glow: ''
    };
};

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ projectId, onBack, onStatusChange }) => {
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [currentRole, setCurrentRole] = useState('Project Manager');
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const { addNotification } = useNotifications();
    const { profile } = useUser();

    // Sync role from profile
    useEffect(() => {
        if (profile?.role) {
            setCurrentRole(profile.role);
        }
    }, [profile]);
    interface Attachment {
        file: File;
        id: string;
        status: 'uploading' | 'success' | 'error';
        previewUrl?: string;
    }

    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles: Attachment[] = Array.from(e.target.files).map((file: File) => ({
                file,
                id: Math.random().toString(36).substr(2, 9),
                status: 'uploading' as const
            }));

            setAttachments(prev => [...prev, ...newFiles]);

            // Simulate upload & convert to Data URI for persistence
            newFiles.forEach(att => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const persistentUrl = e.target?.result as string;

                    setTimeout(() => {
                        setAttachments(prev => prev.map(p =>
                            p.id === att.id
                                ? { ...p, status: 'success', previewUrl: persistentUrl }
                                : p
                        ));
                    }, 1500 + Math.random() * 1000);
                };
                reader.readAsDataURL(att.file);
            });
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };


    const removeAttachment = (index: number) => {
        setAttachments(prev => {
            const newAttachments = [...prev];
            const removed = newAttachments.splice(index, 1)[0];
            if (removed.previewUrl) {
                URL.revokeObjectURL(removed.previewUrl);
            }
            return newAttachments;
        });
    };

    const fetchComments = async () => {
        // Fetch the 6 most recent comments to check for 'hasMore'
        const { data, error } = await supabase
            .from('project_comments')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(6);

        if (!error && data) {
            if (data.length > 5) {
                setHasMore(true);
                // Use only the latest 5
                const visibleComments = data.slice(0, 5);
                setComments(visibleComments.reverse());
            } else {
                setHasMore(false);
                setComments([...data].reverse());
            }
        }
    };

    const fetchOlderComments = async () => {
        if (isLoadingOlder || comments.length === 0) return;
        setIsLoadingOlder(true);

        // Get the timestamp of the oldest comment we currently have
        // (Since they are reversed, comments[0] is the oldest visible)
        const oldestTimestamp = comments[0].created_at;

        const { data, error } = await supabase
            .from('project_comments')
            .select('*')
            .eq('project_id', projectId)
            .lt('created_at', oldestTimestamp)
            .order('created_at', { ascending: false })
            .limit(6);

        if (!error && data) {
            if (data.length > 5) {
                setHasMore(true);
                const newBatch = data.slice(0, 5);
                setComments(prev => [...newBatch.reverse(), ...prev]);
            } else {
                setHasMore(false);
                setComments(prev => [...data.reverse(), ...prev]);
            }
        }
        setIsLoadingOlder(false);
    };

    const fetchProject = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*, primary_manager:profiles!primary_manager_id (name)')
            .eq('project_id', projectId)
            .single();

        if (!error && data) {
            setProject(data);
        }
    };

    const forceDownload = async (url: string, filename: string) => {
        if (!url) return;

        const getExtensionFromMime = (mime: string): string => {
            const map: Record<string, string> = {
                'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
                'image/webp': 'webp', 'application/pdf': 'pdf', 'application/msword': 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
                'application/zip': 'zip', 'application/postscript': 'ai',
                'image/vnd.adobe.photoshop': 'psd', 'text/plain': 'txt',
                'video/mp4': 'mp4', 'image/svg+xml': 'svg'
            };
            return map[mime] || '';
        };

        let finalFilename = filename;

        try {
            // Priority 1: Data URIs (Base64)
            if (url.startsWith('data:')) {
                const response = await fetch(url);
                const blob = await response.blob();

                if (!finalFilename.includes('.')) {
                    const ext = getExtensionFromMime(blob.type);
                    if (ext) finalFilename += `.${ext}`;
                }

                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = finalFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                return;
            }

            // Priority 2: Supabase Storage URLs
            // If it's a supabase URL, we can use the download param trick
            if (url.includes('.sslip.io') || url.includes('supabase.co')) {
                const downloadUrl = new URL(url);
                // Supabase honors ?download=filename on public requests
                downloadUrl.searchParams.set('download', finalFilename);

                const link = document.createElement('a');
                link.href = downloadUrl.toString();
                link.download = finalFilename;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }

            // Priority 3: Standard Fetch & Blob (Best for CORS-enabled servers)
            const response = await fetch(url, { method: 'GET', mode: 'cors' });
            const blob = await response.blob();

            if (!finalFilename.includes('.')) {
                const ext = getExtensionFromMime(blob.type);
                if (ext) finalFilename += `.${ext}`;
            }

            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = finalFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        } catch (error) {
            console.warn('Advanced download failed, using emergency window fallback:', error);
            window.open(url, '_blank');
        }
    };

    // Helper component for consistent file icons
    const FileIcon: React.FC<{ name: string; type?: string; url?: string; className?: string }> = ({ name, type, url, className = "w-full h-full" }) => {
        const ext = name.split('.').pop()?.toLowerCase() || '';
        const isImage = type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);

        // Map extensions to specialized brand icons from /public
        if (ext === 'ai') return <img src="/icons/ai-document.png" className={`${className} object-contain p-2`} alt="AI" />;
        if (ext === 'psd') return <img src="/psd-icon.png" className={`${className} object-contain p-2`} alt="PSD" />;
        if (ext === 'pdf') return <img src="/pdf-icon.png" className={`${className} object-contain p-2`} alt="PDF" />;
        if (ext === 'png') return <img src="/png-icon.png" className={`${className} object-contain p-2`} alt="PNG" />;
        if (['jpg', 'jpeg'].includes(ext)) return <img src="/jpg-icon.png" className={`${className} object-contain p-2`} alt="JPG" />;
        if (ext === 'eps') return <img src="/eps-icon.png" className={`${className} object-contain p-2`} alt="EPS" />;
        if (['zip', 'rar', '7z'].includes(ext)) return <img src="/zip-icon.png" className={`${className} object-contain p-2`} alt="ZIP" />;
        if (['doc', 'docx'].includes(ext)) return <img src="/doc-icon.png" className={`${className} object-contain p-2`} alt="Word" />;
        if (['xls', 'xlsx'].includes(ext)) return <img src="/xls-icon.png" className={`${className} object-contain p-2`} alt="Excel" />;
        if (ext === 'txt') return <img src="/txt-icon.png" className={`${className} object-contain p-2`} alt="TXT" />;
        if (['html', 'htm'].includes(ext)) return <img src="/html-icon.png" className={`${className} object-contain p-2`} alt="HTML" />;
        if (ext === 'mp3') return <img src="/mp3-icon.png" className={`${className} object-contain p-2`} alt="MP3" />;
        if (ext === 'gif') return <img src="/gif-icon.png" className={`${className} object-contain p-2`} alt="GIF" />;

        // Image preview if it's a generic image
        if (isImage && url) {
            return (
                <>
                    <img src={url} className="w-full h-full object-cover" alt={name} />
                    <div className="absolute inset-0 bg-black/5" />
                </>
            );
        }

        // Final Gradient Fallback for everything else
        let gradient = 'from-slate-600 to-slate-700';
        let Icon = IconFile;
        if (['mp4', 'mov', 'avi'].includes(ext)) { gradient = 'from-violet-500 to-purple-600'; Icon = IconFileVideo; }

        return (
            <div className={`flex flex-col items-center justify-center bg-gradient-to-br ${gradient} p-2 shadow-inner h-full w-full`}>
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                <Icon size={24} className="text-white drop-shadow-md relative z-10" />
                <span className="text-[9px] font-bold text-white uppercase mt-1 tracking-widest drop-shadow-sm relative z-10 opacity-90">{ext.slice(0, 4)}</span>
            </div>
        );
    };

    useEffect(() => {
        const fetchData = async () => {
            // Fetch both in parallel, project will update sidebar as soon as it arrives
            // but we keep loading=true for the timeline until comments are done.
            setLoading(true);
            const p1 = fetchProject();
            const p2 = fetchComments();
            await Promise.all([p1, p2]);
            setLoading(false);
        };

        fetchData();
    }, [projectId]);

    const handlePostComment = async () => {
        if ((!newComment.trim() && attachments.length === 0) || isPostingComment) return;

        setIsPostingComment(true);

        // Generate a stable ID for both UI key and Database ID 
        // to prevent double animation during background sync
        const stableId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `temp-${Date.now()}`;

        // Create optimistic comment for instant UI feedback
        const optimisticComment = {
            id: stableId,
            project_id: projectId,
            content: newComment.trim() || ' ',
            attachments: attachments.map(att => ({
                name: att.file.name,
                type: att.file.type,
                size: att.file.size,
                url: att.previewUrl
            })),
            author_name: profile?.name || 'User',
            author_role: currentRole,
            created_at: new Date().toISOString(),
            isOptimistic: true // Flag to identify temporary comments
        };

        // Add optimistic comment immediately
        setComments(prev => [...prev, optimisticComment]);

        // Clear input immediately for better UX
        const commentText = newComment.trim();
        const commentAttachments = attachments;
        setNewComment('');
        setAttachments([]);

        // End loading state immediately for instant feedback
        setIsPostingComment(false);

        // Sync with database in background
        const payloadAttachments = commentAttachments.map(att => ({
            name: att.file.name,
            type: att.file.type,
            size: att.file.size,
            url: att.previewUrl
        }));

        const { error } = await supabase
            .from('project_comments')
            .insert([{
                id: stableId, // Use the same ID to prevent key change animation
                project_id: projectId,
                content: commentText || ' ',
                attachments: payloadAttachments,
                author_name: profile?.name || 'User',
                author_role: currentRole
            }]);

        if (error) {
            console.error('Error posting comment:', error);
            // Remove optimistic comment on error
            setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
            // Restore input
            setNewComment(commentText);
            setAttachments(commentAttachments);
            addToast({ type: 'error', title: 'Post Failed', message: 'Could not send your comment. Please try again.' });
        } else {
            addToast({ type: 'success', title: 'Comment Sent', message: 'Your comment has been posted' });

            // Add notification with sound trigger
            const commentSnippet = commentText.length > 30 ? commentText.substring(0, 30) + '...' : commentText;
            const notificationMessage = payloadAttachments.length > 0
                ? `Files added to timeline : ${project?.project_title || projectId}`
                : `${commentSnippet || 'New comment'} : ${project?.project_title || projectId}`;

            await addNotification({
                type: 'timeline_update',
                reference_id: projectId,
                message: notificationMessage,
                is_read: false
            });

            // Mark as persistent locally to avoid re-fetch trimming flicker
            setComments(prev => prev.map(c =>
                c.id === stableId ? { ...c, isOptimistic: false } : c
            ));
        }
    };

    const handleDateChange = async (date: Date) => {
        if (!project) return;

        // Optimistic update
        const dateStr = date.toISOString().split('T')[0];
        const previousDate = project.due_date;

        setProject((prev: any) => ({ ...prev, due_date: dateStr }));

        const { error } = await supabase
            .from('projects')
            .update({ due_date: dateStr })
            .eq('project_id', projectId);

        if (error) {
            console.error('Error updating project date:', error);
            // Revert on error
            setProject((prev: any) => ({ ...prev, due_date: previousDate }));
            addToast({ type: 'error', title: 'Update Failed', message: 'Could not update deadline date' });
        } else {
            addToast({ type: 'success', title: 'Date Updated', message: `Deadline set to ${formatDeadlineDate(dateStr)}` });
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!project) return;

        const previousStatus = project.status;
        setProject((prev: any) => ({ ...prev, status: newStatus }));

        const { error } = await supabase
            .from('projects')
            .update({ status: newStatus })
            .eq('project_id', projectId);

        if (error) {
            console.error('Error updating status:', error);
            setProject((prev: any) => ({ ...prev, status: previousStatus }));
            addToast({ type: 'error', title: 'Update Failed', message: 'Could not update project status' });
        } else {
            // 1. Generate a stable ID for both UI key and Database ID 
            const stableId = (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : `temp-${Date.now()}`;

            // 2. Optimistic Status Change Card
            const optimisticStatusCard = {
                id: stableId,
                project_id: projectId,
                content: `STATUS_CHANGED:${previousStatus || 'Pending'}:${newStatus}`,
                author_name: profile?.name || 'User',
                author_role: currentRole,
                created_at: new Date().toISOString(),
                isOptimistic: true
            };

            // 3. Update UI Immediately
            setComments(prev => [...prev, optimisticStatusCard]);
            addToast({ type: 'success', title: 'Status Updated', message: `Project status is now ${newStatus}` });

            // 4. Process side effects in background (Async)
            const syncSideEffects = async () => {
                // Record status change in timeline
                const { error: insertError } = await supabase
                    .from('project_comments')
                    .insert([{
                        id: stableId,
                        project_id: projectId,
                        content: `STATUS_CHANGED:${previousStatus || 'Pending'}:${newStatus}`,
                        author_name: profile?.name || 'User',
                        author_role: currentRole
                    }]);

                if (insertError) {
                    console.error('Error inserting status comment:', insertError);
                    // Revert UI if needed, but usually we just leave it since the project status itself updated
                }

                // Add notification
                await addNotification({
                    type: 'status_update',
                    reference_id: projectId,
                    message: `Status changed to ${newStatus} : ${project?.project_title || projectId}`,
                    is_read: false
                });

                // Refresh timeline to sync with server - with stableId, this won't cause double animation
                setComments(prev => prev.map(c =>
                    c.id === stableId ? { ...c, isOptimistic: false } : c
                ));

                // Trigger parent update so project moves between tabs
                if (onStatusChange) onStatusChange();
            };

            syncSideEffects().catch(err => console.error('Error syncing status side effects:', err));
        }
    };

    const handleTimeChange = async (newTime: string) => {
        if (!project) return;

        const previousTime = project.due_time;
        setProject((prev: any) => ({ ...prev, due_time: newTime }));

        const { error } = await supabase
            .from('projects')
            .update({ due_time: newTime })
            .eq('project_id', projectId);
        if (error) {
            console.error('Error updating status:', error);
            setProject((prev: any) => ({ ...prev, due_time: previousTime }));
            addToast({ type: 'error', title: 'Update Failed', message: 'Could not update project deadline time' });
        } else {
            addToast({ type: 'success', title: 'Time Updated', message: `Deadline time set to ${formatTime(newTime)}` });
        }
    };

    const handleTriggerAlert = async (alertType: string) => {
        if (!project) return;

        const isArtHelp = alertType === 'Art Help';
        const isDispute = alertType === 'Dispute';
        const isNone = alertType === 'None';

        const updateData: any = {
            has_art_help: isArtHelp,
            has_dispute: isDispute
        };

        const { error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('project_id', projectId);

        if (error) {
            console.error('Error triggering alert:', error);
            addToast({ type: 'error', title: 'Error', message: 'Failed to trigger alert' });
        } else {
            setProject((prev: any) => ({
                ...prev,
                has_art_help: isArtHelp,
                has_dispute: isDispute
            }));
            addToast({
                type: 'success',
                title: 'Alert Triggered',
                message: isNone ? 'Alerts cleared' : `${alertType} alert has been triggered`
            });

            // Trigger parent refresh if it exists
            if (onStatusChange) onStatusChange();
        }
    };

    // Removed global early returns for loading and project-not-found states 
    // to allow the sidebar and header to render immediately.


    return (
        <div className="flex h-full w-full overflow-hidden bg-surface-bg animate-in fade-in duration-500">
            {/* 1. LEFT COLUMN - METADATA SIDEBAR */}
            <aside
                className={`${isSidebarCollapsed ? 'w-[80px]' : 'w-[360px]'} flex flex-col h-full border-r border-surface-border bg-surface-bg shrink-0 overflow-hidden transition-all duration-300 ease-in-out relative z-30`}
            >
                {/* Fixed Header */}
                <header className="h-20 shrink-0 border-b border-surface-border flex items-center px-4">
                    <div className="w-full flex items-center justify-between">
                        {!isSidebarCollapsed && (
                            <>
                                <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all shrink-0">
                                    <IconChevronLeft size={20} />
                                </button>
                                <h3 className="flex-1 text-center text-sm font-bold text-white uppercase tracking-widest whitespace-nowrap px-4 animate-in fade-in duration-300">
                                    Project Details
                                </h3>
                            </>
                        )}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className={`p-3 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all shrink-0 ${isSidebarCollapsed ? 'mx-auto' : ''}`}
                            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            <IconLayoutSidebar size={24} />
                        </button>
                    </div>
                </header>

                {/* Scrollable Content Container */}
                <div
                    className={`flex-1 space-y-8 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? 'px-0 py-10 no-scrollbar' : 'p-10 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent'}`}
                >
                    {/* Identification */}
                    <MetadataSection
                        title="Identification"
                        isCollapsed={isSidebarCollapsed}
                        collapsedHeight="h-40"
                    >
                        <MetadataItem label="Project ID" value={project?.project_id || ''} isMono />
                        <MetadataItem label="Project Title" value={project?.project_title || 'Untitled'} />
                    </MetadataSection>

                    {/* Team */}
                    <MetadataSection
                        title="Team"
                        isCollapsed={isSidebarCollapsed}
                        collapsedHeight="h-80"
                    >
                        <MetadataItem label="Client" value={project?.client_name || project?.client_type || 'Unknown'} />
                        <MetadataItem label="Assignee" value={project?.assignee || 'Unassigned'} />
                        <MetadataItem label="Project Manager" value={project?.primary_manager?.name || 'Support'} />
                        {project?.collaborators && project.collaborators.length > 0 && (
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-2 px-1">Collaborators</p>
                                <div className="space-y-2">
                                    {project.collaborators.map((c: any, idx: number) => (
                                        <CollaboratorItem key={idx} name={c.name} role={c.role || 'Member'} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </MetadataSection>

                    {/* Status Section */}
                    <MetadataSection
                        title="Status & Timeline"
                        isCollapsed={isSidebarCollapsed}
                        collapsedHeight="h-[480px]"
                    >
                        <div className="space-y-5">
                            <Dropdown
                                value={project?.status || 'In Progress'}
                                onChange={handleStatusChange}
                                options={[
                                    { label: 'In Progress', value: 'In Progress' },
                                    { label: 'Done', value: 'Done' },
                                    { label: 'Urgent', value: 'Urgent' },
                                    { label: 'Urgent Done', value: 'Urgent Done' },
                                    { label: 'Revision', value: 'Revision' },
                                    { label: 'Revision Done', value: 'Revision Done' },
                                    { label: 'Revision Urgent', value: 'Revision Urgent' },
                                    { label: 'Revision Urgent Done', value: 'Revision Urgent Done' }
                                ]}
                                size="md"
                            >
                                <MetadataItem
                                    label="Current Status"
                                    value={project?.status || 'In Progress'}
                                    isSelect
                                />
                            </Dropdown>

                            {/* Inline Editable Deadline Date */}
                            <DatePicker
                                value={project?.due_date ? new Date(project.due_date) : null}
                                onChange={handleDateChange}
                            >
                                <MetadataItem
                                    label="Deadline Date"
                                    value={project?.due_date ? formatDeadlineDate(project.due_date) : 'Set Date'}
                                    isSelect
                                    isDate
                                />
                            </DatePicker>

                            <TimeSelect
                                value={project?.due_time || '17:00'}
                                onChange={handleTimeChange}
                            >
                                <MetadataItem
                                    label="Deadline Time"
                                    value={project?.due_time ? formatTime(project.due_time) : '10:00 PM'}
                                    isSelect
                                    isTime
                                />
                            </TimeSelect>

                            <MetadataItem
                                label="Time Left"
                                value={(() => {
                                    // Construct precise timestamp from visible inputs to ensure sync
                                    let targetDate = null;
                                    if (project?.due_date) {
                                        const time = project?.due_time || '00:00';
                                        targetDate = `${project?.due_date}T${time.length === 5 ? time + ':00' : time}`;
                                    }

                                    const { label, color } = getTimeLeft(targetDate);
                                    return label;
                                })()}
                                valueClassName={(() => {
                                    let targetDate = null;
                                    if (project?.due_date) {
                                        const time = project?.due_time || '00:00';
                                        targetDate = `${project?.due_date}T${time.length === 5 ? time + ':00' : time}`;
                                    }
                                    const { color } = getTimeLeft(targetDate);
                                    return color;
                                })()}
                            />
                        </div>
                    </MetadataSection>

                    {/* Financials */}
                    <MetadataSection
                        title="Financials"
                        isCollapsed={isSidebarCollapsed}
                        collapsedHeight="h-40"
                    >
                        <MetadataItem label="Budget" value={`$${project?.price || '0'}`} isAccent />
                        <MetadataItem label="Designer Fee" value={`$${project?.designer_fee || '0'}`} />
                    </MetadataSection>

                    {/* Configuration */}
                    <MetadataSection
                        title="Configuration"
                        isCollapsed={isSidebarCollapsed}
                        collapsedHeight="h-52"
                    >
                        <div className="space-y-5">
                            <MetadataItem
                                label="Add-ons"
                                value={(() => {
                                    const addonsData = project?.addons;
                                    let addonsArray: string[] = [];

                                    // Normalize addons data
                                    if (Array.isArray(addonsData)) {
                                        addonsArray = addonsData.filter(item => item && item.trim() !== '');
                                    } else if (addonsData && typeof addonsData === 'object') {
                                        const items = (addonsData as any).items;
                                        const other = (addonsData as any).other;
                                        if (Array.isArray(items)) {
                                            addonsArray = items.map((item: string) =>
                                                (item === 'Other' && other) ? other : item
                                            ).filter((item: string) => item && item !== 'Other');
                                        }
                                    }

                                    // Return 'None' if no addons, otherwise join with commas
                                    return addonsArray.length > 0 ? addonsArray.join(', ') : 'None';
                                })()}
                            />

                            <Dropdown
                                value={project?.has_art_help ? 'Art Help' : project?.has_dispute ? 'Dispute' : 'None'}
                                onChange={handleTriggerAlert}
                                options={[
                                    { label: 'None', value: 'None', icon: <div className="w-4 h-4 rounded-full border border-gray-600" /> },
                                    { label: 'Art Help', value: 'Art Help', icon: <IconAlertTriangle size={16} className="text-brand-info" /> },
                                    { label: 'Dispute', value: 'Dispute', icon: <IconAlertTriangle size={16} className="text-brand-error" /> }
                                ]}
                                size="md"
                            >
                                <MetadataItem
                                    label="Trigger Alert"
                                    value={project?.has_art_help ? 'Art Help' : project?.has_dispute ? 'Dispute' : 'None'}
                                    isSelect
                                />
                            </Dropdown>
                        </div>
                    </MetadataSection>
                </div>
            </aside>

            {/* 2. RIGHT COLUMN - MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-transparent">
                {/* Synchronized Content Header */}
                <header className="h-20 shrink-0 border-b border-surface-border flex items-center bg-surface-bg/40 backdrop-blur-xl z-20">
                    <div className="w-full px-10 flex items-center justify-between">
                        {/* Left Aligned Project Title */}
                        <div className="flex items-center gap-4">
                            {loading && !project ? (
                                <div className="h-7 w-64 bg-white/5 rounded-xl animate-pulse" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold text-white tracking-tight">
                                        {project?.project_title || 'Untitled Project'}
                                    </h1>
                                    {project?.has_dispute && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-error/10 text-brand-error border border-brand-error/20">
                                            Dispute
                                        </span>
                                    )}
                                    {project?.has_art_help && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-info/10 text-brand-info border border-brand-info/20">
                                            Art Help
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Aligned Status */}
                        <div className="flex items-center gap-2">
                            {loading && !project ? (
                                <div className="h-7 w-24 bg-white/5 rounded-full animate-pulse" />
                            ) : (
                                <>
                                    {(() => {
                                        /* RULE: Restricted Visibility. Render ONLY if 1+ add-ons exist. Zero-noise policy. */
                                        const addonsData = project?.addons;
                                        let addonsArray: string[] = [];

                                        // Normalize addons data (handles array or object with items/other)
                                        if (Array.isArray(addonsData)) {
                                            addonsArray = addonsData;
                                        } else if (addonsData && typeof addonsData === 'object') {
                                            const items = (addonsData as any).items;
                                            const other = (addonsData as any).other;
                                            if (Array.isArray(items)) {
                                                addonsArray = items.map((item: string) =>
                                                    (item === 'Other' && other) ? other : item
                                                ).filter((item: string) => item && item !== 'Other');
                                            }
                                        }

                                        const addonsCount = addonsArray.length;
                                        if (addonsCount === 0) return null;

                                        const label = addonsCount === 1
                                            ? `${addonsArray[0]} Included`
                                            : 'Multiple Add-ons Included';

                                        return (
                                            /* RULE: Add-ons capsule color is LOCKED to brand-addon-indicator. Do not change. */
                                            <span className="px-3 py-1 bg-brand-addon-indicator/10 border border-brand-addon-indicator/20 rounded-full text-[10px] font-bold text-brand-addon-indicator uppercase tracking-wider">
                                                {label}
                                            </span>
                                        );
                                    })()}
                                    <span className={`px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyles(project?.status || '')}`}>
                                        {project?.status || 'In Progress'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </header >

                {/* Top Section - Project content (scrollable) */}
                <main className="flex-1 overflow-y-auto nova-canvas scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent">
                    <div className="w-full min-h-full p-10 flex flex-col relative z-10 bg-transparent">
                        {!project && !loading ? (
                            <div className="flex flex-col items-center justify-center py-24 space-y-6">
                                <div className="w-16 h-16 rounded-full bg-brand-error/10 flex items-center justify-center text-brand-error">
                                    <IconAlertTriangle size={32} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-white mb-2">Project Not Found</h3>
                                    <Button onClick={onBack} variant="secondary">Go Back</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4">
                                {/* 1. Project Brief Section (Always visible if project exists/is loading) */}
                                <section className="shrink-0">
                                    <ElevatedMetallicCard title="Project Brief">
                                        <div className="space-y-10">
                                            {/* 1. Brief Text */}
                                            <div className="space-y-6 text-gray-300 whitespace-pre-line leading-relaxed text-sm">
                                                {project?.brief || (loading ? (
                                                    <div className="space-y-3 animate-pulse">
                                                        <div className="h-4 bg-white/5 rounded w-3/4"></div>
                                                        <div className="h-4 bg-white/5 rounded w-full"></div>
                                                        <div className="h-4 bg-white/5 rounded w-5/6"></div>
                                                    </div>
                                                ) : `No brief provided.`)}
                                            </div>

                                            {/* 2. Attachments Section (if any) */}
                                            {project?.attachments && Array.isArray(project.attachments) && project.attachments.length > 0 && (
                                                <div className="pt-8 border-t border-white/5">
                                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Attachments</h4>
                                                    <div className="flex flex-wrap gap-4">
                                                        {project.attachments.map((file: any, i: number) => (
                                                            <div key={i} className="group/posted-file relative cursor-pointer hover:scale-[1.02] transition-transform">
                                                                <div className="w-20 h-20 rounded-xl border border-surface-border bg-surface-overlay flex flex-col items-center justify-center relative overflow-hidden">
                                                                    <FileIcon name={file.name} type={file.type} url={file.url} />
                                                                </div>

                                                                {/* OVERLAY for Download/Copy */}
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/posted-file:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-20 backdrop-blur-[1px]">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            forceDownload(file.url, file.name || 'download');
                                                                        }}
                                                                        className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary"
                                                                        title="Download"
                                                                    >
                                                                        <IconDownload size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigator.clipboard.writeText(file.url);
                                                                            addToast({ title: 'Link copied', type: 'success' });
                                                                        }}
                                                                        className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary"
                                                                        title="Copy Link"
                                                                    >
                                                                        <IconLink size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ElevatedMetallicCard>
                                </section>

                                {/* 2. Top Separator */}
                                <div className="border-t border-surface-border w-full my-10" />

                                {/* 3. Activity Timeline Section */}
                                <section className="flex-1 flex flex-col mb-10 min-h-[400px]">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                            <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.3em] ml-1">Loading history</p>
                                        </div>
                                    ) : comments.length > 0 ? (
                                        <div className="space-y-8">
                                            {/* Pagination: Show Older Activities Button */}
                                            {hasMore && (
                                                <div className="flex justify-center pb-4">
                                                    <button
                                                        onClick={fetchOlderComments}
                                                        disabled={isLoadingOlder}
                                                        className="group flex flex-col items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 disabled:opacity-50"
                                                    >
                                                        {isLoadingOlder ? (
                                                            <div className="w-4 h-4 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <IconRefreshCw size={12} className="text-brand-primary group-hover:rotate-180 transition-transform duration-700" />
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Show Older Activities</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {comments.map((comment, index) => (
                                                <div
                                                    key={comment.id || index}
                                                    className="animate-in fade-in slide-in-from-left-4 opacity-0"
                                                    style={{ animationDelay: `${Math.min(index, 10) * 100}ms` }}
                                                >
                                                    {(() => {
                                                        const isStatusChange = comment.content?.startsWith('STATUS_CHANGED:');

                                                        if (isStatusChange) {
                                                            const parts = comment.content.split(':');
                                                            const oldStatus = parts[1];
                                                            const newStatus = parts[2];
                                                            const roleStyle = getRoleStyles(comment.author_role || 'User');

                                                            return (
                                                                <ElevatedMetallicCard
                                                                    title={
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className={`text-xs font-bold uppercase tracking-widest leading-none ${getStatusStyles(newStatus).split(' ').find(c => c.startsWith('text-')) || 'text-white'}`}>
                                                                                    STATUS CHANGED
                                                                                </span>
                                                                                <span className="text-xs font-bold text-gray-600 leading-none">|</span>
                                                                                <span className="text-xs font-bold text-white uppercase tracking-widest leading-none">
                                                                                    {comment.author_name || 'User'}
                                                                                </span>
                                                                                <div className="w-1 h-1 rounded-full bg-gray-600" />
                                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                                                                                    {new Date(comment.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                            <div className={`p-1 rounded ${roleStyle.bg} ${roleStyle.color} text-[8px] font-bold uppercase tracking-widest px-1.5 border ${roleStyle.border}`}>
                                                                                {roleStyle.label || comment.author_role || 'Staff'}
                                                                            </div>
                                                                        </div>
                                                                    }
                                                                    bodyClassName="p-6"
                                                                    headerClassName="px-6 py-3"
                                                                    className="border-white/5 transition-all duration-500 hover:border-white/10"
                                                                >
                                                                    <div className="flex items-center justify-center gap-4 w-full">

                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`px-2.5 py-1 rounded-md border text-[10px] font-bold ${getStatusStyles(oldStatus)} opacity-40 border-dashed`}>
                                                                                {oldStatus}
                                                                            </div>

                                                                            <div className="flex items-center text-gray-700">
                                                                                <div className="w-6 h-px bg-white/10" />
                                                                                <IconChevronRight size={12} className="text-gray-600 mx-1" />
                                                                                <div className="w-6 h-px bg-white/10" />
                                                                            </div>

                                                                            <div className={`px-2.5 py-1 rounded-md border text-[10px] font-bold ${getStatusStyles(newStatus)}`}>
                                                                                {newStatus}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </ElevatedMetallicCard>
                                                            );
                                                        }

                                                        const roleStyle = getRoleStyles(comment.author_role || 'Staff');
                                                        return (
                                                            <ElevatedMetallicCard
                                                                title={
                                                                    <div className="flex items-center justify-between w-full">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-xs font-bold text-white uppercase tracking-widest leading-none">
                                                                                {comment.author_name || 'User'}
                                                                            </span>
                                                                            <div className="w-1 h-1 rounded-full bg-gray-600" />
                                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                                                                                {new Date(comment.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}
                                                                            </span>
                                                                        </div>
                                                                        <div className={`p-1 rounded ${roleStyle.bg} ${roleStyle.color} text-[8px] font-bold uppercase tracking-widest px-1.5 border ${roleStyle.border}`}>
                                                                            {roleStyle.label}
                                                                        </div>
                                                                    </div>
                                                                }
                                                                bodyClassName="p-6"
                                                                headerClassName="px-6 py-3"
                                                                className="border-white/5 transition-all duration-500 hover:border-white/10"
                                                            >
                                                                {comment.content && comment.content.trim().length > 0 && (
                                                                    <div className="text-sm text-gray-300 leading-relaxed">
                                                                        {comment.content}
                                                                    </div>
                                                                )}

                                                                {/* Render Posted Attachments */}
                                                                {comment.attachments && Array.isArray(comment.attachments) && comment.attachments.length > 0 && (
                                                                    <div className={`${comment.content && comment.content.trim().length > 0 ? 'mt-4 pt-4 border-t border-white/5' : ''} flex flex-wrap gap-3`}>
                                                                        {comment.attachments.map((file: any, i: number) => (
                                                                            <div key={i} className="group/posted-file relative cursor-pointer hover:scale-[1.02] transition-transform">
                                                                                <div className="w-20 h-20 rounded-xl border border-surface-border bg-surface-overlay flex flex-col items-center justify-center relative overflow-hidden">
                                                                                    <FileIcon name={file.name} type={file.type} url={file.url} />
                                                                                </div>

                                                                                {/* OVERLAY for Download/Copy */}
                                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/posted-file:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-20 backdrop-blur-[1px]">
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            forceDownload(file.url, file.name || 'download');
                                                                                        }}
                                                                                        className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary"
                                                                                        title="Download"
                                                                                    >
                                                                                        <IconDownload size={14} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            navigator.clipboard.writeText(file.url);
                                                                                            addToast({ title: 'Link copied', type: 'success' });
                                                                                        }}
                                                                                        className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary"
                                                                                        title="Copy Link"
                                                                                    >
                                                                                        <IconLink size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </ElevatedMetallicCard>
                                                        );
                                                    })()}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">No activity recorded yet</p>
                                        </div>
                                    )}
                                </section>

                                {/* 4. Bottom Separator */}
                                <div className="border-t border-surface-border w-full my-10" />

                                {/* 5. Comment Composer (Input Area) */}
                                <section>
                                    <ElevatedMetallicCard
                                        title="Post Comment"
                                        headerClassName="px-8 py-3"
                                        bodyClassName="p-8"
                                    >
                                        <div className="space-y-4">
                                            {/* Input Area (Recessed/Sunken) */}
                                            <div className="relative z-10 min-h-[140px] p-5 bg-black/20 rounded-2xl border border-surface-border/50 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)] focus-within:shadow-[inset_0_4px_16px_rgba(0,0,0,0.6)] focus-within:border-white/10 group-active:border-white/10">
                                                <textarea
                                                    className="w-full h-full bg-transparent border-none outline-none text-sm text-white placeholder-gray-600 resize-none leading-relaxed"
                                                    placeholder="Write a comment..."
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handlePostComment();
                                                        }
                                                    }}
                                                />
                                            </div>

                                            {/* Attachment Preview */}
                                            {attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-3 px-1 relative z-10">
                                                    {attachments.map((att, i) => (
                                                        <div key={att.id} className="relative group/file">
                                                            <div className={`
                                                            w-20 h-20 rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300
                                                            ${att.status === 'uploading' ? 'bg-surface-card border-brand-primary/30' : 'bg-surface-overlay border-surface-border'}
                                                        `}>
                                                                {/* Loading State */}
                                                                {att.status === 'uploading' && (
                                                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                                                                        <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-2" />
                                                                    </div>
                                                                )}

                                                                <FileIcon name={att.file.name} type={att.file.type} url={att.previewUrl} />


                                                            </div>

                                                            {/* OVERLAY for Download/Copy */}
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/file:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-20 backdrop-blur-[1px]">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        forceDownload(att.previewUrl, att.file.name || 'download');
                                                                    }}
                                                                    className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary"
                                                                    title="Download"
                                                                >
                                                                    <IconDownload size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigator.clipboard.writeText(att.previewUrl);
                                                                        addToast({ title: 'Link copied', type: 'success' });
                                                                    }}
                                                                    className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary"
                                                                    title="Copy Link"
                                                                >
                                                                    <IconLink size={14} />
                                                                </button>
                                                            </div>

                                                            {/* Remove Button (Hover) */}
                                                            <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/file:opacity-100 transition-opacity z-30">
                                                                <button
                                                                    onClick={() => removeAttachment(i)}
                                                                    className="bg-surface-card border border-surface-border text-gray-400 hover:text-brand-error p-1 rounded-full shadow-lg"
                                                                >
                                                                    <IconX size={10} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                multiple
                                                onChange={handleFileSelect}
                                            />

                                            <div className="flex items-center justify-between relative z-10 pt-2">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest hover:bg-white/5 rounded-lg"
                                                >
                                                    <IconPaperclip size={16} />
                                                    Attach Files
                                                    {attachments.length > 0 && <span className="text-brand-primary">({attachments.length})</span>}
                                                </button>
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="secondary"
                                                        className="px-6 py-2.5 h-[38px] text-xs font-bold uppercase tracking-widest bg-surface-overlay border-surface-border hover:bg-white/[0.05]"
                                                    >
                                                        QA Check
                                                    </Button>
                                                    <Button
                                                        variant="metallic"
                                                        className="px-8 py-2.5 h-[38px] text-xs font-bold uppercase tracking-widest"
                                                        leftIcon={<IconSend size={14} />}
                                                        onClick={handlePostComment}
                                                        isLoading={isPostingComment}
                                                        disabled={(!newComment.trim() && attachments.length === 0) || attachments.some(a => a.status === 'uploading')}
                                                    >
                                                        Send
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </ElevatedMetallicCard>
                                </section>
                            </div>
                        )}
                    </div>
                </main >
            </div >
        </div >
    );
};

// UI Subcomponents
const MetadataSection: React.FC<{
    title: string;
    children: React.ReactNode;
    isCollapsed?: boolean;
    collapsedHeight?: string;
}> = ({ title, children, isCollapsed, collapsedHeight = "h-14" }) => (
    <div className="w-full flex justify-center">
        {isCollapsed ? (
            <div className={`w-[2px] ${collapsedHeight} bg-surface-border rounded-full transition-all duration-300 animate-in fade-in zoom-in-95`} />
        ) : (
            <div className="w-full min-w-[280px] animate-in fade-in slide-in-from-left-2 duration-300">
                <ElevatedMetallicCard
                    title={title}
                    headerClassName="px-6 py-4"
                    bodyClassName="p-6 space-y-5"
                    className="hover:border-white/5 transition-all group"
                >
                    {children}
                </ElevatedMetallicCard>
            </div>
        )}
    </div>
);

const MetadataItem: React.FC<{
    label: string;
    value: string;
    isMono?: boolean;
    isAccent?: boolean;
    isSelect?: boolean;
    isDate?: boolean;
    isTime?: boolean;
    valueClassName?: string;
    onClick?: () => void;
}> = ({ label, value, isMono, isAccent, isSelect, isDate, isTime, valueClassName, onClick }) => (
    <div className="px-1 group/item" onClick={onClick}>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 group-hover/item:text-brand-primary/70 transition-colors uppercase">{label}</p>
        <div className={`
            w-full flex items-center justify-between transition-all duration-300 relative overflow-hidden
            ${isSelect
                ? 'bg-black/25 border border-surface-border/40 rounded-xl px-4 py-3 cursor-pointer shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_1px_1px_rgba(255,255,255,0.02)] hover:border-white/10 active:scale-[0.98]'
                : 'bg-transparent border-2 border-transparent px-0 py-1'
            }
        `}>
            {/* Subtle Vertical Metallic Gradient for isSelect */}
            {isSelect && <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01),transparent)] pointer-events-none" />}

            <span className={`
                relative z-10
                ${isMono ? 'font-mono' : 'font-bold'} 
                ${isAccent ? 'text-brand-primary text-base' : 'text-sm'}
                ${isSelect ? 'text-white' : valueClassName || 'text-gray-300'}
                truncate
            `}>
                {isDate ? (
                    <div className="flex items-center gap-2">
                        <IconCalendar size={16} className={isSelect ? 'text-brand-primary/70' : 'text-gray-500'} />
                        {value}
                    </div>
                ) : isTime ? (
                    <div className="flex items-center gap-2">
                        <IconClock size={16} className={isSelect ? 'text-brand-primary/70' : 'text-gray-500'} />
                        {value}
                    </div>
                ) : value}
            </span>
            {isSelect && (
                <svg className="w-4 h-4 text-gray-600 group-hover/item:text-brand-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            )}
        </div>
    </div>
);

const CollaboratorItem: React.FC<{ name: string; role: string }> = ({ name, role }) => (
    <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-surface-border/50 group hover:border-brand-primary/20 transition-all">
        <span className="text-[12px] font-bold text-gray-300 group-hover:text-white transition-colors">{name}</span>
        <span className="text-[9px] font-bold text-brand-primary uppercase tracking-tighter bg-brand-primary/10 px-2.5 py-1 rounded-lg">
            {role}
        </span>
    </div>
);

export default ProjectDetails;

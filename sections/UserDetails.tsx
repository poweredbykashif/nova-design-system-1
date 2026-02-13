import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import { Card } from '../components/Surfaces';
import { Avatar } from '../components/Avatar';
import { Dropdown } from '../components/Dropdown';
import {
    IconChevronLeft,
    IconMail,
    IconPhone,
    IconCreditCard,
    IconClock,
    IconTrash,
    IconCheckCircle,
    IconAlertTriangle,
    IconXCircle,
    IconFileImage,
    IconCamera,
    IconLoader,
    IconMaximize,
    IconBuilding,
    IconUser,
} from '../components/Icons';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Surfaces';
import { addToast } from '../components/Toast';

interface UserDetailsProps {
    userId: string;
    onBack: () => void;
}

const UserDetails: React.FC<UserDetailsProps> = ({ userId, onBack }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchUserDetails();
    }, [userId]);

    const fetchUserDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setUser(data);
        } catch (error: any) {
            console.error('Error fetching user details:', error);
            addToast({ type: 'error', title: 'Error', message: 'Could not load user details.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', userId);

            if (error) throw error;
            setUser({ ...user, status: newStatus });
            addToast({ type: 'success', title: 'Status Updated', message: `User status changed to ${newStatus}.` });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateRole = async (newRole: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            setUser({ ...user, role: newRole });
            addToast({ type: 'success', title: 'Role Updated', message: `User role changed to ${newRole}.` });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;

        setUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;
            addToast({ type: 'success', title: 'User Deleted', message: 'The user account has been permanently removed.' });
            onBack();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Delete Failed', message: error.message });
        } finally {
            setUpdating(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsAvatarUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // 1. Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            setUser({ ...user, avatar_url: publicUrl });
            addToast({ type: 'success', title: 'Avatar Updated', message: 'Profile picture has been updated successfully.' });
        } catch (error: any) {
            console.error('Error updating avatar:', error);
            addToast({ type: 'error', title: 'Upload Failed', message: error.message });
        } finally {
            setIsAvatarUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20 px-6">
                <IconAlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">User Not Found</h3>
                <p className="text-gray-500 mb-8">The user you are looking for does not exist or has been removed.</p>
                <Button variant="secondary" onClick={onBack}>Go Back</Button>
            </div>
        );
    }

    const roles = [
        { label: 'Admin', value: 'Admin' },
        { label: 'Project Manager', value: 'Project Manager' },
        { label: 'Freelancer', value: 'Freelancer' },
        { label: 'Presentation Designer', value: 'Presentation Designer' },
        { label: 'Finance Manager', value: 'Finance Manager' },
    ];

    const statuses = [
        { label: 'Active', value: 'Active' },
        { label: 'Pending Approval', value: 'Pending' },
        { label: 'Suspended', value: 'Suspended' },
        { label: 'Disabled', value: 'Disabled' },
    ];

    const isFreelancer = user.role.toLowerCase().includes('freelancer');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-gray-400 hover:text-white transition-all hover:bg-white/[0.08] rounded-xl group"
                    >
                        <IconChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            User Details
                            <span className="text-gray-600 font-medium text-lg">/</span>
                            <span className="text-gray-400 font-medium text-lg">{user.name}</span>
                        </h1>
                        <p className="text-sm text-gray-500">Manage user profile, permissions, and account status.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Actions removed as requested */}
                </div>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-1 gap-8">
                {/* Profile Summary Card */}
                <Card isElevated className="p-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                        <div className="relative group shrink-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <Avatar
                                size="xl"
                                src={user.avatar_url}
                                initials={user.name.split(' ').map((n: string) => n[0]).join('')}
                                status={user.status === 'Active' ? 'online' : user.status === 'Pending' ? 'away' : 'offline'}
                            >
                                <div
                                    onClick={handleAvatarClick}
                                    className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm border border-white/5"
                                >
                                    {isAvatarUploading ? (
                                        <IconLoader className="w-6 h-6 text-brand-primary animate-spin" />
                                    ) : (
                                        <IconCamera className="w-6 h-6 text-white/90 animate-in zoom-in-75 duration-300" />
                                    )}
                                </div>
                            </Avatar>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">{user.name}</h2>
                            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2">
                                <Badge variant={user.role === 'Admin' ? 'primary' : 'secondary'}>
                                    {user.role}
                                </Badge>
                                <Badge variant={
                                    user.status === 'Active' ? 'success' :
                                        user.status === 'Pending' ? 'warning' :
                                            'error'
                                }>
                                    {user.status}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* User Details Metadata Card */}
                <Card isElevated className="p-0 overflow-hidden">
                    <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">USER DETAILS</h3>
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                            {/* Row 1 */}
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                    <IconMail className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Email Address</span>
                                    <span className="text-base text-white font-medium truncate">{user.email}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                    <IconPhone className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Phone Number</span>
                                    <span className="text-base text-white font-medium">{user.phone || 'No phone number'}</span>
                                </div>
                            </div>

                            {/* Row 2 */}
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                    <IconCreditCard className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Payment Email</span>
                                    <span className="text-base text-white font-medium truncate">{user.payment_email || 'Not provided'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                    <IconClock className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Joined Date</span>
                                    <span className="text-base text-white font-medium">
                                        {new Date(user.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Bank Details Card (Freelancer Only) */}
                {isFreelancer && (
                    <Card isElevated className="p-0 overflow-hidden">
                        <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">BANK DETAILS</h3>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                        <IconBuilding className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Bank Name</span>
                                        <span className="text-base text-white font-medium truncate">{user.bank_name || 'Not provided'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                        <IconUser className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Account Title</span>
                                        <span className="text-base text-white font-medium truncate">{user.account_title || 'Not provided'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 lg:col-span-1">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                        <IconCreditCard className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">IBAN / Account Number</span>
                                        <span className="text-base text-white font-medium truncate">{user.iban || 'Not provided'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Role-Specific Sections: CNIC for Freelancers */}
            {isFreelancer && (
                <div className="grid grid-cols-1 gap-6">
                    <Card isElevated className="p-0 overflow-hidden">
                        <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">CNIC DOCUMENTS</h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div
                                        className="aspect-[1.5/1] rounded-2xl bg-black/40 border border-surface-border overflow-hidden flex items-center justify-center group relative shadow-inner cursor-pointer"
                                        onClick={() => user.cnic_front_url && setPreviewImage(user.cnic_front_url)}
                                    >
                                        {user.cnic_front_url ? (
                                            <img src={user.cnic_front_url} alt="CNIC Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <IconFileImage className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Image missing</span>
                                            </div>
                                        )}
                                        {user.cnic_front_url && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform duration-300">
                                                    <IconMaximize size={24} />
                                                </div>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Click to Expand</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 text-center uppercase tracking-[0.2em]">CNIC Front</p>
                                </div>
                                <div className="space-y-3">
                                    <div
                                        className="aspect-[1.5/1] rounded-2xl bg-black/40 border border-surface-border overflow-hidden flex items-center justify-center group relative shadow-inner cursor-pointer"
                                        onClick={() => user.cnic_back_url && setPreviewImage(user.cnic_back_url)}
                                    >
                                        {user.cnic_back_url ? (
                                            <img src={user.cnic_back_url} alt="CNIC Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <IconFileImage className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Image missing</span>
                                            </div>
                                        )}
                                        {user.cnic_back_url && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform duration-300">
                                                    <IconMaximize size={24} />
                                                </div>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Click to Expand</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 text-center uppercase tracking-[0.2em]">CNIC Back</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Image Preview Modal */}
            <Modal
                isOpen={!!previewImage}
                onClose={() => setPreviewImage(null)}
                title="Document Preview"
                size="xl"
            >
                <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 shadow-2xl">
                    {previewImage && (
                        <img
                            src={previewImage}
                            alt="Document Preview"
                            className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-500"
                        />
                    )}
                </div>
            </Modal>

            {/* Account Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card isElevated className="lg:col-span-2 p-0 overflow-hidden">
                    <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Quick Actions</h3>
                    </div>
                    <div className="p-8 space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-4">
                                    {user.status === 'Pending' ? (
                                        <>
                                            <Button
                                                variant="primary"
                                                className="px-8"
                                                onClick={() => handleUpdateStatus('Active')}
                                                isLoading={updating}
                                            >
                                                Approve User
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="text-brand-error hover:bg-brand-error/10"
                                                onClick={() => handleUpdateStatus('Disabled')}
                                                isLoading={updating}
                                            >
                                                Disable User
                                            </Button>
                                        </>
                                    ) : user.status === 'Active' ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                className="text-brand-warning border-brand-warning/30 hover:bg-brand-warning/10"
                                                onClick={() => handleUpdateStatus('Suspended')}
                                                isLoading={updating}
                                            >
                                                Suspend User
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="text-brand-error hover:bg-brand-error/10"
                                                onClick={() => handleUpdateStatus('Disabled')}
                                                isLoading={updating}
                                            >
                                                Disable User
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="primary"
                                            onClick={() => handleUpdateStatus('Active')}
                                            isLoading={updating}
                                        >
                                            Re-activate User
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 italic">
                                    {user.status === 'Pending' ? 'Approve this user to grant platform access.' : 'Active users have full platform access.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Manual Status Override</label>
                                    <Dropdown
                                        options={statuses}
                                        value={user.status}
                                        onChange={handleUpdateStatus}
                                        variant="metallic"
                                        size="md"
                                    />
                                    <p className="text-[10px] text-gray-600">Use the dropdown for direct status changes if needed.</p>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">User Role</label>
                                    <Dropdown
                                        options={roles}
                                        value={user.role}
                                        onChange={handleUpdateRole}
                                        variant="metallic"
                                        size="md"
                                    />
                                    <p className="text-[10px] text-gray-600">Change the user's role to grant different platform permissions.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Danger Zone */}
                <Card className="p-8 border-brand-error/20 bg-brand-error/[0.02] flex flex-col h-full" bodyClassName="flex-1 flex flex-col">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-brand-error">
                            <IconAlertTriangle className="w-5 h-5" />
                            <h3 className="text-sm font-bold uppercase tracking-wider">Danger Zone</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Permanently delete this user and all associated data. This action cannot be undone.
                        </p>
                    </div>
                    <div className="mt-auto pt-8">
                        <Button
                            variant="ghost"
                            className="w-full bg-brand-error/10 text-brand-error hover:bg-brand-error hover:text-white border-brand-error/20 transition-all py-6 rounded-2xl"
                            leftIcon={<IconTrash className="w-4 h-4" />}
                            onClick={handleDeleteUser}
                            isLoading={updating}
                        >
                            Delete User Permanently
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default UserDetails;

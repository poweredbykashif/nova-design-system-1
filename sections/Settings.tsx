import React, { useState } from 'react';
import { Card, Modal } from '../components/Surfaces';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { Avatar } from '../components/Avatar';
import { IconSettings, IconUser, IconBell, IconLogout, IconCreditCard, IconPhone, IconMaximize, IconFileImage, IconMail, IconLock, IconChevronLeft } from '../components/Icons';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { addToast } from '../components/Toast';

export interface SettingsHandle {
    save: () => Promise<void>;
    discard: () => void;
}

const Settings = React.forwardRef<{ save: () => Promise<void>; discard: () => void }, { onBack?: () => void, onDirtyChange?: (isDirty: boolean) => void }>(({ onBack, onDirtyChange }, ref) => {
    const { profile, loading, refreshProfile } = useUser();
    const [updating, setUpdating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => ({
        save: handleSaveSettings,
        discard: handleDiscardChanges
    }));

    const [formData, setFormData] = useState({
        payment_email: '',
        bank_name: '',
        account_title: '',
        iban: ''
    });

    React.useEffect(() => {
        if (profile) {
            setFormData({
                payment_email: profile.payment_email || '',
                bank_name: profile.bank_name || '',
                account_title: profile.account_title || '',
                iban: profile.iban || ''
            });
        }
    }, [profile]);

    const isDirty = profile ? (
        formData.payment_email !== (profile.payment_email || '') ||
        formData.bank_name !== (profile.bank_name || '') ||
        formData.account_title !== (profile.account_title || '') ||
        formData.iban !== (profile.iban || '')
    ) : false;

    React.useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            </div>
        );
    }

    const isAdmin = profile?.role?.toLowerCase() === 'admin';

    const handleSaveSettings = async () => {
        if (!profile) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    payment_email: formData.payment_email,
                    bank_name: formData.bank_name,
                    account_title: formData.account_title,
                    iban: formData.iban
                })
                .eq('id', profile.id);

            if (error) throw error;

            await refreshProfile();
            addToast({ type: 'success', title: 'Settings Saved', message: 'Your payment information has been updated successfully.' });
        } catch (error: any) {
            console.error('Error saving settings:', error);
            addToast({ type: 'error', title: 'Save Failed', message: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDiscardChanges = () => {
        if (profile) {
            setFormData({
                payment_email: profile.payment_email || '',
                bank_name: profile.bank_name || '',
                account_title: profile.account_title || '',
                iban: profile.iban || ''
            });
            addToast({ type: 'info', title: 'Changes Discarded', message: 'Form has been reset to your saved data.' });
        }
    };

    const handlePasswordUpdate = async () => {
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
            addToast({ type: 'error', title: 'Validation Error', message: 'Please fill in all fields.' });
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            addToast({ type: 'error', title: 'Validation Error', message: 'Passwords do not match.' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            addToast({ type: 'error', title: 'Validation Error', message: 'Password must be at least 6 characters long.' });
            return;
        }

        setUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
            if (error) throw error;

            addToast({ type: 'success', title: 'Password Updated', message: 'Your password has been changed successfully.' });
            setIsPasswordModalOpen(false);
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error('Error updating password:', error);
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile) return;

        setUpdating(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to storage (avatars bucket)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update profile mapping
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            await refreshProfile();
            addToast({ type: 'success', title: 'Avatar Updated', message: 'Your profile picture has been updated.' });
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                className="hidden"
                accept="image/*"
            />
            <div className="space-y-6 pt-6">
                {/* Profile Section */}
                <Card isElevated className="p-0 overflow-hidden">
                    <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Public Profile</h3>
                    </div>
                    <div className="p-8 space-y-8">
                        <div className="flex items-center gap-6">
                            <Avatar
                                size="xl"
                                status="online"
                                src={profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop"}
                                initials={profile?.name?.split(' ').map(n => n[0]).join('')}
                            />
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAvatarClick}
                                        isLoading={updating}
                                    >
                                        Change Photo
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-brand-error hover:bg-brand-error/10">Remove</Button>
                                </div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">JPG, GIF or PNG. Max size of 800K</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Display Name"
                                placeholder="E.g. Alex Rivier"
                                value={profile?.name ? profile.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : ''}
                                readOnly
                                leftIcon={<IconUser className="w-4 h-4" />}
                            />
                            <Input
                                label="Email Address"
                                placeholder="E.g. alex@nova.design"
                                value={profile?.email || ''}
                                readOnly
                            />
                            <Input
                                label="Job Title / Role"
                                placeholder="E.g. Designer"
                                value={profile?.role || ''}
                                readOnly
                            />
                            {!isAdmin && (
                                <Input
                                    label="Phone Number"
                                    value={profile?.phone || 'Not specified'}
                                    readOnly
                                    leftIcon={<IconPhone className="w-4 h-4" />}
                                />
                            )}
                        </div>
                    </div>
                </Card>

                {/* Payoneer Details card */}
                {!isAdmin && profile && (
                    <Card isElevated className="p-0 overflow-hidden">
                        <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Payoneer Details</h3>
                        </div>
                        <div className="p-8">
                            <Input
                                label="Payoneer / Payment Email"
                                placeholder="E.g. alex.payoneer@email.com"
                                value={formData.payment_email}
                                onChange={(e) => setFormData({ ...formData, payment_email: e.target.value })}
                                leftIcon={<IconMail className="w-4 h-4" />}
                            />
                        </div>
                    </Card>
                )}

                {/* Bank Details Section */}
                {!isAdmin && (
                    <Card isElevated className="p-0 overflow-hidden">
                        <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Bank Details</h3>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Input
                                    label="Bank Name"
                                    placeholder="E.g. Chase Bank"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    leftIcon={<IconCreditCard className="w-4 h-4" />}
                                />
                                <Input
                                    label="Account Title"
                                    placeholder="E.g. Alex Rivier"
                                    value={formData.account_title}
                                    onChange={(e) => setFormData({ ...formData, account_title: e.target.value })}
                                />
                                <Input
                                    label="IBAN"
                                    placeholder="E.g. GB 123 456 789"
                                    value={formData.iban}
                                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                />
                            </div>
                        </div>
                    </Card>
                )}

                {/* CNIC Documents Card */}
                {!isAdmin && profile && (
                    <Card isElevated className="p-0 overflow-hidden">
                        <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">CNIC DOCUMENTS</h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div
                                        className="aspect-[1.5/1] rounded-2xl bg-black/40 border border-surface-border overflow-hidden flex items-center justify-center group relative shadow-inner cursor-pointer"
                                        onClick={() => profile.cnic_front_url && setPreviewImage(profile.cnic_front_url)}
                                    >
                                        {profile.cnic_front_url ? (
                                            <img src={profile.cnic_front_url} alt="CNIC Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <IconFileImage className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Image missing</span>
                                            </div>
                                        )}
                                        {profile.cnic_front_url && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform duration-300">
                                                    <IconMaximize size={24} />
                                                </div>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Click to Expand</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">CNIC FRONT SIDE</p>
                                </div>

                                <div className="space-y-3">
                                    <div
                                        className="aspect-[1.5/1] rounded-2xl bg-black/40 border border-surface-border overflow-hidden flex items-center justify-center group relative shadow-inner cursor-pointer"
                                        onClick={() => profile.cnic_back_url && setPreviewImage(profile.cnic_back_url)}
                                    >
                                        {profile.cnic_back_url ? (
                                            <img src={profile.cnic_back_url} alt="CNIC Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <IconFileImage className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Image missing</span>
                                            </div>
                                        )}
                                        {profile.cnic_back_url && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform duration-300">
                                                    <IconMaximize size={24} />
                                                </div>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Click to Expand</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">CNIC BACK SIDE</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Security Section */}
                <Card isElevated className="p-0 overflow-hidden">
                    <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Security</h3>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-surface-overlay border border-surface-border rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                                    <IconSettings className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Password Management</p>
                                    <p className="text-xs text-gray-500">Secure your account with a strong password</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setIsPasswordModalOpen(true)}>Update</Button>
                        </div>
                    </div>
                </Card>

                {isDirty && (
                    <div className="flex justify-end gap-3 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Button variant="ghost" onClick={handleDiscardChanges} disabled={saving}>Discard Changes</Button>
                        <Button
                            variant="metallic"
                            className="px-8"
                            onClick={handleSaveSettings}
                            isLoading={saving}
                        >
                            Save All Settings
                        </Button>
                    </div>
                )}

            </div>

            {/* Image Preview Modal */}
            <Modal
                isOpen={!!previewImage}
                onClose={() => setPreviewImage(null)}
                title="Document Preview"
                size="lg"
            >
                {previewImage && (
                    <div className="flex items-center justify-center p-4">
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-[70vh] rounded-xl shadow-2xl animate-in zoom-in duration-300"
                        />
                    </div>
                )}
            </Modal>

            {/* Password Update Modal */}
            <Modal
                isOpen={isPasswordModalOpen}
                onClose={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                }}
                title="Change Password"
                size="md"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsPasswordModalOpen(false);
                                setPasswordData({ newPassword: '', confirmPassword: '' });
                            }}
                            disabled={updatingPassword}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic"
                            onClick={handlePasswordUpdate}
                            isLoading={updatingPassword}
                            className="px-8 shadow-lg shadow-brand-primary/20"
                        >
                            Update Password
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="p-1 px-2 mb-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl">
                        <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest p-2 text-center">
                            Security Tip: Mix symbols, numbers and letters
                        </p>
                    </div>
                    <div className="space-y-4">
                        <Input
                            label="New Password"
                            type="password"
                            placeholder="Enter new password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            leftIcon={<IconLock className="w-4 h-4" />}
                        />
                        <Input
                            label="Confirm New Password"
                            type="password"
                            placeholder="Confirm new password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            leftIcon={<IconLock className="w-4 h-4" />}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
});

export default Settings;

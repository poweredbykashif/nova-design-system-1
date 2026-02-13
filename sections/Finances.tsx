import React, { useState, useRef, useEffect } from 'react';
import { Avatar } from '../components/Avatar';
import { Tabs } from '../components/Navigation';
import { Calendar } from '../components/Calendar';
import { Modal, Card, ElevatedMetallicCard } from '../components/Surfaces';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { DatePicker, formatDate as systemFormatDate } from '../components/DatePicker';
import { Dropdown } from '../components/Dropdown';
import { UploadPreview } from '../components/UploadPreview';
import { IconCreditCard, IconChartBar, IconUser, IconSettings, IconPlus, IconTrash, IconEdit, IconCalendar, IconFilter, IconCloudUpload, IconClock, IconCheckCircle, IconLayout, IconDownload, IconBuilding, IconDollar, IconTrendingUp, IconX } from '../components/Icons';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';
import { KebabMenu } from '../components/KebabMenu';
import { Switch } from '../components/Selection';
import { getInitialTab, updateRoute } from '../utils/routing';
import { useAccounts } from '../contexts/AccountContext';

const PlatformCommission: React.FC = () => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedCommission, setSelectedCommission] = useState<any>(null);
    const { accounts, loading: accountsLoading } = useAccounts();
    const [commissions, setCommissions] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        existingPlatformId: '',
        platformName: '',
        logo: null as string | null,
        percentage: '',
        clearanceDays: '',
        assignedAccountIds: [] as string[]
    });

    const fetchedRef = React.useRef(false);

    React.useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        const loadInitialData = async () => {
            setLoading(true);
            await fetchCommissions();
            setLoading(false);
        };
        loadInitialData();
    }, []);

    // fetchAccounts removed in favor of useAccounts()

    const fetchCommissions = async () => {
        const { data, error } = await supabase
            .from('platform_commissions')
            .select(`
                *,
                platform_commission_accounts (
                    account_id
                )
            `);

        if (error) {
            console.error('Error fetching commissions:', error);
            return;
        }

        if (data) {
            // Transform nested join data into flat array for UI
            const mapped = data.map(item => ({
                ...item,
                assigned_account_ids: item.platform_commission_accounts?.map((r: any) => r.account_id) || []
            }));
            setCommissions(mapped);
        }
    };

    const handleEditClick = (item: any) => {
        setIsEditMode(true);
        setSelectedCommission(item);
        setFormData({
            existingPlatformId: '',
            platformName: item.platform_name,
            logo: item.logo_url,
            percentage: item.commission_percentage ? (item.commission_percentage * 100).toString() : '', // Convert factor 0.2 -> 20 for UI
            clearanceDays: item.clearance_days?.toString() || '',
            assignedAccountIds: item.assigned_account_ids || []
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (item: any) => {
        setSelectedCommission(item);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedCommission) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from('platform_commissions').delete().eq('id', selectedCommission.id);
            if (error) throw error;

            addToast({ type: 'success', title: 'Commission Deleted', message: 'Commission configuration removed successfully.' });
            setCommissions(prev => prev.filter(c => c.id !== selectedCommission.id));
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Delete Failed', message: error.message });
        } finally {
            setSubmitting(false);
            setSelectedCommission(null);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setSelectedCommission(null);
        setFormData({
            existingPlatformId: '',
            platformName: '',
            logo: null,
            percentage: '',
            clearanceDays: '',
            assignedAccountIds: []
        });
        setUploadStatus('idle');
        setUploadProgress(0);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadStatus('uploading');
        setUploadProgress(0);

        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setUploadProgress(progress);

            if (progress >= 100) {
                clearInterval(interval);
                const reader = new FileReader();

                reader.onloadend = () => {
                    const result = reader.result as string;
                    setFormData(prev => ({ ...prev, logo: result }));
                    setUploadStatus('success');
                    // Reset input value to allow re-selecting the same file
                    if (e.target) e.target.value = '';
                };

                reader.onerror = () => {
                    setUploadStatus('error');
                    if (e.target) e.target.value = '';
                };

                reader.readAsDataURL(file);
            }
        }, 100);
    };

    const handleSave = async () => {
        if (!formData.platformName || !formData.percentage) {
            addToast({
                type: 'error',
                title: 'Missing Fields',
                message: 'Platform Name and Commission % are required.'
            });
            return;
        }

        setSubmitting(true);

        // STRICT LOGIC: Store percentage as decimal factor (e.g. 20% -> 0.20)
        const commissionFactor = parseFloat(formData.percentage) / 100;

        const basePayload = {
            platform_name: formData.platformName,
            // logo_url: formData.logo, // Removed as it doesn't exist in schema
            commission_percentage: commissionFactor, // Mapped to correct column
            clearance_days: parseInt(formData.clearanceDays || '14'),
            // Removed assigned_account_ids from here as it doesn't exist in the commissions table
        };

        try {
            let commissionId;

            // 1. UPSERT COMMISSION
            if (isEditMode && selectedCommission) {
                const { data, error } = await supabase
                    .from('platform_commissions')
                    .update(basePayload)
                    .eq('id', selectedCommission.id)
                    .select()
                    .single();

                if (error) throw error;
                commissionId = data.id;
            } else {
                const { data, error } = await supabase
                    .from('platform_commissions')
                    .insert([basePayload])
                    .select()
                    .single();

                if (error) throw error;
                commissionId = data.id;
            }

            // 2. MANAGE ACCOUNT MAPPINGS (Critical Fix)
            // Always Delete existing -> Insert new to ensure sync
            // A) Delete old mappings
            const { error: deleteError } = await supabase
                .from('platform_commission_accounts')
                .delete()
                .eq('platform_commission_id', commissionId);

            if (deleteError) throw deleteError;

            // B) Insert new mappings
            if (formData.assignedAccountIds && formData.assignedAccountIds.length > 0) {
                const mappingPayload = formData.assignedAccountIds.map(accId => ({
                    platform_commission_id: commissionId,
                    account_id: accId
                }));

                const { error: insertError } = await supabase
                    .from('platform_commission_accounts')
                    .insert(mappingPayload);

                if (insertError) throw insertError;
            }

            // 3. REFRESH STATE
            await fetchCommissions();

            addToast({
                type: 'success',
                title: isEditMode ? 'Commission Updated' : 'Commission Saved',
                message: `${formData.platformName} has been ${isEditMode ? 'updated' : 'configured'} successfully.`
            });

            handleCloseModal();
        } catch (error: any) {
            console.error('Commission Save Error:', error);
            addToast({
                type: 'error',
                title: 'Save Failed',
                message: error.message || 'An error occurred while saving the configuration.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Commission Logs</h3>
                    <Button
                        variant="metallic"
                        size="sm"
                        leftIcon={<IconPlus className="w-4 h-4" />}
                        onClick={() => setIsModalOpen(true)}
                    >
                        Add Commission
                    </Button>
                </div>
                <Table
                    isMetallicHeader={true}
                    columns={[
                        {
                            header: 'Platform',
                            key: 'platform_name',
                            className: 'w-80',
                            render: (item: any) => (
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        src={item.logo_url}
                                        initials={item.platform_name?.charAt(0)}
                                        size="sm"
                                    />
                                    <span className="font-semibold text-white/90">{item.platform_name}</span>
                                </div>
                            )
                        },
                        {
                            header: 'Commission %',
                            key: 'percentage',
                            className: 'w-40',
                            render: (item: any) => (
                                <span className="text-brand-primary font-bold">{item.commission_percentage ? item.commission_percentage * 100 : 0}%</span>
                            )
                        },
                        {
                            header: 'Clearance Days',
                            key: 'clearance_days',
                            className: 'w-44',
                            render: (item: any) => (
                                <span className="text-gray-400">{item.clearance_days} Days</span>
                            )
                        },
                        {
                            header: 'Accounts',
                            key: 'assigned_account_ids',
                            className: 'min-w-[272px]',
                            render: (item: any) => (
                                <div className="flex flex-wrap gap-1.5">
                                    {item.assigned_account_ids?.map((id: string) => {
                                        const account = (accounts || []).find(a => a.id === id);
                                        return (
                                            <span key={id} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                {account?.name || 'Unknown'}
                                            </span>
                                        );
                                    })}
                                    {(!item.assigned_account_ids || item.assigned_account_ids.length === 0) && (
                                        <span className="text-xs text-gray-600 italic">None</span>
                                    )}
                                </div>
                            )
                        },
                        {
                            header: '',
                            key: 'actions',
                            className: 'w-20 text-right',
                            render: (item: any) => (
                                <KebabMenu
                                    options={[
                                        { label: 'Edit', icon: <IconEdit className="w-4 h-4" />, onClick: () => handleEditClick(item) },
                                        { label: 'Delete', icon: <IconTrash className="w-4 h-4" />, variant: 'danger', onClick: () => handleDeleteClick(item) }
                                    ]}
                                />
                            )
                        }
                    ]}
                    data={commissions}
                    isLoading={loading}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isEditMode ? "Edit Platform Commission" : "Set Platform Commission"}
                size="md"
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            isLoading={submitting}
                        >
                            {isEditMode ? "Update Commission" : "Save Commission"}
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-6">
                    {!isEditMode && commissions && commissions.length > 0 && (
                        <Dropdown
                            label="Select Existing Platform"
                            placeholder="Select a platform"
                            options={commissions.map(c => ({ label: c.platform_name, value: c.id }))}
                            value={formData.existingPlatformId}
                            onChange={(val) => {
                                const ex = commissions.find(c => c.id === val);
                                if (ex) {
                                    setFormData({
                                        existingPlatformId: val,
                                        platformName: ex.platform_name,
                                        logo: ex.logo_url,
                                        percentage: ex.percentage.toString(),
                                        clearanceDays: ex.clearance_days.toString(),
                                        assignedAccountIds: ex.assigned_account_ids || []
                                    });
                                } else {
                                    setFormData(prev => ({ ...prev, existingPlatformId: val }));
                                }
                            }}
                        />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4 md:max-w-[85%]">
                            <Input
                                label="Platform Name"
                                placeholder="Fiverr"
                                value={formData.platformName}
                                onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                            />
                            <Input
                                label="Commission Percentage"
                                placeholder="Enter percentage (0-100)"
                                value={formData.percentage}
                                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                            />
                            <Input
                                label="Clearance Days"
                                placeholder="14"
                                value={formData.clearanceDays}
                                onChange={(e) => setFormData({ ...formData, clearanceDays: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">Upload Logo</label>
                            <div className="flex-1 flex items-center justify-center border-2 border-surface-border rounded-3xl p-4 bg-surface-input/30">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                                <UploadPreview
                                    variant="circular"
                                    status={uploadStatus}
                                    progress={uploadProgress}
                                    imageSrc={formData.logo || ''}
                                    onUpload={() => fileInputRef.current?.click()}
                                    onRemove={() => {
                                        setFormData({ ...formData, logo: null });
                                        setUploadStatus('idle');
                                    }}
                                    onReplace={() => fileInputRef.current?.click()}
                                />
                            </div>
                        </div>
                    </div>

                    <Dropdown
                        isMulti
                        showSearch
                        label="Assign to accounts"
                        placeholder="Select accounts"
                        options={(accounts || []).map(acc => ({
                            label: acc.name,
                            value: acc.id,
                            description: acc.prefix
                        }))}
                        value={formData.assignedAccountIds}
                        onChange={(val) => setFormData(prev => ({ ...prev, assignedAccountIds: val }))}
                    />
                </div>
            </Modal>

            {/* Confirmation Modal for Delete */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
                size="sm"
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            className="bg-brand-error hover:bg-brand-error/90"
                            onClick={handleConfirmDelete}
                            isLoading={submitting}
                        >
                            Delete Platform
                        </Button>
                    </div>
                )}
            >
                <div className="py-2">
                    <p className="text-gray-300">Are you sure you want to delete the commission configuration for <span className="font-bold text-white">{selectedCommission?.platform_name}</span>?</p>
                    <p className="text-sm text-gray-500 mt-2">This action cannot be undone and will remove all associated settings.</p>
                </div>
            </Modal>
        </div>
    );
};

const PricingSlabs: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSlab, setSelectedSlab] = useState<any>(null);
    const [slabs, setSlabs] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        minPrice: '',
        maxPrice: '',
        freelancerPercentage: ''
    });

    React.useEffect(() => {
        fetchSlabs();
    }, []);

    const fetchSlabs = async () => {
        const { data } = await supabase.from('pricing_slabs').select('*').order('min_price', { ascending: true });
        if (data) setSlabs(data);
    };

    const handleEditSlab = (slab: any) => {
        setIsEditMode(true);
        setSelectedSlab(slab);
        setFormData({
            name: slab.slab_name,
            minPrice: slab.min_price.toString(),
            maxPrice: slab.max_price.toString(),
            freelancerPercentage: slab.freelancer_percentage.toString()
        });
        setIsModalOpen(true);
    };

    const handleDeleteSlab = (slab: any) => {
        setSelectedSlab(slab);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDeleteSlab = async () => {
        if (!selectedSlab) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from('pricing_slabs').delete().eq('id', selectedSlab.id);
            if (error) throw error;

            addToast({ type: 'success', title: 'Slab Deleted', message: 'Pricing slab removed successfully.' });
            setSlabs(prev => prev.filter(s => s.id !== selectedSlab.id));
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Delete Failed', message: error.message });
        } finally {
            setSubmitting(false);
            setSelectedSlab(null);
        }
    };

    const handleToggleActive = async (slabId: string, currentState: boolean) => {
        const newState = !currentState;

        try {
            // Optimistic update
            const newSlabs = slabs.map(s =>
                s.id === slabId ? { ...s, is_active: newState } : s
            );
            setSlabs(newSlabs);

            const { error } = await supabase
                .from('pricing_slabs')
                .update({ is_active: newState })
                .eq('id', slabId);

            if (error) throw error;

            addToast({
                type: 'success',
                title: 'Status Updated',
                message: `Pricing slab ${newState ? 'activated' : 'deactivated'} successfully.`
            });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
            fetchSlabs(); // Revert on error
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setSelectedSlab(null);
        setFormData({ name: '', minPrice: '', maxPrice: '', freelancerPercentage: '' });
    };

    const calculateValues = (price: number) => {
        const platformRate = 0.20; // Default 20% platform cut
        const platformCut = price * platformRate;
        const remaining = price - platformCut;
        const freelancerPerc = parseFloat(formData.freelancerPercentage) || 0;
        const freelancer = remaining * (freelancerPerc / 100);
        const company = remaining - freelancer;

        return {
            platformCut: platformCut.toFixed(2),
            remaining: remaining.toFixed(2),
            freelancer: freelancer.toFixed(2),
            company: company.toFixed(2)
        };
    };

    const handleSaveSlab = async () => {
        if (!formData.name || !formData.minPrice || !formData.maxPrice || !formData.freelancerPercentage) {
            addToast({ type: 'error', title: 'Missing Fields', message: 'All fields are required.' });
            return;
        }

        const min = parseFloat(formData.minPrice);
        const max = parseFloat(formData.maxPrice);
        const perc = parseFloat(formData.freelancerPercentage);

        if (min >= max) {
            addToast({ type: 'error', title: 'Invalid Range', message: 'Minimum price must be less than maximum price.' });
            return;
        }

        if (perc < 0 || perc > 100) {
            addToast({ type: 'error', title: 'Invalid Percentage', message: 'Freelancer percentage must be between 0 and 100.' });
            return;
        }

        setSubmitting(true);
        try {
            const calculateAmounts = (price: number) => {
                const platformCut = price * 0.20;
                const remaining = price - platformCut;
                const freelancerAmt = remaining * (perc / 100);
                const companyAmt = remaining - freelancerAmt;
                return { platformCut, freelancerAmt, companyAmt };
            };

            const minVals = calculateAmounts(min);
            const maxVals = calculateAmounts(max);

            const payload = {
                slab_name: formData.name,
                min_price: min,
                max_price: max,
                freelancer_percentage: perc,
                // Removed calculated fields as they don't exist in the schema
            };
            console.log("Submitting Pricing Slab Payload:", payload);

            let response;
            if (isEditMode && selectedSlab) {
                response = await supabase
                    .from('pricing_slabs')
                    .update(payload)
                    .eq('id', selectedSlab.id)
                    .select();
            } else {
                response = await supabase
                    .from('pricing_slabs')
                    .insert([payload])
                    .select();
            }

            const { data, error } = response;

            console.log("Supabase Response:", { data, error });

            if (error) throw error;

            addToast({ type: 'success', title: isEditMode ? 'Slab Updated' : 'Slab Created', message: `Pricing slab ${isEditMode ? 'updated' : 'added'} successfully.` });
            const [, refreshResult] = await Promise.all([
                new Promise(resolve => setTimeout(resolve, 500)), // Minimum loading perceptual duration
                fetchSlabs()
            ]);
            handleCloseModal();

        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const minPreview = calculateValues(parseFloat(formData.minPrice) || 0);
    const maxPreview = calculateValues(parseFloat(formData.maxPrice) || 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pricing Configurations</h3>
                <Button
                    variant="metallic"
                    size="sm"
                    leftIcon={<IconPlus className="w-4 h-4" />}
                    onClick={() => setIsModalOpen(true)}
                >
                    Add Slab
                </Button>
            </div>

            <div
                className="flex flex-col gap-4 min-h-[300px] transition-opacity duration-150 ease-out animate-[fade-in_150ms_ease-out]"
                key={slabs.length > 0 ? 'list' : 'empty'}
            >
                {slabs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-12 border-2 border-dashed border-surface-border rounded-3xl bg-white/[0.02]">
                        <div className="p-4 rounded-full bg-brand-primary/10 mb-4">
                            <IconChartBar className="w-8 h-8 text-brand-primary" />
                        </div>
                        <h4 className="text-lg font-bold text-white">No Pricing Slabs</h4>
                        <p className="text-gray-500 text-sm mt-1 mb-6 text-center max-w-xs">Define tiered pricing structures for your freelancers and company profit margins.</p>
                        <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>Create First Slab</Button>
                    </div>
                ) : (
                    slabs.map((slab) => (
                        <ElevatedMetallicCard
                            key={slab.id}
                            title={slab.slab_name}
                            bodyClassName="p-6"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-2xl font-bold text-white tracking-tight">${slab.min_price} - ${slab.max_price}</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-white">{slab.freelancer_percentage}%</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Freelancer Cut</p>
                                    </div>
                                    <Switch
                                        checked={slab.is_active || false}
                                        onChange={() => handleToggleActive(slab.id, slab.is_active)}
                                    />
                                    <div className="border-l border-surface-border pl-6">
                                        <KebabMenu
                                            options={[
                                                { label: 'Edit', icon: <IconEdit className="w-4 h-4" />, onClick: () => handleEditSlab(slab) },
                                                { label: 'Delete', icon: <IconTrash className="w-4 h-4" />, variant: 'danger', onClick: () => handleDeleteSlab(slab) }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                        </ElevatedMetallicCard>
                    ))
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isEditMode ? "Edit Pricing Slab" : "Create Pricing Slab"}
                size="md"
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="primary" onClick={handleSaveSlab} isLoading={submitting}>{isEditMode ? "Update Slab" : "Save Slab"}</Button>
                    </div>
                )}
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Slab Name"
                                placeholder="Basic Tier"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <Input
                            label="Minimum Price"
                            placeholder="0"
                            type="number"
                            value={formData.minPrice}
                            onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                        />
                        <Input
                            label="Maximum Price"
                            placeholder="500"
                            type="number"
                            value={formData.maxPrice}
                            onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                        />
                        <div className="md:col-span-2">
                            <Input
                                label="Freelancer Percentage (%)"
                                placeholder="20"
                                type="number"
                                value={formData.freelancerPercentage}
                                onChange={(e) => setFormData({ ...formData, freelancerPercentage: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h5 className="text-[10px] font-bold text-brand-primary uppercase tracking-widest px-1">Calculation Preview</h5>

                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Min Price Preview */}
                            <div className="flex-1 p-5 rounded-2xl bg-surface-overlay border border-surface-border space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <span className="text-xs font-bold text-gray-400">At Min Price</span>
                                    <span className="text-lg font-bold text-white">${formData.minPrice || '0'}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Platform Cut (20%)</span>
                                        <span className="text-gray-300 font-medium">-${minPreview.platformCut}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                                        <span className="text-gray-500">Remaining</span>
                                        <span className="text-brand-primary font-bold">${minPreview.remaining}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-1">
                                        <span className="text-gray-400">Freelancer ({formData.freelancerPercentage || '0'}%)</span>
                                        <span className="text-white font-bold">${minPreview.freelancer}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Company Profit</span>
                                        <span className="text-brand-success font-bold">${minPreview.company}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Max Price Preview */}
                            <div className="flex-1 p-5 rounded-2xl bg-surface-overlay border border-surface-border space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <span className="text-xs font-bold text-gray-400">At Max Price</span>
                                    <span className="text-lg font-bold text-white">${formData.maxPrice || '0'}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Platform Cut (20%)</span>
                                        <span className="text-gray-300 font-medium">-${maxPreview.platformCut}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                                        <span className="text-gray-500">Remaining</span>
                                        <span className="text-brand-primary font-bold">${maxPreview.remaining}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-1">
                                        <span className="text-gray-400">Freelancer ({formData.freelancerPercentage || '0'}%)</span>
                                        <span className="text-white font-bold">${maxPreview.freelancer}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Company Profit</span>
                                        <span className="text-brand-success font-bold">${maxPreview.company}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Confirmation Modal for Delete Slab */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Slab Deletion"
                size="sm"
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            className="bg-brand-error hover:bg-brand-error/90"
                            onClick={handleConfirmDeleteSlab}
                            isLoading={submitting}
                        >
                            Delete Slab
                        </Button>
                    </div>
                )}
            >
                <div className="py-2">
                    <p className="text-gray-300">Are you sure you want to delete the pricing slab <span className="font-bold text-white">{selectedSlab?.slab_name}</span>?</p>
                    <p className="text-sm text-gray-500 mt-2">This action is permanent and may affect revenue calculations.</p>
                </div>
            </Modal>
        </div>
    );
};

const CompanyEarnings: React.FC = () => {
    const [selectedAccount, setSelectedAccount] = useState('all');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [showSettings, setShowSettings] = useState(false);

    // Filter toolbar states
    const [fromDate, setFromDate] = useState<Date | null>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [toDate, setToDate] = useState<Date | null>(new Date());
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [pipelineRevenue, setPipelineRevenue] = useState(0);
    const [securedRevenue, setSecuredRevenue] = useState(0);
    const [totalProjects, setTotalProjects] = useState(0);
    const [avgPerProject, setAvgPerProject] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        const loadInitialData = async () => {
            setLoading(true);
            await fetchAccounts();
            setLoading(false);
        };
        loadInitialData();
    }, []);

    const fetchAccounts = async () => {
        const { data } = await supabase.from('accounts').select('id, prefix').order('prefix', { ascending: true });
        if (data) setAccounts(data);
    };

    const handleQuickFilter = (type: string) => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (type === 'today') {
            start = now;
            end = now;
        } else if (type === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            start = new Date(now.setDate(diff));
            end = new Date();
        } else if (type === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        setFromDate(start);
        setToDate(end);
        setActiveFilter(type);
    };

    const formatDate = (date: Date | null) => {
        return systemFormatDate(date);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider px-2">Earnings Breakdown</h3>
            </div>
            {/* Toolbar Container */}
            <Card isElevated={true} className="p-3 border border-white/[0.05] bg-black/40 rounded-2xl" bodyClassName="flex flex-col xl:flex-row items-center justify-between gap-4 py-1 px-3 overflow-visible">
                {/* Left Side: Date Pickers & Account */}
                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                    <DatePicker
                        placeholder="From"
                        value={fromDate}
                        onChange={(date) => {
                            setFromDate(date);
                            setActiveFilter(null);
                        }}
                    >
                        <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                            {/* Inner Top Shadow for carved-in look */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                            {/* Subtle Diagonal Machined Sheen */}
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                            <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                            <span className="min-w-20 relative z-10">{systemFormatDate(fromDate) || 'From Date'}</span>
                            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </DatePicker>
                    <DatePicker
                        placeholder="To"
                        value={toDate}
                        onChange={(date) => {
                            setToDate(date);
                            setActiveFilter(null);
                        }}
                    >
                        <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                            {/* Inner Top Shadow for carved-in look */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                            {/* Subtle Diagonal Machined Sheen */}
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                            <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                            <span className="min-w-20 relative z-10">{systemFormatDate(toDate) || 'To Date'}</span>
                            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </DatePicker>

                    <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

                    <div className="w-44">
                        <Dropdown
                            value={selectedAccount}
                            onChange={setSelectedAccount}
                            options={[{ label: 'All Accounts', value: 'all' }, ...(accounts || []).map(a => ({ label: a.prefix || a.id, value: a.id }))]}
                            placeholder="All Accounts"
                            showSearch={true}
                        >
                            <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                {/* Inner Top Shadow for carved-in look */}
                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                {/* Subtle Diagonal Machined Sheen */}
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                <span className="truncate relative z-10">
                                    {selectedAccount === 'all' ? 'All Accounts' : (accounts.find(acc => acc.id === selectedAccount)?.prefix || 'Account')}
                                </span>
                                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </Dropdown>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 w-full xl:w-auto justify-end overflow-visible">
                    <Button
                        variant={activeFilter === 'today' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleQuickFilter('today')}
                        className="whitespace-nowrap h-10 min-h-[40px] px-4 inline-flex items-center justify-center box-border"
                    >
                        Today
                    </Button>
                    <Button
                        variant={activeFilter === 'week' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleQuickFilter('week')}
                        className="whitespace-nowrap h-10 min-h-[40px] px-4 inline-flex items-center justify-center box-border"
                    >
                        This Week
                    </Button>
                    <Button
                        variant={activeFilter === 'month' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleQuickFilter('month')}
                        className="whitespace-nowrap h-10 min-h-[40px] px-4 inline-flex items-center justify-center box-border"
                    >
                        This Month
                    </Button>
                    <Button
                        variant="metallic"
                        size="sm"
                        leftIcon={<IconChartBar className="w-4 h-4 block" />}
                        className="whitespace-nowrap h-10 min-h-[40px] px-4 inline-flex items-center justify-center box-border"
                    >
                        Export CSV
                    </Button>
                </div>
            </Card>

            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Pipeline Revenue */}
                <Card isElevated={true}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Pipeline Revenue</p>
                            <p className="text-2xl font-bold text-white mb-1">${pipelineRevenue.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Potential revenue from in-progress projects (not yet approved)</p>
                        </div>
                        <div className="p-2 rounded-xl bg-yellow-500/10">
                            <IconClock className="w-5 h-5 text-yellow-500" />
                        </div>
                    </div>
                </Card>

                {/* Secured Revenue */}
                <Card isElevated={true}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Secured Revenue</p>
                            <p className="text-2xl font-bold text-white mb-1">${securedRevenue.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Finalized revenue from approved projects</p>
                        </div>
                        <div className="p-2 rounded-xl bg-green-500/10">
                            <IconCheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                    </div>
                </Card>

                {/* Total Projects */}
                <Card isElevated={true}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Total Projects</p>
                            <p className="text-2xl font-bold text-white mb-1">{totalProjects}</p>
                            <p className="text-xs text-gray-500">Active and completed projects</p>
                        </div>
                        <div className="p-2 rounded-xl bg-white/5">
                            <IconLayout className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>
                </Card>

                {/* Avg Per Project */}
                <Card isElevated={true}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Avg Per Project</p>
                            <p className="text-2xl font-bold text-white mb-1">${avgPerProject.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Average revenue per project</p>
                        </div>
                        <div className="p-2 rounded-xl bg-white/5">
                            <IconChartBar className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="space-y-4">
                <Table
                    columns={[
                        {
                            header: 'Project ID',
                            key: 'project_id',
                            render: (item: any) => (
                                <span className="font-semibold text-white/90">{item.project_id}</span>
                            )
                        },
                        {
                            header: 'Client',
                            key: 'client',
                            className: 'text-gray-400'
                        },
                        {
                            header: 'Price',
                            key: 'price',
                            render: (item: any) => (
                                <span className="text-white font-bold">{item.price}</span>
                            )
                        },
                        {
                            header: 'Platform Cut',
                            key: 'platform_cut',
                            className: 'text-gray-400'
                        },
                        {
                            header: 'Freelancer Cut',
                            key: 'freelancer_cut',
                            className: 'text-gray-400'
                        },
                        {
                            header: 'Company Earning',
                            key: 'company_earning',
                            render: (item: any) => (
                                <span className="text-brand-success font-bold">{item.company_earning}</span>
                            )
                        },
                        {
                            header: 'Tips',
                            key: 'tips',
                            className: 'text-gray-400'
                        },
                        {
                            header: 'Account',
                            key: 'account',
                            className: 'text-gray-400'
                        },
                        {
                            header: 'Date',
                            key: 'date',
                            className: 'text-right',
                            render: (item: any) => (
                                <span className="text-gray-400">{item.date}</span>
                            )
                        }
                    ]}
                    data={[]}
                    isLoading={loading}
                />
            </div>
        </div >
    );
};

const FreelancerEarnings: React.FC = () => {
    const [selectedFreelancer, setSelectedFreelancer] = useState<string>('');
    const [freelancers, setFreelancers] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [earningsData, setEarningsData] = useState<any[]>([]);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const { accounts } = useAccounts();

    // Filter States
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [activeSummaryFilter, setActiveSummaryFilter] = useState<'lifetime' | 'pending' | 'available'>('lifetime');

    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchFreelancers();
    }, []);

    useEffect(() => {
        if (selectedFreelancer) {
            fetchEarnings(selectedFreelancer);
        } else {
            setEarningsData([]);
        }
    }, [selectedFreelancer]);

    // Auto-refresh earnings every hour to keep days_left current
    useEffect(() => {
        if (!selectedFreelancer) return;

        const refreshInterval = setInterval(() => {
            fetchEarnings(selectedFreelancer);
        }, 3600000); // Refresh every hour

        return () => clearInterval(refreshInterval);
    }, [selectedFreelancer]);

    useEffect(() => {
        applyFilters();
    }, [earningsData, dateFrom, dateTo, selectedAccount, activeSummaryFilter]);

    const applyFilters = () => {
        let filtered = [...earningsData];

        if (dateFrom || dateTo) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.rawDate);
                itemDate.setHours(0, 0, 0, 0);
                if (dateFrom) {
                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                    if (itemDate < from) return false;
                }
                if (dateTo) {
                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                    if (itemDate > to) return false;
                }
                return true;
            });
        }

        if (selectedAccount !== 'all') {
            const acc = accounts.find(a => a.id === selectedAccount);
            filtered = filtered.filter(item =>
                item.accountId === selectedAccount ||
                (acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase()))
            );
        }

        // Summary Statistics Filtering
        if (activeSummaryFilter === 'lifetime') {
            filtered = filtered.filter(item => item.funds_status === 'Paid');
        } else if (activeSummaryFilter === 'pending') {
            filtered = filtered.filter(item => item.funds_status === 'Pending');
        } else if (activeSummaryFilter === 'available') {
            filtered = filtered.filter(item => item.funds_status === 'Cleared');
        }

        setFilteredData(filtered);
    };

    const handleQuickFilter = (type: 'today' | 'week' | 'month') => {
        const now = new Date();
        setDateTo(now);

        if (type === 'today') {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            setDateFrom(start);
        } else if (type === 'week') {
            const start = new Date(now);
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            setDateFrom(start);
        } else if (type === 'month') {
            setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1));
        }
    };

    const handleExportCSV = () => {
        if (filteredData.length === 0) return;

        const headers = activeSummaryFilter === 'lifetime'
            ? ['Date', 'Project ID', 'Funds Status', 'Payout']
            : ['Project', 'Client', 'Amount'];

        const csvRows = [headers.join(',')];

        filteredData.forEach(item => {
            const row = activeSummaryFilter === 'lifetime'
                ? [
                    `"${item.date}"`,
                    `"${item.id}"`,
                    `"${item.funds_status}"`,
                    `"${item.amount.replace(/[$,]/g, '')}"`
                ]
                : [
                    `"${item.project}"`,
                    `"${item.client}"`,
                    `"${item.amount.replace(/[$,]/g, '')}"`
                ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `freelancer_earnings_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchFreelancers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, email')
                .ilike('role', 'freelancer')
                .order('name', { ascending: true });

            if (!error && data) {
                setFreelancers(data);
            }
        } catch (err) {
            console.error('Error in fetchFreelancers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEarnings = async (email: string) => {
        try {
            setLoading(true);

            // First, trigger auto-update of expired pending projects
            try {
                await supabase.rpc('auto_update_funds_status');
            } catch (rpcError) {
                console.warn('Auto-update function not available:', rpcError);
            }

            // Fetch from the view that includes calculated days_left
            const { data, error } = await supabase
                .from('freelancer_earnings')
                .select('*')
                .eq('assignee', email)
                .order('updated_at', { ascending: false });

            if (!error && data) {
                const formatted = data.map(p => {
                    // Calculate days left in real-time
                    let daysLeft = 0;
                    if (p.clearance_start_date && p.clearance_days && p.funds_status === 'Pending') {
                        const startDate = new Date(p.clearance_start_date);
                        const now = new Date();
                        const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        daysLeft = Math.max(0, p.clearance_days - daysPassed);
                    }

                    // Auto-correct status if clearance expired
                    let actualStatus = p.funds_status;
                    if (p.funds_status === 'Pending' && daysLeft === 0) {
                        actualStatus = 'Cleared';
                    }

                    return {
                        id: p.project_id,
                        project: p.project_title || p.project_id,
                        client: p.client_name || 'Personal',
                        amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.designer_fee || 0),
                        rawAmount: p.designer_fee || 0,
                        date: systemFormatDate(new Date(p.updated_at || p.created_at)),
                        rawDate: p.updated_at || p.created_at,
                        accountId: p.account_id,
                        funds_status: actualStatus,
                        daysLeft: daysLeft
                    };
                });
                // Generate 150 test projects: 50 Paid (Lifetime), 50 Pending, 50 Cleared (Available)
                const projects = ['Website Redesign', 'Logo Design', 'Brand Identity', 'Mobile App UI', 'Dashboard Design', 'Landing Page', 'Email Templates', 'Social Media Graphics', 'Presentation Deck', 'Infographic Design', 'Icon Set', 'Illustration Pack', 'UI Kit', 'Design System', 'Marketing Materials', 'Product Mockups', 'Banner Ads', 'Brochure Design', 'Business Cards', 'Packaging Design', 'App Prototype', 'Web App Interface', 'E-commerce Design', 'Portfolio Website', 'Blog Design'];
                const clients = ['TechCorp', 'StartupHub', 'Global Ventures', 'Digital Solutions', 'Creative Agency', 'Innovation Labs', 'Enterprise Co', 'Growth Partners', 'Nexus Group', 'Quantum Systems', 'Pixel Studios', 'Cloud Networks', 'Data Dynamics', 'Smart Solutions', 'Future Tech', 'Prime Digital', 'Apex Industries', 'Zenith Corp', 'Velocity Labs', 'Horizon Group'];
                const prefixes = ['MAN', 'ARS'];

                const testProjects = [];
                let projectCounter = 1000;

                // 50 Paid projects (Lifetime Earnings) - dates from 20-120 days ago
                for (let i = 0; i < 50; i++) {
                    const daysAgo = 20 + Math.floor(i * 2);
                    const amount = 150 + Math.floor(Math.random() * 2850);
                    testProjects.push({
                        id: `${prefixes[i % 2]}-${projectCounter++}`,
                        project: projects[i % projects.length],
                        client: clients[i % clients.length],
                        amount: `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        rawAmount: amount,
                        date: systemFormatDate(new Date(Date.now() - 86400000 * daysAgo)),
                        rawDate: new Date(Date.now() - 86400000 * daysAgo).toISOString(),
                        accountId: 'any',
                        funds_status: 'Paid',
                        daysLeft: 0
                    });
                }

                // 50 Pending projects - dates from 1-13 days ago
                for (let i = 0; i < 50; i++) {
                    const daysAgo = 1 + Math.floor(i * 0.24);
                    const daysLeft = Math.max(1, 14 - daysAgo);
                    const amount = 200 + Math.floor(Math.random() * 1800);
                    testProjects.push({
                        id: `${prefixes[i % 2]}-${projectCounter++}`,
                        project: projects[(i + 10) % projects.length],
                        client: clients[(i + 5) % clients.length],
                        amount: `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        rawAmount: amount,
                        date: systemFormatDate(new Date(Date.now() - 86400000 * daysAgo)),
                        rawDate: new Date(Date.now() - 86400000 * daysAgo).toISOString(),
                        accountId: 'any',
                        funds_status: 'Pending',
                        daysLeft: daysLeft
                    });
                }

                // 50 Cleared projects (Available Amount) - dates from 15-90 days ago
                for (let i = 0; i < 50; i++) {
                    const daysAgo = 15 + Math.floor(i * 1.5);
                    const amount = 180 + Math.floor(Math.random() * 2320);
                    testProjects.push({
                        id: `${prefixes[i % 2]}-${projectCounter++}`,
                        project: projects[(i + 15) % projects.length],
                        client: clients[(i + 10) % clients.length],
                        amount: `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        rawAmount: amount,
                        date: systemFormatDate(new Date(Date.now() - 86400000 * daysAgo)),
                        rawDate: new Date(Date.now() - 86400000 * daysAgo).toISOString(),
                        accountId: 'any',
                        funds_status: 'Cleared',
                        daysLeft: 0
                    });
                }
                setEarningsData([...formatted, ...testProjects]);
            }
        } catch (err) {
            console.error('Error in fetchEarnings:', err);
        } finally {
            setLoading(false);
        }
    };

    const freelancerOptions = freelancers ? freelancers.map(f => ({
        value: f.email,
        label: f.name || f.email
    })) : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header with Dropdown */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider px-2">Freelancer Earnings</h3>
                <div className="w-64">
                    <Dropdown
                        options={freelancerOptions}
                        value={selectedFreelancer}
                        onChange={setSelectedFreelancer}
                        placeholder="Select Freelancer"
                        showSearch={true}
                    >
                        <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                            {/* Inner Top Shadow for carved-in look */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                            {/* Subtle Diagonal Machined Sheen */}
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                            <span className="truncate relative z-10">
                                {freelancerOptions.find(opt => opt.value === selectedFreelancer)?.label || 'Select Freelancer'}
                            </span>
                            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </Dropdown>
                </div>
            </div>

            {/* Empty State or Content */}
            {!selectedFreelancer ? (
                <div className="bg-surface-card rounded-2xl border border-surface-border p-16 text-center">
                    <p className="text-gray-400">Select a freelancer to view their earnings</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Filter Bar */}
                    <Card isElevated={true} className="p-3 border border-white/[0.05] bg-black/40 rounded-2xl">
                        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center px-2 py-1">
                            {/* Left Side: Date Pickers & Account */}
                            <div className="flex items-center gap-3">
                                <DatePicker
                                    value={dateFrom}
                                    onChange={setDateFrom}
                                >
                                    <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-2 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                        {/* Inner Top Shadow for carved-in look */}
                                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                        {/* Subtle Diagonal Machined Sheen */}
                                        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                        <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                                        <span className="min-w-20 relative z-10">{systemFormatDate(dateFrom) || 'From Date'}</span>
                                        <div className="flex items-center gap-1.5 relative z-10">
                                            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            {dateFrom && (
                                                <div
                                                    className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDateFrom(null);
                                                    }}
                                                >
                                                    <IconX className="w-3 h-3" strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </DatePicker>

                                <DatePicker
                                    value={dateTo}
                                    onChange={setDateTo}
                                >
                                    <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-2 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                        {/* Inner Top Shadow for carved-in look */}
                                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                        {/* Subtle Diagonal Machined Sheen */}
                                        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                        <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                                        <span className="min-w-20 relative z-10">{systemFormatDate(dateTo) || 'To Date'}</span>
                                        <div className="flex items-center gap-1.5 relative z-10">
                                            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            {dateTo && (
                                                <div
                                                    className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDateTo(null);
                                                    }}
                                                >
                                                    <IconX className="w-3 h-3" strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </DatePicker>

                                <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

                                <div className="w-44">
                                    <Dropdown
                                        value={selectedAccount}
                                        onChange={setSelectedAccount}
                                        options={[{ label: 'All Accounts', value: 'all' }, ...accounts.map(a => ({
                                            label: a.name,
                                            description: a.prefix?.toUpperCase(),
                                            value: a.id
                                        }))]}
                                        placeholder="All Accounts"
                                        showSearch={true}
                                        searchPlaceholder="Search account prefix..."
                                        menuClassName="!w-[340px]"
                                    >
                                        <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                            {/* Inner Top Shadow for carved-in look */}
                                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                            {/* Subtle Diagonal Machined Sheen */}
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                            <span className="truncate relative z-10">
                                                {(() => {
                                                    const acc = accounts.find(a => a.id === selectedAccount);
                                                    if (!acc) return 'All Accounts';
                                                    return acc.prefix ? acc.prefix.toUpperCase() : acc.name;
                                                })()}
                                            </span>
                                            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </Dropdown>
                                </div>
                            </div>

                            {/* Right Side: Quick Filters & Export */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleQuickFilter('today')} className="!text-xs !h-9 !px-4 !bg-transparent !border-white/10 !rounded-xl hover:!bg-white/[0.05] !font-bold">Today</Button>
                                    <Button variant="outline" size="sm" onClick={() => handleQuickFilter('week')} className="!text-xs !h-9 !px-4 !bg-transparent !border-white/10 !rounded-xl hover:!bg-white/[0.05] !font-bold">This Week</Button>
                                    <Button variant="outline" size="sm" onClick={() => handleQuickFilter('month')} className="!text-xs !h-9 !px-4 !bg-transparent !border-white/10 !rounded-xl hover:!bg-white/[0.05] !font-bold">This Month</Button>
                                </div>
                                <Button
                                    variant="metallic"
                                    size="sm"
                                    leftIcon={<IconChartBar className="w-4 h-4" />}
                                    className="!text-xs !h-10 !px-5 !rounded-xl font-extrabold uppercase tracking-tight"
                                    onClick={handleExportCSV}
                                >
                                    Export CSV
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Summary Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <Card
                            isElevated={true}
                            className={`p-5 border transition-all group cursor-pointer ${activeSummaryFilter === 'lifetime'
                                ? 'border-brand-primary bg-brand-primary/[0.05] shadow-[0_0_20px_rgba(255,107,0,0.1)] ring-1 ring-brand-primary/20'
                                : 'border-white/10 bg-surface-card/30 backdrop-blur-md hover:border-brand-primary/30'
                                }`}
                            onClick={() => setActiveSummaryFilter('lifetime')}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lifetime Earnings</p>
                                    <h4 className="text-2xl font-black text-brand-success">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                            earningsData.filter(item => {
                                                // Check Status
                                                if (item.funds_status !== 'Paid') return false;

                                                // Check Dates
                                                const itemDate = new Date(item.rawDate);
                                                itemDate.setHours(0, 0, 0, 0);
                                                if (dateFrom) {
                                                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                                                    if (itemDate < from) return false;
                                                }
                                                if (dateTo) {
                                                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                                                    if (itemDate > to) return false;
                                                }

                                                // Check Account
                                                if (selectedAccount !== 'all') {
                                                    const acc = accounts.find(a => a.id === selectedAccount);
                                                    const matchAccId = item.accountId === selectedAccount;
                                                    const matchPrefix = acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase());
                                                    if (!matchAccId && !matchPrefix) return false;
                                                }

                                                return true;
                                            }).reduce((sum, item) => sum + (item.rawAmount || 0), 0)
                                        )}
                                    </h4>
                                </div>
                                <div className={`p-2 rounded-lg border transition-all ${activeSummaryFilter === 'lifetime'
                                    ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                                    : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                    }`}>
                                    <IconDollar className="w-5 h-5" />
                                </div>
                            </div>
                        </Card>

                        <Card
                            isElevated={true}
                            className={`p-5 border transition-all group cursor-pointer ${activeSummaryFilter === 'pending'
                                ? 'border-brand-primary bg-brand-primary/[0.05] shadow-[0_0_20px_rgba(255,107,0,0.1)] ring-1 ring-brand-primary/20'
                                : 'border-white/10 bg-surface-card/30 backdrop-blur-md hover:border-brand-primary/30'
                                }`}
                            onClick={() => setActiveSummaryFilter('pending')}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pending Clearance</p>
                                    <h4 className="text-2xl font-black text-brand-warning">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                            earningsData.filter(item => {
                                                // Check Status
                                                if (item.funds_status !== 'Pending') return false;

                                                // Check Dates
                                                const itemDate = new Date(item.rawDate);
                                                itemDate.setHours(0, 0, 0, 0);
                                                if (dateFrom) {
                                                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                                                    if (itemDate < from) return false;
                                                }
                                                if (dateTo) {
                                                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                                                    if (itemDate > to) return false;
                                                }

                                                // Check Account
                                                if (selectedAccount !== 'all') {
                                                    const acc = accounts.find(a => a.id === selectedAccount);
                                                    const matchAccId = item.accountId === selectedAccount;
                                                    const matchPrefix = acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase());
                                                    if (!matchAccId && !matchPrefix) return false;
                                                }

                                                return true;
                                            }).reduce((sum, item) => sum + (item.rawAmount || 0), 0)
                                        )}
                                    </h4>
                                </div>
                                <div className={`p-2 rounded-lg border transition-all ${activeSummaryFilter === 'pending'
                                    ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                                    : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                    }`}>
                                    <IconClock className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium">Approved, awaiting clearance</p>
                        </Card>

                        <Card
                            isElevated={true}
                            className={`p-5 border transition-all group cursor-pointer ${activeSummaryFilter === 'available'
                                ? 'border-brand-primary bg-brand-primary/[0.05] shadow-[0_0_20px_rgba(255,107,0,0.1)] ring-1 ring-brand-primary/20'
                                : 'border-white/10 bg-surface-card/30 backdrop-blur-md hover:border-brand-primary/30'
                                }`}
                            onClick={() => setActiveSummaryFilter('available')}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Available Amount</p>
                                    <h4 className="text-2xl font-black text-brand-success">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                            earningsData.filter(item => {
                                                // Check Status
                                                if (item.funds_status !== 'Cleared') return false;

                                                // Check Dates
                                                const itemDate = new Date(item.rawDate);
                                                itemDate.setHours(0, 0, 0, 0);
                                                if (dateFrom) {
                                                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                                                    if (itemDate < from) return false;
                                                }
                                                if (dateTo) {
                                                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                                                    if (itemDate > to) return false;
                                                }

                                                // Check Account
                                                if (selectedAccount !== 'all') {
                                                    const acc = accounts.find(a => a.id === selectedAccount);
                                                    const matchAccId = item.accountId === selectedAccount;
                                                    const matchPrefix = acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase());
                                                    if (!matchAccId && !matchPrefix) return false;
                                                }

                                                return true;
                                            }).reduce((sum, item) => sum + (item.rawAmount || 0), 0)
                                        )}
                                    </h4>
                                </div>
                                <div className={`p-2 rounded-lg border transition-all ${activeSummaryFilter === 'available'
                                    ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                                    : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                    }`}>
                                    <IconCheckCircle className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium">Ready for payout</p>
                        </Card>
                    </div>

                    <Table
                        columns={[
                            {
                                header: 'Date',
                                key: 'date',
                                render: (item: any) => <span className="text-gray-400">{item.date}</span>
                            },
                            {
                                header: 'Project ID',
                                key: 'id',
                                render: (item: any) => <span className="font-semibold text-white/90">{item.id}</span>
                            },
                            {
                                header: 'Project Title',
                                key: 'project',
                                render: (item: any) => <span className="font-semibold text-white/90">{item.project}</span>
                            },
                            {
                                header: 'Client',
                                key: 'client',
                                render: (item: any) => <span className="text-gray-400">{item.client}</span>
                            },
                            {
                                header: activeSummaryFilter === 'pending' ? 'Days Left' : 'Funds Status',
                                key: 'funds_status',
                                render: (item: any) => {
                                    if (activeSummaryFilter === 'pending') {
                                        return (
                                            <span className="bg-brand-warning/10 text-brand-warning border border-brand-warning/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                {item.daysLeft || 0} Days
                                            </span>
                                        );
                                    }
                                    const status = activeSummaryFilter === 'available' ? 'Unpaid' : item.funds_status;
                                    const isSuccess = status === 'Cleared' || status === 'Paid';
                                    return (
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${isSuccess ? 'bg-brand-success/10 text-brand-success border border-brand-success/20' : 'bg-brand-warning/10 text-brand-warning border border-brand-warning/20'
                                            }`}>
                                            {status}
                                        </span>
                                    );
                                }
                            },
                            {
                                header: 'Payout',
                                key: 'amount',
                                className: 'text-right',
                                render: (item: any) => <span className="text-brand-success font-bold">{item.amount}</span>
                            }
                        ]}
                        data={filteredData}
                        isLoading={loading}
                    />
                </div>
            )}
        </div>
    );
};

const Finances: React.FC = () => {
    const [activeTab, setActiveTab] = useState(getInitialTab('Finances', 'commission'));

    useEffect(() => {
        updateRoute('Finances', activeTab);
    }, [activeTab]);

    useEffect(() => {
        const handlePopState = () => {
            setActiveTab(getInitialTab('Finances', 'commission'));
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const tabs = [
        { id: 'commission', label: 'Platform Commission', icon: <IconSettings className="w-4 h-4" /> },
        { id: 'slabs', label: 'Pricing Slabs', icon: <IconChartBar className="w-4 h-4" /> },
        { id: 'company', label: 'Company Earnings', icon: <IconCreditCard className="w-4 h-4" /> },
        { id: 'freelancer', label: 'Freelancer Earnings', icon: <IconUser className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="mt-8 min-h-[420px]">
                <div hidden={activeTab !== 'commission'}>
                    <PlatformCommission />
                </div>
                <div hidden={activeTab !== 'slabs'}>
                    <PricingSlabs />
                </div>
                <div hidden={activeTab !== 'company'}>
                    <CompanyEarnings />
                </div>
                <div hidden={activeTab !== 'freelancer'}>
                    <FreelancerEarnings />
                </div>
            </div>
        </div>
    );
};

export default Finances;

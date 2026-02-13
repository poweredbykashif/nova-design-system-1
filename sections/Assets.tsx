
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Button from '../components/Button';
import { Table } from '../components/Table';
import { IconPlus, IconSearch, IconDownload, IconCloudUpload } from '../components/Icons';
import { Input } from '../components/Input';
import { Modal } from '../components/Surfaces';
import { Dropdown } from '../components/Dropdown';
import { UploadPreview } from '../components/UploadPreview';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';

const Assets: React.FC = () => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loadingAssets, setLoadingAssets] = useState(true);
    const [assets, setAssets] = useState<any[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        accountId: '',
        file: null as File | null,
    });
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAccounts();
        fetchAssets();
    }, []);

    const fetchAccounts = async () => {
        setLoadingAccounts(true);
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .order('name', { ascending: true });

        if (!error && data) {
            setAccounts(data);
        }
        setLoadingAccounts(false);
    };

    const fetchAssets = async () => {
        setLoadingAssets(true);
        const { data, error } = await supabase
            .from('assets')
            .select(`
                *,
                accounts (
                    id,
                    name,
                    prefix,
                    display_prefix
                )
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            const formattedAssets = data.map(item => ({
                id: item.id,
                name: item.name,
                type: item.file_type,
                size: item.file_size,
                account: item.accounts?.prefix || item.accounts?.display_prefix || 'System',
                date: new Date(item.created_at).toISOString().replace('T', ' ').substring(0, 16),
                url: item.storage_path
            }));
            setAssets(formattedAssets);
        }
        setLoadingAssets(false);
    };

    const accountOptions = useMemo(() => {
        return accounts.map(acc => ({
            value: acc.id,
            label: `${acc.name} (${acc.prefix || acc.display_prefix})`,
        }));
    }, [accounts]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, file }));
            setUploadStatus('success');
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleUploadSubmit = async () => {
        if (!formData.file || !formData.accountId) {
            addToast({ type: 'error', title: 'Missing Info', message: 'Please select a file and an account.' });
            return;
        }

        // Limit check: 500MB
        const MAX_SIZE = 500 * 1024 * 1024;
        if (formData.file.size > MAX_SIZE) {
            addToast({
                type: 'error',
                title: 'File Too Large',
                message: 'Asset size exceeds the 500MB limit. Please compress the file and try again.'
            });
            return;
        }

        setSubmitting(true);
        setUploadStatus('uploading');

        try {
            const fileExt = formData.file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`;
            const filePath = fileName; // Upload directly to bucket root

            console.log('Starting upload to bucket: digital-assets, path:', filePath);

            // 1. Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('digital-assets')
                .upload(filePath, formData.file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Storage Upload Error Detail:', uploadError);
                throw uploadError;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('digital-assets')
                .getPublicUrl(filePath);

            // 3. Save to database
            const { error: dbError } = await supabase
                .from('assets')
                .insert([{
                    name: formData.name || formData.file.name.split('.')[0],
                    file_type: (fileExt || 'FILE').toUpperCase(),
                    file_size: `${(formData.file.size / 1024 / 1024).toFixed(2)} MB`,
                    account_id: formData.accountId,
                    storage_path: publicUrl
                }]);

            if (dbError) throw dbError;

            addToast({ type: 'success', title: 'Asset Uploaded', message: 'Your file has been added to the library.' });
            setIsUploadModalOpen(false);
            setFormData({ name: '', accountId: '', file: null });
            setUploadStatus('idle');
            fetchAssets(); // Refresh list

        } catch (error: any) {
            console.error('Upload error:', error);
            setUploadStatus('error');
            addToast({ type: 'error', title: 'Upload Failed', message: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownload = async (asset: any) => {
        if (!asset.url) return;

        try {
            addToast({ type: 'info', title: 'Preparing Download', message: 'Downloading your asset...' });

            const response = await fetch(asset.url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = asset.name || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);

            addToast({ type: 'success', title: 'Start Download', message: 'Your file is ready.' });
        } catch (error) {
            console.error('Download error:', error);
            addToast({ type: 'error', title: 'Download Failed', message: 'Could not trigger the download.' });
            // Fallback
            window.open(asset.url, '_blank');
        }
    };

    const columns = [
        {
            header: 'Name',
            key: 'name',
            render: (item: any) => (
                <span className="font-semibold text-white/90">{item.name}</span>
            )
        },
        {
            header: 'Account',
            key: 'account',
            render: (item: any) => <span className="text-gray-400 font-medium">{item.account}</span>
        },
        {
            header: 'Size',
            key: 'size',
            render: (item: any) => <span className="text-gray-400">{item.size}</span>
        },
        {
            header: 'Uploaded',
            key: 'date',
            render: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-gray-400 text-xs">{item.date.split(' ')[0]}</span>
                    <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">{item.date.split(' ')[1]}</span>
                </div>
            )
        },
        {
            header: '',
            key: 'actions',
            className: 'text-right w-20',
            render: (item: any) => (
                <button
                    onClick={() => handleDownload(item)}
                    className="text-gray-500 hover:text-brand-primary transition-colors p-2 hover:bg-brand-primary/10 rounded-lg group"
                >
                    <IconDownload className="w-5 h-5 transition-transform group-active:translate-y-0.5" />
                </button>
            )
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            {/* Header with Search and Upload */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="w-full sm:w-80">
                    <Input
                        placeholder="Search assets..."
                        leftIcon={<IconSearch className="w-4 h-4" />}
                        variant="metallic"
                        size="sm"
                    />
                </div>
                <Button
                    variant="metallic"
                    size="sm"
                    leftIcon={<IconPlus className="w-4 h-4" />}
                    onClick={() => setIsUploadModalOpen(true)}
                    className="shadow-lg shadow-brand-primary/10"
                >
                    Upload Asset
                </Button>
            </div>

            {/* Assets Table */}
            <Table
                columns={columns}
                data={assets}
                isLoading={loadingAssets}
                isMetallicHeader={true}
                emptyMessage="No assets found. Click 'Upload Asset' to add your first project file."
                className="animate-in fade-in zoom-in-95 duration-500 delay-100"
            />

            {/* Upload Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Upload New Asset"
                size="sm"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsUploadModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic"
                            onClick={handleUploadSubmit}
                            isLoading={submitting}
                            disabled={!formData.file || !formData.accountId}
                        >
                            Start Upload
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <UploadPreview
                        status={uploadStatus}
                        fileName={formData.file?.name}
                        fileSize={formData.file ? `${(formData.file.size / 1024 / 1024).toFixed(2)} MB` : undefined}
                        onUpload={handleUploadClick}
                        onReplace={() => {
                            setUploadStatus('idle');
                            handleUploadClick();
                        }}
                        onRemove={() => {
                            setFormData(prev => ({ ...prev, file: null, name: '' }));
                            setUploadStatus('idle');
                        }}
                        className="border-dashed border-2 hover:border-brand-primary transition-colors"
                    />

                    <div className="space-y-4">
                        <Input
                            label="Asset Name"
                            placeholder="e.g. Project_Draft_v1"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />

                        <Dropdown
                            label="Account Selection"
                            placeholder="Select an account"
                            options={accountOptions}
                            value={formData.accountId}
                            onChange={(val) => setFormData(prev => ({ ...prev, accountId: val }))}
                            isLoading={loadingAccounts}
                            showSearch={true}
                            searchPlaceholder="Search accounts..."
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Assets;

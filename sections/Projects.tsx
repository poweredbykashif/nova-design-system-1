
import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../lib/supabase';
import { Tabs, Pagination } from '../components/Navigation';
import Button from '../components/Button';
import { Table } from '../components/Table';
import { IconPlus, IconSearch, IconEye, IconTrash, IconAlertTriangle, IconInfo, IconX, IconFile, IconFileText, IconFileImage, IconFileVideo, IconFileArchive, IconCalendar, IconMaximize, IconChevronRight } from '../components/Icons';
import { Modal } from '../components/Surfaces';
import { Input, TextArea } from '../components/Input';
import { DatePicker } from '../components/DatePicker';
import { formatDeadlineDate, formatTime, getTimeLeft } from '../utils/formatter';
import { Calendar } from '../components/Calendar';
import { TimeSelect } from '../components/TimeSelect';
import { Dropdown } from '../components/Dropdown';
import { Radio, Checkbox } from '../components/Selection';
import { addToast } from '../components/Toast';
import { getInitialTab, updateRoute } from '../utils/routing';
import { useNotifications } from '../contexts/NotificationContext';
import { triggerWebhooks } from '../utils/webhookTrigger';
import { useUser } from '../contexts/UserContext';
import { useAccounts } from '../contexts/AccountContext';

interface ProjectsProps {
    onProjectOpen?: (id: string) => void;
    isProjectOpen?: boolean;
}

export interface ProjectsHandle {
    refresh: () => void;
}

const Projects = forwardRef<ProjectsHandle, ProjectsProps>(({ onProjectOpen, isProjectOpen }, ref) => {
    useImperativeHandle(ref, () => ({
        refresh: () => {
            fetchProjects();
        }
    }));
    const [activeTab, setActiveTab] = useState(getInitialTab('Projects', 'progress'));

    useEffect(() => {
        // Only update route when no project is open to avoid overwriting project URLs
        if (!isProjectOpen) {
            updateRoute('Projects', activeTab);
        }
    }, [activeTab, isProjectOpen]);

    useEffect(() => {
        const handlePopState = () => {
            setActiveTab(getInitialTab('Projects', 'progress'));
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedMove, setSelectedMove] = useState<string | null>(null);
    const [orderType, setOrderType] = useState<string | null>(null);
    const [price, setPrice] = useState('');
    const [soldItems, setSoldItems] = useState<string[]>([]);
    const [otherSoldText, setOtherSoldText] = useState('');
    const { accounts, loading: accountsLoading } = useAccounts();
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [logoNoType, setLogoNoType] = useState<string | null>(null);
    const [manualLogoNo, setManualLogoNo] = useState('');
    const [clientType, setClientType] = useState<string | null>(null);
    const [clientName, setClientName] = useState('');
    const [previousLogoNo, setPreviousLogoNo] = useState('');
    const [medium, setMedium] = useState<string | null>(null);
    const [projectTitle, setProjectTitle] = useState('');
    const [projectBriefText, setProjectBriefText] = useState('');
    const [projectBriefFiles, setProjectBriefFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [addons, setAddons] = useState<string[]>([]);
    const [addonsOther, setAddonsOther] = useState('');
    const [isBriefExpanded, setIsBriefExpanded] = useState(false);
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [dueTime, setDueTime] = useState('17:00');
    const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
    const [removalReason, setRemovalReason] = useState<string | null>(null);
    const [removalOtherText, setRemovalOtherText] = useState('');
    const [removeProjectId, setRemoveProjectId] = useState('');
    const [cancellationReason, setCancellationReason] = useState<string | null>(null);
    const [cancellationOtherText, setCancellationOtherText] = useState('');
    const [cancelProjectId, setCancelProjectId] = useState('');
    const [approveTips, setApproveTips] = useState<string | null>(null);
    const [approveAmount, setApproveAmount] = useState('');
    const [approveProjectId, setApproveProjectId] = useState('');
    const [showReview, setShowReview] = useState(false);
    const [isReviewLoading, setIsReviewLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [teamMembers, setTeamMembers] = useState<any[]>([]); // Freelancers for assignee dropdown
    const [pmCollaborators, setPmCollaborators] = useState<any[]>([]); // Project Managers for collaborators
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFilter, setSearchFilter] = useState('id');
    const [alertFilter, setAlertFilter] = useState<'dispute' | 'arthelp' | null>(null);
    const [tableData, setTableData] = useState<any[] | null>(null);

    const { profile } = useUser();
    const isFreelancer = profile?.role === 'Freelancer';
    const { addNotification } = useNotifications();

    const fetchProjects = async () => {
        if (!profile) return;

        const userRole = profile.role?.toLowerCase().trim();
        let projectData;

        if (userRole === 'admin' || userRole === 'freelancer') {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .neq('status', 'Removed')
                .neq('status', 'Cancelled')
                .order('created_at', { ascending: false });

            if (!error) projectData = data;
        } else if (userRole === 'project manager') {
            const { data: userTeams } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('member_id', profile.id);

            if (userTeams && userTeams.length > 0) {
                const teamIds = userTeams.map(t => t.team_id);
                const { data: teamAccountLinks } = await supabase
                    .from('team_accounts')
                    .select('account_id')
                    .in('team_id', teamIds);

                if (teamAccountLinks && teamAccountLinks.length > 0) {
                    const accountIds = [...new Set(teamAccountLinks.map(ta => ta.account_id))];
                    const { data, error } = await supabase
                        .from('projects')
                        .select('*')
                        .in('account_id', accountIds)
                        .neq('status', 'Removed')
                        .neq('status', 'Cancelled')
                        .order('created_at', { ascending: false });

                    if (!error) projectData = data;
                }
            }
        }

        if (projectData) {
            const mappedData = projectData.map(p => ({
                id: p.project_id,
                title: p.project_title || 'Untitled',
                client: p.client_name || p.client_type || 'Unknown',
                assignee: p.assignee || 'Unassigned',
                dueDate: formatDeadlineDate(p.due_date),
                dueTime: p.due_time ? p.due_time.substring(0, 5) : '',
                status: p.status,
                price: p.price ? `$${p.price}` : '',
                timeLeft: getTimeLeft(p.due_date ? `${p.due_date}T${p.due_time || '00:00:00'}` : null),
                hasDispute: p.has_dispute || false,
                hasArtHelp: p.has_art_help || false
            }));
            setTableData(mappedData);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [profile]);

    useEffect(() => {
        const fetchFreelancers = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, email, role')
                .ilike('role', 'freelancer')
                .order('name', { ascending: true });

            if (!error && data) setTeamMembers(data);
        };
        fetchFreelancers();
    }, []);

    useEffect(() => {
        const fetchPMCollaborators = async () => {
            if (!profile) return;
            const userRole = profile.role?.toLowerCase().trim();
            if (userRole !== 'project manager' && userRole !== 'admin') {
                setPmCollaborators([]);
                return;
            }

            const { data: userTeams } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('member_id', profile.id);

            if (userTeams && userTeams.length > 0) {
                const teamIds = userTeams.map(t => t.team_id);
                const { data: teamPMs } = await supabase
                    .from('team_members')
                    .select('member_id, profiles(id, name, email, role)')
                    .in('team_id', teamIds)
                    .neq('member_id', profile.id);

                if (teamPMs) {
                    const uniquePMs = Array.from(new Map(
                        teamPMs
                            .filter((m: any) => m.profiles?.role?.toLowerCase().trim() === 'project manager')
                            .map((m: any) => [m.profiles.id, m.profiles])
                    ).values());
                    setPmCollaborators(uniquePMs);
                }
            }
        };
        fetchPMCollaborators();
    }, [profile]);

    const toggleSoldItem = (item: string) => {
        setSoldItems(prev => {
            const next = prev.includes(item)
                ? prev.filter(i => i !== item)
                : [...prev, item];
            // Clear other text if Other is deselected
            if (item === 'Other' && !next.includes('Other')) {
                setOtherSoldText('');
            }
            return next;
        });
    };

    const toggleAddon = (item: string) => {
        setAddons(prev => {
            const next = prev.includes(item)
                ? prev.filter(i => i !== item)
                : [...prev, item];
            // Clear other text if Other is deselected
            if (item === 'Other' && !next.includes('Other')) {
                setAddonsOther('');
            }
            return next;
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        // Reset the input value so the same file fails can be selected again if needed
        e.target.value = '';

        setIsUploading(true);
        // Simulate upload delay
        setTimeout(() => {
            setProjectBriefFiles(prev => [...prev, ...selectedFiles]);
            setIsUploading(false);
        }, 1500);
    };

    const removeFile = (index: number) => {
        setProjectBriefFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Map tab IDs to their corresponding data status
    const statusMap: Record<string, string> = useMemo(() => ({
        'progress': 'In Progress',
        'revision': 'Revision',
        'revision-urgent': 'Revision Urgent',
        'urgent': 'Urgent',
        'approval': 'Sent For Approval',
        'cancelled': 'Cancelled',
        'done': 'Done',
        'revision-done': 'Revision Done',
        'revision-urgent-done': 'Revision Urgent Done',
        'urgent-done': 'Urgent Done',
        'approved': 'Approved'
    }), []);

    // Compute counts dynamically from tableData
    const projectCounts = useMemo(() => {
        const counts: Record<string, number> = {
            'all': 0,
            'progress': 0,
            'revision': 0,
            'revision-urgent': 0,
            'urgent': 0,
            'approval': 0,
            'cancelled': 0,
            'done': 0,
            'revision-done': 0,
            'revision-urgent-done': 0,
            'urgent-done': 0,
            'approved': 0,
            'dispute': 0,
            'arthelp': 0
        };

        if (!tableData) return counts;

        counts['all'] = tableData.length;

        tableData.forEach(project => {
            const status = project.status?.trim().toLowerCase();
            // Check each key in statusMap
            Object.entries(statusMap).forEach(([key, mappedStatus]) => {
                if (status === mappedStatus.toLowerCase()) {
                    counts[key] = (counts[key] || 0) + 1;
                }
            });

            if (project.hasDispute) counts['dispute']++;
            if (project.hasArtHelp) counts['arthelp']++;
        });

        return counts;
    }, [tableData, statusMap]);

    // Compute filtered data based on search query and filter type
    const filteredData = useMemo(() => {
        let data = tableData || [];

        // 1. FILTER BY TAB
        if (activeTab !== 'all') {
            const targetStatus = statusMap[activeTab];
            if (targetStatus) {
                data = data.filter(item => item.status?.trim().toLowerCase() === targetStatus.toLowerCase());
            }
        }

        // 2. FILTER BY ALERT
        if (alertFilter === 'dispute') {
            data = data.filter(item => item.hasDispute);
        } else if (alertFilter === 'arthelp') {
            data = data.filter(item => item.hasArtHelp);
        }

        // 3. FILTER BY SEARCH
        if (!searchQuery.trim()) {
            return data;
        }

        const query = searchQuery.trim();

        // Apply filter based on selected filter type
        switch (searchFilter) {
            case 'id':
                return data.filter(item => item.id.toLowerCase() === query.toLowerCase());
            case 'client':
                return data.filter(item => item.client.toLowerCase().includes(query.toLowerCase()));
            case 'designer':
                return data.filter(item => item.assignee.toLowerCase().includes(query.toLowerCase()));
            case 'title':
                return data.filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
            default:
                return data;
        }
    }, [searchQuery, searchFilter, tableData, activeTab, statusMap, alertFilter]);

    // PAGINATION LOGIC
    const ITEMS_PER_PAGE = 6;
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, searchFilter]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    const accountOptions = useMemo(() => {
        return accounts.map(acc => ({
            value: acc.id,
            label: acc.name,
            description: acc.prefix
        }));
    }, [accounts]);

    const currentPrefix = useMemo(() => {
        const acc = accounts.find(a => a.id === selectedAccount);
        return acc?.prefix || 'ARS';
    }, [accounts, selectedAccount]);

    const filterOptions = [
        { value: 'id', label: 'Project ID' },
        { value: 'client', label: 'Client Name' },
        { value: 'designer', label: 'Assignee' },
        { value: 'title', label: 'Project Title' }
    ];

    const row1Tabs = [
        { id: 'progress', label: `In Progress${tableData && projectCounts['progress'] > 0 ? ` (${projectCounts['progress']})` : ''}` },
        { id: 'revision', label: `Revision${tableData && projectCounts['revision'] > 0 ? ` (${projectCounts['revision']})` : ''}` },
        { id: 'revision-urgent', label: `Revision Urgent${tableData && projectCounts['revision-urgent'] > 0 ? ` (${projectCounts['revision-urgent']})` : ''}` },
        { id: 'urgent', label: `Urgent${tableData && projectCounts['urgent'] > 0 ? ` (${projectCounts['urgent']})` : ''}` },
        { id: 'approval', label: `Sent For Approval${tableData && projectCounts['approval'] > 0 ? ` (${projectCounts['approval']})` : ''}` },
        { id: 'cancelled', label: `Cancelled${tableData && projectCounts['cancelled'] > 0 ? ` (${projectCounts['cancelled']})` : ''}` },
    ];

    const row2Tabs = [
        { id: 'all', label: `All${tableData && projectCounts['all'] > 0 ? ` (${projectCounts['all']})` : ''}` },
        { id: 'done', label: `Done${tableData && projectCounts['done'] > 0 ? ` (${projectCounts['done']})` : ''}` },
        { id: 'revision-done', label: `Revision Done${tableData && projectCounts['revision-done'] > 0 ? ` (${projectCounts['revision-done']})` : ''}` },
        { id: 'revision-urgent-done', label: `Revision Urgent Done${tableData && projectCounts['revision-urgent-done'] > 0 ? ` (${projectCounts['revision-urgent-done']})` : ''}` },
        { id: 'urgent-done', label: `Urgent Done${tableData && projectCounts['urgent-done'] > 0 ? ` (${projectCounts['urgent-done']})` : ''}` },
        { id: 'approved', label: `Approved${tableData && projectCounts['approved'] > 0 ? ` (${projectCounts['approved']})` : ''}` },
    ];

    const columns = [
        { header: 'Project ID', key: 'id', className: 'w-36' },
        {
            header: 'Project Title',
            key: 'title',
            className: 'min-w-[160px]',
            render: (item: any) => (
                <div className="flex items-center gap-2">
                    <span className="truncate">{item.title}</span>
                    {item.hasDispute && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium !bg-brand-error/10 !text-brand-error whitespace-nowrap">
                            Dispute
                        </span>
                    )}
                    {item.hasArtHelp && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium !bg-brand-info/10 !text-brand-info whitespace-nowrap">
                            Art Help
                        </span>
                    )}
                </div>
            )
        },
        { header: 'Client Name', key: 'client', className: 'w-48' },
        { header: 'Assignee', key: 'assignee', className: 'w-48' },
        {
            header: 'Deadline',
            key: 'dueDate',
            className: 'w-44',
            render: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-white font-medium">{item.dueDate}</span>
                    <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">{formatTime(item.dueTime)}</span>
                </div>
            )
        },
        { header: 'Status', key: 'status', className: 'w-56' },
        { header: 'Price', key: 'price', className: 'w-24' },
        {
            header: 'Time Left',
            key: 'timeLeft',
            className: 'w-44',
            render: (item: any) => (
                <span className={`text-[11px] font-bold uppercase tracking-wider ${item.timeLeft.color}`}>
                    {item.timeLeft.label}
                </span>
            )
        },
        {
            header: '',
            key: 'actions',
            className: 'w-20 text-right',
            render: (item: any) => (
                <button
                    onClick={() => onProjectOpen?.(item.id)}
                    className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all duration-200 group active:scale-95 shadow-sm"
                >
                    <IconChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
            )
        },
    ];

    const handleReset = () => {
        setSelectedMove(null);
        setOrderType(null);
        setPrice('');
        setSoldItems([]);
        setOtherSoldText('');
        setSelectedAccount(null);
        setLogoNoType(null);
        setManualLogoNo('');
        setClientType(null);
        setClientName('');
        setPreviousLogoNo('');
        setMedium(null);
        setProjectTitle('');
        setProjectBriefText('');
        setProjectBriefFiles([]);
        setIsUploading(false);
        setAddons([]);
        setAddonsOther('');
        setIsBriefExpanded(false);
        setDueDate(null);
        setDueTime('17:00');
        setSelectedAssignee(null);
        setCurrentStep(1);
        setRemovalReason(null);
        setRemovalOtherText('');
        setRemoveProjectId('');
        setCancellationReason(null);
        setCancellationOtherText('');
        setCancelProjectId('');
        setApproveTips(null);
        setApproveAmount('');
        setApproveProjectId('');
        setShowReview(false);
        setIsReviewLoading(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">

            {/* Navigation & Controls Section */}
            <div className="flex flex-col items-center gap-3.5">
                {/* Row 1 Tabs - Centered horizontally */}
                <div className="w-full flex justify-center">
                    <Tabs
                        tabs={row1Tabs}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                </div>

                {/* 
                        Row 2 Tabs + Action Button
                        Treating them as 1 group while centralizing.
                    */}
                <div className="w-full flex justify-center items-center gap-3">
                    <Tabs
                        tabs={row2Tabs}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />

                    {!isFreelancer && (
                        <Button
                            variant="metallic"
                            size="md"
                            leftIcon={<IconPlus className="w-4 h-4" />}
                            onClick={() => setIsModalOpen(true)}
                            className="h-[50px] shadow-lg shadow-brand-primary/10"
                        >
                            Choose Your Move
                        </Button>
                    )}
                </div>

            </div>

            {/* Table Controls & Data Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    {/* Secondary Actions - Top Left of Table */}
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAlertFilter(prev => prev === 'dispute' ? null : 'dispute')}
                            className={`
                                rounded-xl border-transparent transition-all duration-300
                                ${alertFilter === 'dispute'
                                    ? '!bg-brand-error !text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                    : '!bg-brand-error/10 !text-brand-error hover:!bg-brand-error/20'
                                }
                                focus:!ring-brand-error/30 focus:!ring-offset-0 focus:!border-brand-error/40
                            `}
                        >
                            Disputes{projectCounts['dispute'] > 0 ? ` (${projectCounts['dispute']})` : ''}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAlertFilter(prev => prev === 'arthelp' ? null : 'arthelp')}
                            className={`
                                rounded-xl border-transparent transition-all duration-300
                                ${alertFilter === 'arthelp'
                                    ? '!bg-brand-info !text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]'
                                    : '!bg-brand-info/10 !text-brand-info hover:!bg-brand-info/20'
                                }
                                focus:!ring-brand-info/30 focus:!ring-offset-0 focus:!border-brand-info/40
                            `}
                        >
                            Art Helps{projectCounts['arthelp'] > 0 ? ` (${projectCounts['arthelp']})` : ''}
                        </Button>
                    </div>

                    {/* Search & Filter - Top Right of Table */}
                    <div className="flex items-center gap-3">
                        <div className="w-36 shrink-0">
                            <Dropdown
                                size="sm"
                                variant="metallic"
                                options={filterOptions}
                                value={searchFilter}
                                onChange={(val) => setSearchFilter(val)}
                            />
                        </div>
                        <div className="w-64">
                            <Input
                                size="sm"
                                variant="metallic"
                                placeholder={`Search...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftIcon={<IconSearch className="w-4 h-4" />}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                <Table
                    columns={columns}
                    data={paginatedData || []}
                    emptyMessage="Your projects will appear here once they are loaded."
                    isLoading={!tableData}
                    isMetallicHeader={true}
                    className="animate-in fade-in zoom-in-95 duration-500 delay-100"
                />

                {/* Pagination Controls */}
                {filteredData.length > ITEMS_PER_PAGE && (
                    <div className="flex justify-center pt-4 pb-8">
                        <Pagination
                            current={currentPage}
                            total={Math.ceil(filteredData.length / ITEMS_PER_PAGE)}
                            onChange={(page) => {
                                setCurrentPage(page);
                                // Scroll to top of table or page
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Choose Your Move Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    handleReset();
                }}
                title={showReview ? "Final Review" : "Choose Your Move"}
                size={showReview ? "full" : "sm"}
                isElevatedFooter
                footer={(
                    <div className="flex justify-end gap-3 items-center">
                        {showReview ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowReview(false)}
                                >
                                    Back
                                </Button>
                                <Button
                                    variant="metallic"
                                    isLoading={isSubmitting}
                                    disabled={
                                        isSubmitting || (
                                            selectedMove === 'Remove'
                                                ? (!removalReason || (removalReason === 'Other' && !removalOtherText.trim()) || !removeProjectId.match(/^[A-Z]{2,4}\s\d{6}$/))
                                                : selectedMove === 'Cancel'
                                                    ? (!cancellationReason || (cancellationReason === 'Other' && !cancellationOtherText.trim()) || !cancelProjectId.match(/^[A-Z]{2,4}\s\d{6}$/))
                                                    : selectedMove === 'Approve'
                                                        ? (!approveTips || (approveTips === 'Yes' && !approveAmount) || !approveProjectId.match(/^[A-Z]{2,4}\s\d{6}$/))
                                                        : (!selectedAssignee || !dueDate || !projectTitle.trim() || !selectedAccount)
                                        )
                                    }
                                    onClick={async () => {
                                        console.log('--- SUBMISSION START ---');
                                        setIsSubmitting(true);

                                        try {
                                            const move = selectedMove;
                                            const title = (projectTitle || '').trim();
                                            const account = selectedAccount;
                                            const prefix = currentPrefix || 'ARS';
                                            const type = orderType;
                                            const designType = logoNoType;
                                            const manualPId = (manualLogoNo || '').trim();
                                            const items = Array.isArray(soldItems) ? [...soldItems] : [];
                                            const otherItems = otherSoldText || '';
                                            const addonsList = Array.isArray(addons) ? [...addons] : [];
                                            const addonsOtherText = addonsOther || '';
                                            const client = clientType;
                                            const name = clientName || '';
                                            const prevLogo = previousLogoNo || '';
                                            const projectMedium = medium;
                                            const projectPriceString = price || '0';
                                            const brief = projectBriefText || '';
                                            const date = dueDate;
                                            const time = dueTime || '17:00';
                                            const assignee = selectedAssignee;

                                            console.log('Validated State:', { move, title, account, date });

                                            if (move === 'Add' && (!account || !title || !date)) {
                                                throw new Error('Please fill in Account, Project Title, and Due Date.');
                                            }

                                            if (move === 'Remove') {
                                                console.log('Executing REMOVE - PERMANENT DELETE');

                                                // 1. Delete associated notifications first
                                                const { error: notifError } = await supabase
                                                    .from('notifications')
                                                    .delete()
                                                    .eq('reference_id', removeProjectId);

                                                if (notifError) console.warn('Error deleting notifications:', notifError);

                                                // 2. Delete the project (will cascade to comments/earnings/etc via foreign keys if set up, or just remove the source of data)
                                                const { error: err } = await supabase.from('projects')
                                                    .delete()
                                                    .eq('project_id', removeProjectId);

                                                if (err) throw err;

                                            } else if (move === 'Cancel') {
                                                console.log('Executing CANCEL');
                                                const { error: err } = await supabase.from('projects')
                                                    .update({
                                                        action_move: 'Cancel',
                                                        cancellation_reason: cancellationReason === 'Other' ? cancellationOtherText : cancellationReason,
                                                        status: 'Cancelled',
                                                        updated_at: new Date().toISOString()
                                                    })
                                                    .eq('project_id', cancelProjectId);
                                                if (err) throw err;

                                            } else if (move === 'Approve') {
                                                console.log('Executing APPROVE');
                                                const { error: err } = await supabase.from('projects')
                                                    .update({
                                                        action_move: 'Approve',
                                                        tips_given: approveTips === 'Yes',
                                                        tip_amount: approveTips === 'Yes' ? parseFloat(approveAmount) : 0,
                                                        status: 'Approved',
                                                        updated_at: new Date().toISOString()
                                                    })
                                                    .eq('project_id', approveProjectId);
                                                if (err) throw err;

                                            } else if (move === 'Add') {
                                                // ADD Branch
                                                console.log('Executing ADD');
                                                const pId = (designType === 'Add Manually' && manualPId)
                                                    ? manualPId
                                                    : `${prefix} ${Math.floor(100000 + Math.random() * 900000)}`;

                                                const accObj = accounts.find(a => a.id === account);
                                                const accountName = accObj?.name || account;

                                                const itemsSoldJson = {
                                                    items: items,
                                                    other: items.includes('Other') ? otherItems : null
                                                };

                                                const addonsJson = {
                                                    items: addonsList,
                                                    other: addonsList.includes('Other') ? addonsOtherText : null
                                                };

                                                // Robust Date Formatting
                                                let formattedDate = null;
                                                try {
                                                    if (date instanceof Date) {
                                                        formattedDate = date.toISOString().split('T')[0];
                                                    } else if (typeof date === 'string' && date.includes('T')) {
                                                        formattedDate = date.split('T')[0];
                                                    } else {
                                                        formattedDate = date; // fallback to raw
                                                    }
                                                } catch (dateErr) {
                                                    console.warn('Date formatting failed, using raw:', date);
                                                    formattedDate = date;
                                                }

                                                // Process Attachments
                                                const attachmentPromises = projectBriefFiles.map(file => {
                                                    return new Promise((resolve) => {
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => resolve({
                                                            name: file.name,
                                                            type: file.type,
                                                            size: file.size,
                                                            url: e.target?.result as string
                                                        });
                                                        reader.readAsDataURL(file);
                                                    });
                                                });

                                                const attachmentsJson = await Promise.all(attachmentPromises);

                                                const payload = {
                                                    project_id: pId,
                                                    action_move: 'Add',
                                                    project_title: title,
                                                    account: accountName,
                                                    account_id: account,
                                                    client_type: client,
                                                    client_name: client === 'new' ? name : null,
                                                    previous_logo_no: client === 'old' ? prevLogo : null,
                                                    items_sold: itemsSoldJson,
                                                    addons: addonsJson,
                                                    medium: projectMedium,
                                                    price: parseFloat(String(projectPriceString).replace(/[^0-9.]/g, '')) || 0,
                                                    brief: brief,
                                                    attachments: attachmentsJson, // Added attachments
                                                    due_date: formattedDate,
                                                    due_time: time,
                                                    assignee: assignee,
                                                    primary_manager_id: profile?.id,
                                                    collaborators: pmCollaborators
                                                        .map(m => ({ id: m.id, name: m.name, role: m.role })),
                                                    status: 'In Progress'
                                                };

                                                console.log('Inserting payload:', payload);
                                                // Using select() without single() for more reliability in some environments
                                                const { data: insertedData, error: insertError } = await supabase
                                                    .from('projects')
                                                    .insert([payload])
                                                    .select();

                                                if (insertError) throw insertError;

                                                const inserted = insertedData && insertedData[0];
                                                if (inserted) {
                                                    console.log('Insertion confirmed:', inserted.project_id);

                                                    const newProject = {
                                                        id: inserted.project_id,
                                                        title: inserted.project_title || 'Untitled',
                                                        client: inserted.client_name || inserted.client_type || 'Unknown',
                                                        assignee: inserted.assignee || 'Unassigned',
                                                        dueDate: formatDeadlineDate(inserted.due_date),
                                                        dueTime: inserted.due_time ? inserted.due_time.substring(0, 5) : '',
                                                        status: inserted.status,
                                                        price: inserted.price ? `$${inserted.price}` : '',
                                                        timeLeft: getTimeLeft(inserted.due_date ? `${inserted.due_date}T${inserted.due_time || '00:00:00'}` : null),
                                                        hasDispute: inserted.has_dispute || false,
                                                        hasArtHelp: inserted.has_art_help || false
                                                    };
                                                    setTableData(prev => [newProject, ...(prev || [])]);

                                                    // Silent side effects
                                                    addNotification({
                                                        type: 'project_created',
                                                        reference_id: inserted.project_id,
                                                        message: `New project created: ${inserted.project_title || 'Untitled'}`,
                                                        is_read: false
                                                    }).catch(e => console.error('BG Notification Error:', e));

                                                    triggerWebhooks('projectCreated', {
                                                        ...inserted,
                                                        order_type: type,
                                                        logo_no_type: designType,
                                                        sold_items: items,
                                                        other_sold_text: otherItems,
                                                        addons_list: addonsList,
                                                        addons_other_text: addonsOtherText
                                                    }).catch(e => console.error('BG Webhook Error:', e));
                                                }
                                            }

                                            addToast({ type: 'success', title: 'Success', message: 'Project details submitted successfully' });

                                            if (move !== 'Add') {
                                                await fetchProjects();
                                            }

                                            setIsModalOpen(false);
                                            handleReset();

                                        } catch (e: any) {
                                            console.error('SUBMISSION ERROR:', e);
                                            addToast({
                                                type: 'error',
                                                title: 'Submission Failed',
                                                message: e.message || 'Check database connection'
                                            });
                                        } finally {
                                            setIsSubmitting(false);
                                            console.log('--- SUBMISSION END ---');
                                        }
                                    }}
                                >
                                    Submit
                                </Button>
                            </>
                        ) : (
                            <>
                                {currentStep === 1 ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            handleReset();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentStep(prev => prev - 1)}
                                        disabled={isReviewLoading}
                                    >
                                        Back
                                    </Button>
                                )}
                                <Button
                                    variant="metallic"
                                    isLoading={isReviewLoading}
                                    disabled={
                                        currentStep === 1 ? !selectedMove :
                                            selectedMove === 'Remove' ? (
                                                currentStep === 2 ? (!removalReason || (removalReason === 'Other' && !removalOtherText.trim())) :
                                                    currentStep === 3 ? !removeProjectId.match(/^[A-Z]{2,4}\s\d{6}$/) :
                                                        false
                                            ) :
                                                selectedMove === 'Cancel' ? (
                                                    currentStep === 2 ? (!cancellationReason || (cancellationReason === 'Other' && !cancellationOtherText.trim())) :
                                                        currentStep === 3 ? !cancelProjectId.match(/^[A-Z]{2,4}\s\d{6}$/) :
                                                            false
                                                ) :
                                                    selectedMove === 'Approve' ? (
                                                        currentStep === 2 ? !approveTips :
                                                            currentStep === 3 && approveTips === 'Yes' ? !approveAmount :
                                                                (currentStep === 4 || (currentStep === 3 && approveTips === 'No')) ? !approveProjectId.match(/^[A-Z]{2,4}\s\d{6}$/) :
                                                                    false
                                                    ) :
                                                        (
                                                            currentStep === 2 ? !orderType :
                                                                currentStep === 3 ? !price.trim() :
                                                                    currentStep === 4 ? (soldItems.length === 0 || (soldItems.includes('Other') && !otherSoldText.trim())) :
                                                                        currentStep === 5 ? !selectedAccount :
                                                                            currentStep === 6 ? (!logoNoType || (logoNoType === 'Add Manually' && !manualLogoNo.trim())) :
                                                                                currentStep === 7 ? !clientType :
                                                                                    currentStep === 8 ? (clientType === 'new' ? !clientName.trim() : !previousLogoNo.trim()) :
                                                                                        currentStep === 9 ? !medium :
                                                                                            currentStep === 10 ? !projectTitle.trim() :
                                                                                                currentStep === 11 ? isUploading :
                                                                                                    currentStep === 12 ? false :
                                                                                                        currentStep === 13 ? !dueDate :
                                                                                                            currentStep === 14 ? !selectedAssignee :
                                                                                                                false
                                                        )
                                    }
                                    onClick={() => {
                                        const getMaxSteps = () => {
                                            if (selectedMove === 'Remove') return 3;
                                            if (selectedMove === 'Cancel') return 3;
                                            if (selectedMove === 'Add') return 14;
                                            if (selectedMove === 'Approve') {
                                                return approveTips === 'Yes' ? 4 : 3;
                                            }
                                            return 1; // Default
                                        };
                                        const maxSteps = getMaxSteps();

                                        if (currentStep < maxSteps) {
                                            // Conditional navigation for Approve Tips
                                            if (selectedMove === 'Approve' && currentStep === 2 && approveTips === 'No') {
                                                // Skip step 3 (Amount) -> go to Project ID
                                                setCurrentStep(prev => prev + 1);
                                            } else {
                                                setCurrentStep(prev => prev + 1);
                                            }
                                        } else {
                                            // Unified transition for both branches
                                            setIsReviewLoading(true);
                                            setTimeout(() => {
                                                setIsReviewLoading(false);
                                                setShowReview(true);
                                            }, 800);
                                        }
                                    }}
                                >
                                    {((selectedMove === 'Remove' && currentStep === 3) || (selectedMove === 'Add' && currentStep === 14) || (selectedMove === 'Cancel' && currentStep === 3) || (selectedMove === 'Approve' && (currentStep === 4 || (currentStep === 3 && approveTips === 'No')))) ? 'Review' : 'Next'}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            >
                {isReviewLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl animate-in fade-in duration-300">
                        <div className="w-10 h-10 border-3 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                    </div>
                )}

                <div className={`space-y-6 ${isReviewLoading ? 'pointer-events-none' : ''}`}>
                    {!showReview && (
                        <>
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <Radio
                                        label="Add"
                                        name="move-type"
                                        variant="metallic"
                                        checked={selectedMove === 'Add'}
                                        onChange={() => {
                                            if (selectedMove !== 'Add') handleReset();
                                            setSelectedMove('Add');
                                        }}
                                    />
                                    <Radio
                                        label="Remove"
                                        name="move-type"
                                        variant="metallic"
                                        checked={selectedMove === 'Remove'}
                                        onChange={() => {
                                            if (selectedMove !== 'Remove') handleReset();
                                            setSelectedMove('Remove');
                                        }}
                                    />
                                    <Radio
                                        label="Cancel"
                                        name="move-type"
                                        variant="metallic"
                                        checked={selectedMove === 'Cancel'}
                                        onChange={() => {
                                            if (selectedMove !== 'Cancel') handleReset();
                                            setSelectedMove('Cancel');
                                        }}
                                    />
                                    <Radio
                                        label="Approve"
                                        name="move-type"
                                        variant="metallic"
                                        checked={selectedMove === 'Approve'}
                                        onChange={() => {
                                            if (selectedMove !== 'Approve') handleReset();
                                            setSelectedMove('Approve');
                                        }}
                                    />
                                </div>
                            )}

                            {currentStep === 2 && selectedMove === 'Approve' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Any Tips?</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Radio
                                            label="Yes"
                                            name="approve-tips"
                                            variant="metallic"
                                            checked={approveTips === 'Yes'}
                                            onChange={() => setApproveTips('Yes')}
                                        />
                                        <Radio
                                            label="No"
                                            name="approve-tips"
                                            variant="metallic"
                                            checked={approveTips === 'No'}
                                            onChange={() => setApproveTips('No')}
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedMove === 'Approve' && currentStep === 3 && approveTips === 'Yes' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">How Much?</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Input
                                            variant="metallic"
                                            placeholder="Type here"
                                            value={approveAmount}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                    setApproveAmount(val);
                                                }
                                            }}
                                            size="lg"
                                            leftIcon={<span className="text-gray-500">$</span>}
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedMove === 'Approve' && ((currentStep === 4) || (currentStep === 3 && approveTips === 'No')) && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project ID</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Input
                                            variant="metallic"
                                            placeholder="eg ARS 123456"
                                            value={approveProjectId}
                                            onChange={(e) => setApproveProjectId(e.target.value)}
                                            size="lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && selectedMove === 'Remove' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Removal Reason</h3>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">SELECT THE REASON FOR REMOVAL</p>
                                    </div>
                                    <div className="space-y-4">
                                        {['Editing Required', 'Haram', 'Other'].map((item) => (
                                            <React.Fragment key={item}>
                                                <Radio
                                                    label={item}
                                                    name="removal-reason"
                                                    variant="metallic"
                                                    checked={removalReason === item}
                                                    onChange={() => setRemovalReason(item)}
                                                />
                                                {item === 'Other' && removalReason === 'Other' && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="Type reason here"
                                                            value={removalOtherText}
                                                            onChange={(e) => setRemovalOtherText(e.target.value)}
                                                            size="lg"
                                                        />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && selectedMove === 'Cancel' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cancellation Reason</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {['Client Was Unclear', 'Designs Were Not Good Enough', 'Client Not Satisfied', 'Other'].map((item) => (
                                            <React.Fragment key={item}>
                                                <Radio
                                                    label={item}
                                                    name="cancellation-reason"
                                                    variant="metallic"
                                                    checked={cancellationReason === item}
                                                    onChange={() => setCancellationReason(item)}
                                                />
                                                {item === 'Other' && cancellationReason === 'Other' && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="Type reason here"
                                                            value={cancellationOtherText}
                                                            onChange={(e) => setCancellationOtherText(e.target.value)}
                                                            size="lg"
                                                        />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && selectedMove === 'Add' && (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2 w-full">
                                        <label className="text-sm font-medium text-gray-400 ml-1">Order Type</label>
                                        <div className="space-y-4">
                                            <Radio
                                                label="Direct"
                                                name="order-type"
                                                variant="metallic"
                                                checked={orderType === 'Direct'}
                                                onChange={() => setOrderType('Direct')}
                                            />
                                            <Radio
                                                label="Converted"
                                                name="order-type"
                                                variant="metallic"
                                                checked={orderType === 'Converted'}
                                                onChange={() => setOrderType('Converted')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && selectedMove === 'Cancel' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project ID</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Input
                                            variant="metallic"
                                            placeholder="eg ARS 123456"
                                            value={cancelProjectId}
                                            onChange={(e) => setCancelProjectId(e.target.value)}
                                            size="lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && selectedMove === 'Remove' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project ID</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Input
                                            variant="metallic"
                                            placeholder="eg ARS 123456"
                                            value={removeProjectId}
                                            onChange={(e) => setRemoveProjectId(e.target.value)}
                                            size="lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && selectedMove === 'Add' && (
                                <div className="space-y-4">
                                    <Input
                                        variant="metallic"
                                        label="Price"
                                        type="text"
                                        placeholder="Type here"
                                        value={price}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                setPrice(val);
                                            }
                                        }}
                                        size="lg"
                                        leftIcon={<span className="text-gray-500">$</span>}
                                    />
                                </div>
                            )}

                            {currentStep === 4 && selectedMove === 'Add' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">And, What Have You Sold?</h3>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">MULTIPLE SELECTIONS ARE ALLOWED</p>
                                    </div>
                                    <div className="space-y-4">
                                        {['Logo', 'Social Media Kit', 'Stationery Designs', 'Other'].map((item) => (
                                            <React.Fragment key={item}>
                                                <Checkbox
                                                    label={item}
                                                    variant="metallic"
                                                    checked={soldItems.includes(item)}
                                                    onChange={() => toggleSoldItem(item)}
                                                />
                                                {item === 'Other' && soldItems.includes('Other') && (
                                                    <Input
                                                        variant="metallic"
                                                        placeholder="Type here"
                                                        value={otherSoldText}
                                                        onChange={(e) => setOtherSoldText(e.target.value)}
                                                        size="lg"
                                                    />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 5 && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Account</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Dropdown
                                            variant="metallic"
                                            placeholder="Select account"
                                            options={accountOptions}
                                            value={selectedAccount || ''}
                                            onChange={(val) => setSelectedAccount(val)}
                                            showSearch={true}
                                            searchPlaceholder="Search account prefix..."
                                            size="lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 6 && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Logo No</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-4">
                                            <Radio
                                                label="Auto Generate"
                                                name="logo-no-type"
                                                variant="metallic"
                                                checked={logoNoType === 'Auto Generate'}
                                                onChange={() => setLogoNoType('Auto Generate')}
                                            />
                                            <Radio
                                                label="Add Manually"
                                                name="logo-no-type"
                                                variant="metallic"
                                                checked={logoNoType === 'Add Manually'}
                                                onChange={() => setLogoNoType('Add Manually')}
                                            />
                                        </div>
                                        {logoNoType === 'Add Manually' && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                <Input
                                                    variant="metallic"
                                                    placeholder={`${currentPrefix} 876923`}
                                                    value={manualLogoNo}
                                                    onChange={(e) => setManualLogoNo(e.target.value)}
                                                    size="lg"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === 7 && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Client Type</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Radio
                                            label="New Client"
                                            name="client-type"
                                            variant="metallic"
                                            checked={clientType === 'new'}
                                            onChange={() => setClientType('new')}
                                        />
                                        <Radio
                                            label="Repeat Client"
                                            name="client-type"
                                            variant="metallic"
                                            checked={clientType === 'repeat'}
                                            onChange={() => setClientType('repeat')}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 8 && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                            {clientType === 'new' ? 'Client Name' : 'Previous Logo No'}
                                        </h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Input
                                            variant="metallic"
                                            placeholder="Type here"
                                            value={clientType === 'new' ? clientName : previousLogoNo}
                                            onChange={(e) => clientType === 'new' ? setClientName(e.target.value) : setPreviousLogoNo(e.target.value)}
                                            size="lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 9 && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Medium</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Radio
                                            label="Ranking"
                                            name="medium-type"
                                            variant="metallic"
                                            checked={medium === 'Ranking'}
                                            onChange={() => setMedium('Ranking')}
                                        />
                                        <Radio
                                            label="Promoted"
                                            name="medium-type"
                                            variant="metallic"
                                            checked={medium === 'Promoted'}
                                            onChange={() => setMedium('Promoted')}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 10 && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Title</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Input
                                            variant="metallic"
                                            placeholder="Type here"
                                            value={projectTitle}
                                            onChange={(e) => setProjectTitle(e.target.value)}
                                            size="lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 11 && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Brief</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <TextArea
                                            variant="metallic"
                                            placeholder="Type here"
                                            value={projectBriefText}
                                            onChange={(e) => setProjectBriefText(e.target.value)}
                                            onExpand={() => setIsBriefExpanded(true)}
                                            className="min-h-[140px]"
                                        />
                                        <div className="flex flex-col gap-2 mt-4">
                                            <label className="text-sm font-medium text-gray-400 ml-1">Upload Brief / References</label>
                                            <div
                                                onClick={() => !isUploading && fileInputRef.current?.click()}
                                                className={`w-full flex flex-col items-center justify-center rounded-2xl p-8 bg-white/[0.03] border border-white/10 relative overflow-hidden transition-all duration-300 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)] hover:bg-white/[0.06] hover:border-white/20 ${isUploading ? 'cursor-wait opacity-50' : 'cursor-pointer'} group`}
                                            >
                                                {/* Top Edge Highlight for Elevation */}
                                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                                {/* Diagonal Metallic Shine Overlay */}
                                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none opacity-40" />
                                                {/* Center-weighted Shadow Depth Falloff */}
                                                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.9)] opacity-70 pointer-events-none" />

                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    className="hidden"
                                                    multiple
                                                    onChange={handleFileSelect}
                                                />
                                                <div className="relative z-10 flex flex-col items-center">
                                                    <div className="p-4 rounded-full bg-white/[0.05] border border-white/10 text-gray-400 group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-all duration-300 mb-4 shadow-lg">
                                                        {isUploading ? (
                                                            <svg className="animate-spin h-6 w-6 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : (
                                                            <IconPlus size={24} />
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-bold text-white mb-1 uppercase tracking-wider">
                                                            {isUploading ? 'Uploading...' : 'Choose File'}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 font-medium">Up to 20 files, max 10MB each</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* File Previews Grid */}
                                            {projectBriefFiles.length > 0 && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6 animate-in fade-in duration-300">
                                                    {projectBriefFiles.map((file, index) => {
                                                        const isImage = file.type.startsWith('image/');
                                                        const extension = file.name.split('.').pop()?.toLowerCase();

                                                        const getIcon = () => {
                                                            let iconName = 'txt-icon.png'; // Default
                                                            const ext = extension || '';

                                                            if (['jpg', 'jpeg'].includes(ext)) iconName = 'jpg-icon.png';
                                                            else if (ext === 'png') iconName = 'png-icon.png';
                                                            else if (['doc', 'docx'].includes(ext)) iconName = 'doc-icon.png';
                                                            else if (ext === 'pdf') iconName = 'pdf-icon.png';
                                                            else if (ext === 'ai') iconName = 'ai-icon.png';
                                                            else if (ext === 'psd') iconName = 'psd-icon.png';
                                                            else if (['zip', 'rar', '7z'].includes(ext)) iconName = 'zip-icon.png';
                                                            else if (['mp4', 'mov', 'avi'].includes(ext)) iconName = 'avi-icon.png';
                                                            else if (ext === 'gif') iconName = 'gif-icon.png';
                                                            else if (['xls', 'xlsx', 'csv'].includes(ext)) iconName = 'xls-icon.png';
                                                            else if (['ppt', 'pptx'].includes(ext)) iconName = 'ppt-icon.png';
                                                            else if (ext === 'eps') iconName = 'eps-icon.png';
                                                            else if (['html', 'htm'].includes(ext)) iconName = 'html-icon.png';
                                                            else if (ext === 'mp3') iconName = 'mp3-icon.png';

                                                            return (
                                                                <img
                                                                    src={`/${iconName}`}
                                                                    alt={ext}
                                                                    className="w-10 h-10 object-contain opacity-90"
                                                                />
                                                            );
                                                        };

                                                        return (
                                                            <div
                                                                key={`${file.name}-${index}`}
                                                                className="group relative flex flex-col gap-2"
                                                            >
                                                                <div className="relative aspect-square rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden transition-all duration-300 group-hover:bg-white/[0.06] group-hover:border-white/20 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)] group-hover:shadow-xl group-hover:shadow-black/60">
                                                                    {/* Top Edge Highlight */}
                                                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-20" />
                                                                    {/* Diagonal Metallic Shine Overlay */}
                                                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none opacity-40 z-20" />

                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        {getIcon()}
                                                                    </div>

                                                                    {/* Delete Action - Top Right on Hover */}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                                                        className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-brand-error active:scale-95 z-30"
                                                                    >
                                                                        <IconX size={14} />
                                                                    </button>

                                                                    {/* Hover Overlay */}
                                                                    <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
                                                                </div>
                                                                <span className="text-[11px] font-medium text-gray-400 truncate px-1 text-center group-hover:text-white transition-colors">
                                                                    {file.name}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 12 && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Any Addons?</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {['Social Media Kit', 'Stationery Designs', 'None', 'Other'].map((item) => (
                                            <React.Fragment key={item}>
                                                <Checkbox
                                                    label={item}
                                                    variant="metallic"
                                                    checked={addons.includes(item)}
                                                    onChange={() => toggleAddon(item)}
                                                />
                                                {item === 'Other' && addons.includes('Other') && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="Type here"
                                                            value={addonsOther}
                                                            onChange={(e) => setAddonsOther(e.target.value)}
                                                            size="lg"
                                                        />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 13 && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Due Date</h3>
                                    </div>
                                    <div className="space-y-6">
                                        {/* Date Picker */}
                                        <DatePicker
                                            label="Due Date"
                                            variant="metallic"
                                            value={dueDate}
                                            onChange={(date) => setDueDate(date)}
                                            disabled={isReviewLoading}
                                        />

                                        {/* Time Selection */}
                                        <TimeSelect
                                            label="Time"
                                            variant="metallic"
                                            value={dueTime}
                                            onChange={(val) => setDueTime(val)}
                                            disabled={isReviewLoading}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 14 && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Assignee</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <Dropdown
                                            variant="metallic"
                                            label="Select Assignee"
                                            placeholder="Select Assignee"
                                            options={teamMembers
                                                .filter(m => m.role?.trim().toLowerCase() === 'freelancer')
                                                .map(m => ({ label: m.name, value: m.name }))
                                            }
                                            value={selectedAssignee || ''}
                                            onChange={(val) => setSelectedAssignee(val)}
                                            showSearch
                                            disabled={isReviewLoading}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {showReview && (
                        <div className="max-w-3xl mx-auto py-2 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
                            <div className="space-y-10">
                                {selectedMove === 'Remove' && (
                                    <div className="space-y-12">
                                        {/* REMOVE BRANCH REVIEW */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Action & Context</h4>
                                            <div className="space-y-6">
                                                <Dropdown
                                                    variant="metallic"
                                                    label="Action Move"
                                                    options={[
                                                        { label: 'Add', value: 'Add' },
                                                        { label: 'Remove', value: 'Remove' },
                                                        { label: 'Cancel', value: 'Cancel' },
                                                        { label: 'Approve', value: 'Approve' }
                                                    ]}
                                                    value={selectedMove || ''}
                                                    onChange={setSelectedMove}
                                                />
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Removal Reason</label>
                                                    <div className="space-y-3">
                                                        {['Editing Required', 'Haram', 'Other'].map((item) => (
                                                            <React.Fragment key={item}>
                                                                <Radio
                                                                    variant="metallic"
                                                                    label={item}
                                                                    name="review-removal-reason"
                                                                    checked={removalReason === item}
                                                                    onChange={() => setRemovalReason(item)}
                                                                    className="text-[12px]"
                                                                />
                                                                {item === 'Other' && removalReason === 'Other' && (
                                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 ml-4 border-l-2 border-brand-primary/20 pl-4">
                                                                        <Input
                                                                            variant="metallic"
                                                                            placeholder="Type reason here"
                                                                            value={removalOtherText}
                                                                            onChange={(e) => setRemovalOtherText(e.target.value)}
                                                                            size="lg"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                                <Input
                                                    variant="metallic"
                                                    label="Project ID"
                                                    value={removeProjectId}
                                                    onChange={(e) => setRemoveProjectId(e.target.value)}
                                                    placeholder="eg ARS 123456"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedMove === 'Add' && (
                                    <div className="space-y-10">
                                        {/* GROUP 1 — MOVE & ORDER */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Move & Order</h4>
                                            <div className="space-y-6">
                                                <Dropdown
                                                    variant="metallic"
                                                    label="Action Move"
                                                    options={[
                                                        { label: 'Add', value: 'Add' },
                                                        { label: 'Remove', value: 'Remove' },
                                                        { label: 'Cancel', value: 'Cancel' },
                                                        { label: 'Approve', value: 'Approve' }
                                                    ]}
                                                    value={selectedMove || ''}
                                                    onChange={setSelectedMove}
                                                />
                                                <Dropdown
                                                    variant="metallic"
                                                    label="Order Type"
                                                    options={[
                                                        { label: 'Direct', value: 'Direct' },
                                                        { label: 'Converted', value: 'Converted' }
                                                    ]}
                                                    value={orderType || ''}
                                                    onChange={setOrderType}
                                                />
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        {/* GROUP 2 — PRICE & ITEMS */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Price & Items</h4>
                                            <div className="space-y-8">
                                                <Input
                                                    variant="metallic"
                                                    label="Budget / Price"
                                                    placeholder="eg 100"
                                                    value={price}
                                                    onChange={(e) => setPrice(e.target.value)}
                                                    leftIcon={<span className="text-gray-500">$</span>}
                                                />

                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Items Sold</label>
                                                    <div className="flex flex-col gap-3">
                                                        {['Logo', 'Social Media Kit', 'Stationery Designs', 'Other'].map(item => (
                                                            <Checkbox
                                                                key={item}
                                                                variant="metallic"
                                                                label={item}
                                                                checked={soldItems.includes(item)}
                                                                onChange={() => toggleSoldItem(item)}
                                                                className="text-[12px]"
                                                            />
                                                        ))}
                                                    </div>
                                                    {soldItems.includes('Other') && (
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="Specify other items..."
                                                            value={otherSoldText}
                                                            onChange={e => setOtherSoldText(e.target.value)}
                                                        />
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <Dropdown
                                                        variant="metallic"
                                                        label="Account Name"
                                                        options={accountOptions}
                                                        value={selectedAccount || ''}
                                                        onChange={setSelectedAccount}
                                                        showSearch
                                                    />
                                                    {!selectedAccount && (
                                                        <p className="text-[10px] font-medium text-brand-error animate-in fade-in slide-in-from-top-1">
                                                            Account is required to calculate fees
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        {/* GROUP 3 — PROJECT IDENTITY */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Project Identity</h4>
                                            <div className="space-y-8">
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Logo Number Type</label>
                                                    <div className="flex flex-col gap-3">
                                                        {['Auto Generate', 'Add Manually'].map(type => (
                                                            <Radio
                                                                key={type}
                                                                variant="metallic"
                                                                label={type}
                                                                name="logo-type-review"
                                                                checked={logoNoType === type}
                                                                onChange={() => setLogoNoType(type)}
                                                                className="text-[12px]"
                                                            />
                                                        ))}
                                                    </div>
                                                    {logoNoType === 'Add Manually' && (
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="eg ARS 123456"
                                                            value={manualLogoNo}
                                                            onChange={(e) => setManualLogoNo(e.target.value)}
                                                        />
                                                    )}
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Client Type</label>
                                                    <div className="flex flex-col gap-3">
                                                        {[
                                                            { label: 'New Client', value: 'new' },
                                                            { label: 'Repeat Client', value: 'repeat' }
                                                        ].map(type => (
                                                            <Radio
                                                                key={type.value}
                                                                variant="metallic"
                                                                label={type.label}
                                                                name="client-type-review"
                                                                checked={clientType === type.value}
                                                                onChange={() => setClientType(type.value as 'new' | 'repeat')}
                                                                className="text-[12px]"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {clientType === 'new' ? (
                                                    <Input
                                                        variant="metallic"
                                                        label="Client Name"
                                                        placeholder="Enter name"
                                                        value={clientName}
                                                        onChange={(e) => setClientName(e.target.value)}
                                                    />
                                                ) : (
                                                    <Input
                                                        variant="metallic"
                                                        label="Previous Logo No"
                                                        placeholder="eg ARS 123456"
                                                        value={previousLogoNo}
                                                        onChange={(e) => setPreviousLogoNo(e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        {/* GROUP 4 — ITEMS & MEDIUM */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Items & Medium</h4>
                                            <div className="space-y-8">
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Medium</label>
                                                    <div className="flex flex-col gap-3">
                                                        {['Ranking', 'Promoted'].map(type => (
                                                            <Radio
                                                                key={type}
                                                                variant="metallic"
                                                                label={type}
                                                                name="medium-review"
                                                                checked={medium === type}
                                                                onChange={() => setMedium(type)}
                                                                className="text-[12px]"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                <Input
                                                    variant="metallic"
                                                    label="Project Title"
                                                    placeholder="eg Modern Minimal Logo"
                                                    value={projectTitle}
                                                    onChange={(e) => setProjectTitle(e.target.value)}
                                                />

                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Project Brief</label>
                                                    <TextArea
                                                        variant="metallic"
                                                        placeholder="Describe the project..."
                                                        value={projectBriefText}
                                                        onChange={(e) => setProjectBriefText(e.target.value)}
                                                        rows={4}
                                                        onExpand={() => setIsBriefExpanded(true)}
                                                    />

                                                    {/* Attachments Preview in Review */}
                                                    {projectBriefFiles.length > 0 && (
                                                        <div className="space-y-3 mt-6">
                                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">References</label>
                                                            <div className="flex flex-wrap gap-3">
                                                                {projectBriefFiles.map((file, index) => {
                                                                    const extension = file.name.split('.').pop()?.toLowerCase();
                                                                    const getIcon = () => {
                                                                        let iconName = 'txt-icon.png';
                                                                        const ext = extension || '';
                                                                        if (['jpg', 'jpeg'].includes(ext)) iconName = 'jpg-icon.png';
                                                                        else if (ext === 'png') iconName = 'png-icon.png';
                                                                        else if (['doc', 'docx'].includes(ext)) iconName = 'doc-icon.png';
                                                                        else if (ext === 'pdf') iconName = 'pdf-icon.png';
                                                                        else if (ext === 'ai') iconName = 'ai-icon.png';
                                                                        else if (ext === 'psd') iconName = 'psd-icon.png';
                                                                        else if (['zip', 'rar', '7z'].includes(ext)) iconName = 'zip-icon.png';
                                                                        else if (['mp4', 'mov', 'avi'].includes(ext)) iconName = 'avi-icon.png';
                                                                        else if (ext === 'gif') iconName = 'gif-icon.png';
                                                                        else if (['xls', 'xlsx', 'csv'].includes(ext)) iconName = 'xls-icon.png';
                                                                        else if (['ppt', 'pptx'].includes(ext)) iconName = 'ppt-icon.png';
                                                                        else if (ext === 'eps') iconName = 'eps-icon.png';
                                                                        return `/${iconName}`;
                                                                    };

                                                                    return (
                                                                        <div key={index} className="group relative">
                                                                            <div className="w-12 h-12 rounded-xl border border-surface-border bg-surface-overlay flex items-center justify-center overflow-hidden transition-all duration-300 hover:border-brand-primary/30 shadow-lg">
                                                                                <img src={getIcon()} alt={extension} className="w-7 h-7 object-contain" />
                                                                            </div>
                                                                            <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => setProjectBriefFiles(prev => prev.filter((_, i) => i !== index))}
                                                                                    className="bg-surface-card border border-surface-border text-gray-400 hover:text-brand-error p-0.5 rounded-full shadow-xl"
                                                                                >
                                                                                    <IconX size={10} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        {/* GROUP 5 — TIMELINE & ADDONS */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Timeline & Addons</h4>
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <DatePicker
                                                        label="Due Date"
                                                        variant="metallic"
                                                        value={dueDate}
                                                        onChange={(date) => setDueDate(date)}
                                                    />
                                                    <TimeSelect
                                                        label="Due Time"
                                                        variant="metallic"
                                                        value={dueTime}
                                                        onChange={setDueTime}
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Addons</label>
                                                    <div className="flex flex-col gap-3">
                                                        {['Social Media Kit', 'Stationery Designs', 'None', 'Other'].map(item => (
                                                            <Checkbox
                                                                key={item}
                                                                label={item}
                                                                variant="metallic"
                                                                checked={addons.includes(item)}
                                                                onChange={() => toggleAddon(item)}
                                                            />
                                                        ))}
                                                    </div>
                                                    {addons.includes('Other') && (
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="Specify other addons..."
                                                            value={addonsOther}
                                                            onChange={e => setAddonsOther(e.target.value)}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        {/* GROUP 6 — ASSIGNEE */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Assignee</h4>
                                            <Dropdown
                                                variant="metallic"
                                                label="Assignee"
                                                options={teamMembers
                                                    .filter(m => m.role?.trim().toLowerCase() === 'freelancer')
                                                    .map(m => ({ label: m.name, value: m.name }))
                                                }
                                                value={selectedAssignee || ''}
                                                onChange={setSelectedAssignee}
                                                showSearch
                                            />
                                        </div>
                                    </div>
                                )}

                                {selectedMove === 'Cancel' && (
                                    <div className="space-y-10">
                                        {/* CANCEL BRANCH REVIEW */}

                                        {/* GROUP 1: ACTION & CONTEXT */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Action & Context</h4>
                                            <div className="space-y-6">
                                                <Dropdown
                                                    variant="metallic"
                                                    label="Action Move"
                                                    options={[
                                                        { label: 'Add', value: 'Add' },
                                                        { label: 'Remove', value: 'Remove' },
                                                        { label: 'Cancel', value: 'Cancel' },
                                                        { label: 'Approve', value: 'Approve' }
                                                    ]}
                                                    value={selectedMove || ''}
                                                    onChange={setSelectedMove}
                                                />
                                                <div className="bg-white/[0.03] border border-surface-border rounded-2xl p-6 text-center">
                                                    <p className="text-gray-400 text-sm leading-relaxed">
                                                        You are confirming an <span className="text-white font-bold">{selectedMove}</span> action.
                                                        Please review the selection below before submitting.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        {/* GROUP 2: CANCELLATION REASON */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Cancellation Reason</h4>
                                            <div className="space-y-3">
                                                {['Client Was Unclear', 'Designs Were Not Good Enough', 'Client Not Satisfied', 'Other'].map((item) => (
                                                    <React.Fragment key={item}>
                                                        <Radio
                                                            variant="metallic"
                                                            label={item}
                                                            name="review-cancellation-reason"
                                                            checked={cancellationReason === item}
                                                            onChange={() => { }}
                                                            disabled={true}
                                                            className="text-[12px]"
                                                        />
                                                        {item === 'Other' && cancellationReason === 'Other' && (
                                                            <div className="animate-in fade-in slide-in-from-top-2 duration-200 ml-4 border-l-2 border-brand-primary/20 pl-4">
                                                                <Input
                                                                    variant="metallic"
                                                                    placeholder="Type reason here"
                                                                    value={cancellationOtherText}
                                                                    onChange={() => { }}
                                                                    disabled={true}
                                                                    size="lg"
                                                                    className="opacity-100 text-white"
                                                                />
                                                            </div>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        {/* GROUP 3: PROJECT IDENTIFICATION */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Project Identification</h4>
                                            <div className="space-y-6">
                                                <Input
                                                    variant="metallic"
                                                    label="Project ID"
                                                    value={cancelProjectId}
                                                    onChange={(e) => setCancelProjectId(e.target.value)}
                                                    placeholder="eg ARS 123456"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedMove === 'Approve' && (
                                    <div className="space-y-10">
                                        {/* APPROVE BRANCH REVIEW */}

                                        {/* GROUP 1: ACTION & CONTEXT */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Action & Context</h4>
                                            <div className="space-y-6">
                                                <Dropdown
                                                    variant="metallic"
                                                    label="Action Move"
                                                    options={[
                                                        { label: 'Add', value: 'Add' },
                                                        { label: 'Remove', value: 'Remove' },
                                                        { label: 'Cancel', value: 'Cancel' },
                                                        { label: 'Approve', value: 'Approve' }
                                                    ]}
                                                    value={selectedMove || ''}
                                                    onChange={setSelectedMove}
                                                />

                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Any Tips?</label>
                                                    <div className="flex flex-col gap-3">
                                                        <Radio
                                                            label="Yes"
                                                            name="review-approve-tips"
                                                            variant="metallic"
                                                            checked={approveTips === 'Yes'}
                                                            onChange={() => { }}
                                                            disabled={true}
                                                        />
                                                        <Radio
                                                            label="No"
                                                            name="review-approve-tips"
                                                            variant="metallic"
                                                            checked={approveTips === 'No'}
                                                            onChange={() => { }}
                                                            disabled={true}
                                                        />
                                                    </div>
                                                </div>

                                                {approveTips === 'Yes' && (
                                                    <Input
                                                        variant="metallic"
                                                        label="Tip Amount"
                                                        value={approveAmount}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                setApproveAmount(val);
                                                            }
                                                        }}
                                                        leftIcon={<span className="text-gray-500">$</span>}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        {/* GROUP 2: PROJECT IDENTIFICATION */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Project Identification</h4>
                                            <div className="space-y-6">
                                                <Input
                                                    variant="metallic"
                                                    label="Project ID"
                                                    value={approveProjectId}
                                                    onChange={(e) => setApproveProjectId(e.target.value)}
                                                    placeholder="eg ARS 123456"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Expanded Project Brief Modal */}
            <Modal
                isOpen={isBriefExpanded}
                onClose={() => setIsBriefExpanded(false)}
                title="Project Brief"
                size="lg"
                footer={(
                    <div className="flex justify-end">
                        <Button variant="metallic" onClick={() => setIsBriefExpanded(false)}>
                            Done
                        </Button>
                    </div>
                )}
            >
                <div className="h-full min-h-[400px]">
                    <TextArea
                        variant="metallic"
                        placeholder="Type here"
                        value={projectBriefText}
                        onChange={(e) => setProjectBriefText(e.target.value)}
                        className="h-full"
                        rows={15}
                        autoFocus
                    />
                </div>
            </Modal>
        </div>
    );
});

export default Projects;

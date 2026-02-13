import React, { useState, useEffect } from 'react';
import { Card } from '../components/Surfaces';
import { Table } from '../components/Table';
import { Avatar } from '../components/Avatar';
import Button from '../components/Button';
import { DatePicker } from '../components/DatePicker';
import { Dropdown } from '../components/Dropdown';
import {
    IconDollar,
    IconClock,
    IconCheckCircle,
    IconTrendingUp,
    IconBriefcase,
    IconFilter,
    IconDownload
} from '../components/Icons';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useAccounts } from '../contexts/AccountContext';

// Date Helpers (Native JS to avoid external dep dependency)
const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const differenceInDays = (dateLeft: Date, dateRight: Date) => {
    // Normalize to start of day for cleaner calculation
    const left = new Date(dateLeft); left.setHours(0, 0, 0, 0);
    const right = new Date(dateRight); right.setHours(0, 0, 0, 0);

    // Difference in milliseconds
    const diffTime = left.getTime() - right.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const startOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const Earnings: React.FC = () => {
    const { profile, loading: userLoading } = useUser();
    const [loading, setLoading] = useState(true);
    const [allProjects, setAllProjects] = useState<any[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<any[]>([]);

    // Filter States
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const { accounts } = useAccounts();

    // Freelancer Selection State
    const [freelancers, setFreelancers] = useState<any[]>([]);
    const [selectedFreelancer, setSelectedFreelancer] = useState<string>('');
    const [debugInfo, setDebugInfo] = useState<string>('Initializing debug info...');

    const [stats, setStats] = useState({
        lifetimeEarnings: 0,
        currentMonthEarnings: 0,
        pendingClearance: 0,
        availableAmount: 0
    });

    useEffect(() => {
        console.log('Earnings: useEffect triggered.', { profile, userLoading });

        if (userLoading) {
            setDebugInfo(prev => prev + '\nWaiting for user context to load...');
            return;
        }

        if (profile) {
            setDebugInfo(prev => prev + '\nProfile loaded. Fetching data...');
            fetchInitialData();
        } else {
            console.warn('Earnings: No profile found after loading.');
            setDebugInfo(prev => prev + '\nNo profile found in context.');
        }
    }, [profile, userLoading]);

    // Fetch projects when selected freelancer changes
    useEffect(() => {
        if (selectedFreelancer) {
            fetchProjectsForFreelancer(selectedFreelancer);
        }
    }, [selectedFreelancer]);

    // Re-filter when dependencies change
    useEffect(() => {
        applyFilters();
    }, [allProjects, dateFrom, dateTo, selectedAccount]);

    const fetchInitialData = async () => {
        setLoading(true);
        let logs = `User Context ID: ${profile?.id}\n`;
        try {
            // 1. Accounts are now provided by AccountContext

            // 2. Fetch Freelancers for dropdown
            logs += 'Fetching all profiles from Supabase...\n';
            const { data: allProfiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('name');

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
                logs += `Error: ${JSON.stringify(profilesError)}\n`;
            } else {
                logs += `Success. Total Profiles: ${allProfiles?.length || 0}\n`;
                if (allProfiles && allProfiles.length > 0) {
                    logs += `First Profile Example: ${JSON.stringify(allProfiles[0])}\n`;
                }
            }

            let opts: any[] = [];

            if (allProfiles) {
                // Filter for freelancers in memory
                let freelancerList = allProfiles.filter(p =>
                    p.role && p.role.toLowerCase().includes('freelancer')
                );

                logs += `filtered 'freelancer' count: ${freelancerList.length}\n`;

                if (freelancerList.length === 0) {
                    logs += 'No freelancers found in filtered list. Falling back to ALL profiles.\n';
                    freelancerList = allProfiles;
                }

                opts = freelancerList.map(f => ({
                    label: f.name || f.email || 'Unknown User',
                    value: f.email
                }));
            }

            // FINAL FALLBACK: If standard fetch failed or returned 0 rows (empty table/RLS block), 
            // use the current logged-in user from context.
            if (opts.length === 0 && profile) {
                logs += 'List empty (likely empty table or RLS). Forcing current user from context.\n';
                opts.push({
                    label: profile.name || profile.email || 'Current User',
                    value: profile.email
                });
            }

            setFreelancers(opts);
            setDebugInfo(logs);

            // Default Selection Logic
            if (opts.length > 0) {
                const isMeInList = opts.some(f => f.value === profile?.email);

                if (isMeInList && profile?.email) {
                    setSelectedFreelancer(profile.email);
                } else {
                    setSelectedFreelancer(opts[0].value);
                }
            } else if (profile?.email) {
                setSelectedFreelancer(profile.email);
            }

        } catch (error: any) {
            console.error('Error fetching initial data:', error);
            logs += `Exception: ${error.message}\n`;
            setDebugInfo(logs);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectsForFreelancer = async (email: string) => {
        setLoading(true);
        try {
            const { data: projects, error } = await supabase
                .from('projects')
                .select('*')
                .eq('assignee', email)
                .neq('status', 'Removed')
                .neq('status', 'Cancelled')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (projects) {
                setAllProjects(projects);
            } else {
                setAllProjects([]);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            setAllProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...allProjects];

        // 1. Date Range Filter
        if (dateFrom || dateTo) {
            filtered = filtered.filter(p => {
                const pDate = new Date(p.created_at);
                pDate.setHours(0, 0, 0, 0); // Normalize project date for comparison

                if (dateFrom) {
                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                    if (pDate < from) return false;
                }
                if (dateTo) {
                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                    if (pDate > to) return false;
                }
                return true;
            });
        }

        // 2. Account Filter
        if (selectedAccount !== 'all') {
            filtered = filtered.filter(p => p.account_id === selectedAccount);
        }

        setFilteredProjects(filtered);
        calculateStats(filtered);
    };

    const calculateStats = (projects: any[]) => {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);

        let lifetime = 0;
        let month = 0;
        let pending = 0;
        let available = 0;

        projects.forEach(p => {
            const fee = Number(p.designer_fee || 0);

            // For "Earnings" we usually count Completed/Delivered work
            const isCompleted = p.status === 'Completed' || p.status === 'Delivered';

            if (isCompleted) {
                lifetime += fee;

                const pDate = new Date(p.updated_at || p.created_at);
                if (pDate >= startOfCurrentMonth) {
                    month += fee;
                }

                // Clearance Logic (Assuming 14 days)
                const clearanceDate = addDays(pDate, 14);
                if (now < clearanceDate) {
                    pending += fee;
                } else {
                    available += fee;
                }
            }
        });

        setStats({
            lifetimeEarnings: lifetime,
            currentMonthEarnings: month,
            pendingClearance: pending,
            availableAmount: available
        });
    };

    const handleQuickFilter = (type: 'today' | 'week' | 'month') => {
        const now = new Date();
        setDateTo(now);

        if (type === 'today') {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            setDateFrom(start);
        } else if (type === 'week') {
            setDateFrom(startOfWeek(now));
        } else if (type === 'month') {
            setDateFrom(startOfMonth(now));
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const getFundsStatus = (project: any) => {
        if (project.status === 'Completed' || project.status === 'Delivered') {
            const pDate = new Date(project.updated_at || project.created_at);
            const clearanceDate = addDays(pDate, 14);
            const now = new Date();
            if (now < clearanceDate) return 'Pending Clearance';
            return 'Available';
        }
        return project.status; // 'In Progress', etc.
    };

    const getDaysLeft = (project: any) => {
        if (project.status === 'Completed' || project.status === 'Delivered') {
            const pDate = new Date(project.updated_at || project.created_at);
            const clearanceDate = addDays(pDate, 14);
            const now = new Date();
            const diff = differenceInDays(clearanceDate, now);
            return diff > 0 ? `${diff} days` : '-';
        }
        return '-';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">Freelancer Earnings</h1>
                <div className="w-48">
                    <Dropdown
                        value={selectedFreelancer}
                        onChange={setSelectedFreelancer}
                        options={freelancers}
                        placeholder="Select Freelancer"
                        className="bg-surface-card"
                    />
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="p-4 border border-white/10 bg-surface-card/50 backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">

                    {/* Left Filters */}
                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-2 text-brand-primary">
                            <IconFilter className="w-5 h-5" />
                            <span className="font-bold text-sm">Filters</span>
                        </div>

                        <div className="h-6 w-px bg-white/10 hidden sm:block" />

                        <div className="flex items-center gap-2">
                            <div className="w-32">
                                <DatePicker
                                    value={dateFrom}
                                    onChange={setDateFrom}
                                    placeholder="From"
                                    inputProps={{ className: "!h-9 text-xs" }}
                                />
                            </div>
                            <span className="text-gray-500">-</span>
                            <div className="w-32">
                                <DatePicker
                                    value={dateTo}
                                    onChange={setDateTo}
                                    placeholder="To"
                                    inputProps={{ className: "!h-9 text-xs" }}
                                />
                            </div>
                        </div>

                        <div className="w-40">
                            <Dropdown
                                value={selectedAccount}
                                onChange={setSelectedAccount}
                                options={[{ label: 'All Accounts', value: 'all' }, ...accounts.map(a => ({ label: a.name, value: a.id }))]}
                                placeholder="All Accounts"
                                className="!h-9 text-xs"
                            />
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleQuickFilter('today')} className="!text-xs !h-9">Today</Button>
                        <Button variant="outline" size="sm" onClick={() => handleQuickFilter('week')} className="!text-xs !h-9">This Week</Button>
                        <Button variant="outline" size="sm" onClick={() => handleQuickFilter('month')} className="!text-xs !h-9">This Month</Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<IconDownload className="w-4 h-4" />}
                            className="!text-xs !h-9 ml-2"
                            onClick={() => {/* CSV Export Logic Placeholder */ }}
                        >
                            CSV
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Lifetime Earnings */}
                <Card className="p-5 border border-white/10 bg-surface-card relative overflow-hidden group hover:border-brand-primary/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lifetime Earnings</p>
                            <h3 className="text-2xl font-bold text-brand-success">{formatCurrency(stats.lifetimeEarnings)}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-brand-success/10 text-brand-success">
                            <IconDollar className="w-5 h-5" />
                        </div>
                    </div>
                </Card>

                {/* Current Month */}
                <Card className="p-5 border border-white/10 bg-surface-card relative overflow-hidden group hover:border-brand-primary/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Current Month</p>
                            <h3 className="text-2xl font-bold text-brand-success">{formatCurrency(stats.currentMonthEarnings)}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <IconTrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                </Card>

                {/* Pending Clearance */}
                <Card className="p-5 border border-white/10 bg-surface-card relative overflow-hidden group hover:border-brand-primary/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pending Clearance</p>
                            <h3 className="text-2xl font-bold text-brand-warning">{formatCurrency(stats.pendingClearance)}</h3>
                            <p className="text-[10px] text-gray-500 mt-1">Approved, awaiting clearance</p>
                        </div>
                        <div className="p-2 rounded-lg bg-brand-warning/10 text-brand-warning">
                            <IconClock className="w-5 h-5" />
                        </div>
                    </div>
                </Card>

                {/* Available Amount */}
                <Card className="p-5 border border-white/10 bg-surface-card relative overflow-hidden group hover:border-brand-primary/50 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Available Amount</p>
                            <h3 className="text-2xl font-bold text-brand-success">{formatCurrency(stats.availableAmount)}</h3>
                            <p className="text-[10px] text-gray-500 mt-1">Ready for payout</p>
                        </div>
                        <div className="p-2 rounded-lg bg-brand-success/10 text-brand-success">
                            <IconCheckCircle className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Projects Table */}
            <Card className="border border-white/10 bg-surface-card overflow-hidden">
                <div className="p-4 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white">Projects</h3>
                    <p className="text-sm text-gray-500">{filteredProjects.length} projects found</p>
                </div>
                <Table
                    isLoading={loading}
                    data={filteredProjects}
                    columns={[
                        {
                            header: 'Date',
                            key: 'created_at',
                            render: (item: any) => (
                                <span className="text-sm text-gray-300">
                                    {formatDate(new Date(item.created_at))}
                                </span>
                            )
                        },
                        {
                            header: 'Project ID',
                            key: 'project_id',
                            render: (item: any) => (
                                <span className="text-sm font-mono text-brand-primary font-bold">
                                    {item.project_id}
                                </span>
                            )
                        },
                        {
                            header: 'Funds Status',
                            key: 'status',
                            render: (item: any) => {
                                const status = getFundsStatus(item);
                                const isPending = status === 'Pending Clearance';
                                const isAvailable = status === 'Available';
                                return (
                                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${isPending ? 'bg-brand-warning/10 text-brand-warning' :
                                        isAvailable ? 'bg-brand-success/10 text-brand-success' :
                                            'bg-white/5 text-gray-400'
                                        }`}>
                                        {status}
                                    </span>
                                )
                            }
                        },
                        {
                            header: 'Days Left',
                            key: 'id',
                            render: (item: any) => (
                                <span className="text-sm text-gray-400 md:pl-4">
                                    {getDaysLeft(item)}
                                </span>
                            )
                        },
                        {
                            header: 'Payout',
                            key: 'designer_fee',
                            className: 'text-right',
                            render: (item: any) => (
                                <span className="text-sm font-bold text-white">
                                    {formatCurrency(item.designer_fee || 0)}
                                </span>
                            )
                        },
                        {
                            header: 'Tips',
                            key: 'tip_amount',
                            className: 'text-right',
                            render: (item: any) => (
                                <span className={`text-sm font-bold ${item.tip_amount ? 'text-brand-success' : 'text-gray-600'}`}>
                                    {item.tip_amount ? formatCurrency(item.tip_amount) : '-'}
                                </span>
                            )
                        }
                    ]}
                />
            </Card>

            {/* DEBUG SECTION */}
            <div className="p-4 mt-8 bg-black/50 border border-white/10 rounded-xl text-xs font-mono text-green-400 whitespace-pre-wrap">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-white underline">DEBUG INFO</h4>
                    <Button size="sm" variant="outline" onClick={() => fetchInitialData()} className="!h-6 !text-[10px]">
                        Force Reload
                    </Button>
                </div>
                {debugInfo}
            </div>
        </div>
    );
};

export default Earnings;

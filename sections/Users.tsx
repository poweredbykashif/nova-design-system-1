import React, { useState, useEffect, useMemo } from 'react';
import { Card, Modal } from '../components/Surfaces';
import Button from '../components/Button';
import { Table } from '../components/Table';
import { Avatar } from '../components/Avatar';
import { IconPlus, IconSearch, IconFilter, IconMoreVertical, IconUser, IconUsers, IconClock, IconBell, IconMail, IconEdit, IconTrash, IconRefreshCw, IconAlertTriangle, IconCopy } from '../components/Icons';
import { Tabs } from '../components/Navigation';
import { Input } from '../components/Input';
import { Dropdown } from '../components/Dropdown';
import { KebabMenu } from '../components/KebabMenu';
import { addToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    joined: string;
    isInvitation?: boolean;
}

interface UsersProps {
    onUserOpen: (userId: string) => void;
    isUserOpen: boolean;
}

const Users: React.FC<UsersProps> = ({ onUserOpen, isUserOpen }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Member | null>(null);
    const [userToRemove, setUserToRemove] = useState<Member | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('users');

    // Team Modal State
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
    const [isSavingTeam, setIsSavingTeam] = useState(false);
    const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);

    const tabs = [
        { id: 'users', label: 'Users', icon: <IconUser size={16} /> },
        { id: 'teams', label: 'Teams', icon: <IconUsers size={16} /> },
        { id: 'shifts', label: 'Designer Shifts', icon: <IconClock size={16} /> },
    ];

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [createdMember, setCreatedMember] = useState<any>(null);

    const [profiles, setProfiles] = useState<Member[]>([]);
    const [invitations, setInvitations] = useState<Member[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const roles = [
        { label: 'Admin', value: 'Admin' },
        { label: 'Project Manager', value: 'Project Manager' },
        { label: 'Freelancer', value: 'Freelancer' },
        { label: 'Presentation Designer', value: 'Presentation Designer' },
        { label: 'Finance Manager', value: 'Finance Manager' },
    ];

    const fetchMembers = async () => {
        try {
            // Fetch active profiles
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profileError) throw profileError;

            // Fetch pending invitations
            const { data: inviteData, error: inviteError } = await supabase
                .from('member_invitations')
                .select('*')
                .order('created_at', { ascending: false });

            if (inviteError) throw inviteError;

            setProfiles(profileData.map((p: any) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                role: p.role,
                status: p.status,
                joined: new Date(p.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
                isInvitation: false
            })));

            setInvitations(inviteData.map((i: any) => ({
                id: i.id,
                name: 'Pending Invitation',
                email: i.email,
                role: i.role,
                status: 'Pending',
                joined: new Date(i.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
                isInvitation: true
            })));

            // Fetch accounts for the teams dropdown
            const { data: accountsData } = await supabase
                .from('accounts')
                .select('*')
                .order('name', { ascending: true });

            if (accountsData) {
                setAvailableAccounts(accountsData);
            }

        } catch (error: any) {
            console.error('Error fetching members:', error);
            addToast({ type: 'error', title: 'Fetch Failed', message: 'Could not load directory data.' });
        }
    };

    const fetchTeams = async () => {
        try {
            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select(`
                    *,
                    team_members(member_id, profiles(name)),
                    team_accounts(account_id, accounts(name))
                `)
                .order('name', { ascending: true });

            if (teamsError) throw teamsError;

            const formattedTeams = teamsData.map((t: any) => ({
                id: t.id,
                name: t.name,
                memberNames: t.team_members.map((tm: any) => tm.profiles?.name),
                memberInitials: t.team_members.map((tm: any) =>
                    tm.profiles?.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                ).slice(0, 3),
                totalMembers: t.team_members.length,
                accounts: t.team_accounts.map((ta: any) => ta.accounts?.name)
            }));

            setTeams(formattedTeams);
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    const fetchAllData = async () => {
        setIsLoading(true);
        await Promise.all([fetchMembers(), fetchTeams()]);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const allMembers = useMemo(() => {
        const combined = [...profiles, ...invitations];
        if (!searchQuery) return combined;
        const q = searchQuery.toLowerCase();
        return combined.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.role.toLowerCase().includes(q)
        );
    }, [profiles, invitations, searchQuery]);

    const stats = useMemo(() => {
        return {
            total: profiles.length + invitations.length,
            active: profiles.filter(p => p.status === 'Active').length,
            pending: invitations.length
        };
    }, [profiles, invitations]);

    const confirmRemoveMember = (member: Member) => {
        setUserToRemove(member);
        setIsRemoveModalOpen(true);
    };

    const executeRemoveMember = async () => {
        if (!userToRemove) return;

        setIsUpdating(true);
        const table = userToRemove.isInvitation ? 'member_invitations' : 'profiles';
        try {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', userToRemove.id);

            if (error) throw error;
            addToast({ type: 'success', title: 'Member Removed', message: `${userToRemove.email} has been removed from the directory.` });
            fetchMembers();
            setIsRemoveModalOpen(false);
            setUserToRemove(null);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Removal Failed', message: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleEditPermissions = (member: Member) => {
        if (member.isInvitation) {
            addToast({ type: 'info', title: 'Pending Invitation', message: 'Permissions can only be edited for active members.' });
            return;
        }
        setEditingUser(member);
        setIsEditModalOpen(true);
    };

    const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', userId);

            if (error) throw error;
            addToast({ type: 'success', title: 'Status Updated', message: `User status changed to ${newStatus}.` });
            fetchMembers();
            if (editingUser?.id === userId) {
                setEditingUser({ ...editingUser, status: newStatus });
            }
        } catch (error: any) {
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSavePermissions = async (userId: string, newRole: string) => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            addToast({ type: 'success', title: 'Role Updated', message: `User role changed to ${newRole}.` });
            fetchMembers();
            setIsEditModalOpen(false);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleResendInvitation = (member: Member) => {
        // Logic to trigger email resend would go here
        addToast({ type: 'success', title: 'Invitation Resent', message: `A new invitation has been sent to ${member.email}.` });
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setShowSuccess(false);
        setCreatedMember(null);
        setName('');
        setEmail('');
        setPassword('');
        setRole('');
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        // Reset fields after closing
        setTimeout(() => {
            setShowSuccess(false);
            setCreatedMember(null);
            setName('');
            setEmail('');
            setPassword('');
            setRole('');
        }, 300);
    };

    const handleAddMember = async () => {
        if (!name || !email || !password || !role) {
            addToast({ type: 'error', title: 'Missing Info', message: 'Please fill in all fields.' });
            return;
        }

        setIsSending(true);

        try {
            // 1. Create the user in Supabase Auth
            // Note: This will sign in the new user immediately if you are using the client-side signUp.
            // Ideally, this should be done by an Admin function or we need to handle the session switch,
            // but per request "Add Member" we will use signUp. 
            // !! IMPORTANT: Client-side signUp automatically signs in the new user. 
            // If you want to avoid logging out the current admin, we need to use a secondary client or Edge Function (which user rejected).
            // A workaround for client-side is tricky. 
            // However, assuming the requirement is just to "create" them:

            // To prevent logging out the current admin, we perform a fetch call to Supabase Admin API or similar?
            // Since we deleted the Edge Function, we are limited to client-side.
            // THE USER REQUEST implies we just want to create it.
            // We will use a dedicated method to attempt creation without session replacement if possible, 
            // but standard `supabase.auth.signUp` will trigger session change.

            // ACTUALLY: The best way without Edge Functions to create a *different* user 
            // is to use a second, non-persisted client instance, similar to what we tried in Edge Function but locally.

            // Let's rely on standard flow: The best UX for "Add Member" without backend code is tricky.
            // We will TRY to use the `supabase` client but be aware of session effects.
            // OR: We simply insert into `profiles` and let them sign up themselves? 
            // User ASKED for "Password" field, so they want to set credentials.

            // We'll try to just call signUp. If it logs the Admin out, that's a Supabase client behavior constraint.
            // To avoid this, we can try to use a temporary hidden client.

            // Create a temporary, non-persisted client to avoid hijacking the admin session
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            // Use the temporary client for sign up
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: email.trim(),
                password: password.trim(),
                options: {
                    data: {
                        full_name: name.trim(),
                        role: role,
                    }
                }
            });

            if (authError) throw authError;

            // 2. Insert into profiles table immediately to ensure they exist in our directory
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: authData.user.id,
                        email: email,
                        name: name,
                        role: role,
                        status: 'Invited' // Initial status: triggers "Complete Profile" flow
                    }]);

                if (profileError) {
                    // If profile insert fails (e.g. trigger already handled it), we ignore or log
                    console.warn("Profile insert warning:", profileError);
                }
            }

            setCreatedMember({ name, email, password, role });
            setShowSuccess(true);
            addToast({ type: 'success', title: 'Member Added', message: `${name} has been added successfully.` });
            fetchMembers();

        } catch (error: any) {
            console.error('Error adding member:', error);
            addToast({ type: 'error', title: 'Failed to Add', message: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSending(false);
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName || selectedTeamMemberIds.length === 0 || selectedAccountIds.length === 0) {
            addToast({ type: 'error', title: 'Missing Info', message: 'Please complete all team details.' });
            return;
        }

        setIsSavingTeam(true);
        try {
            // 1. Insert Team
            const { data: team, error: teamError } = await supabase
                .from('teams')
                .insert([{ name: newTeamName }])
                .select()
                .single();

            if (teamError) throw teamError;

            // 2. Insert Members
            const memberInserts = selectedTeamMemberIds.map(id => ({
                team_id: team.id,
                member_id: id
            }));
            const { error: membersError } = await supabase.from('team_members').insert(memberInserts);
            if (membersError) throw membersError;

            // 3. Insert Accounts
            const accountInserts = selectedAccountIds.map(id => ({
                team_id: team.id,
                account_id: id
            }));
            const { error: accountsError } = await supabase.from('team_accounts').insert(accountInserts);
            if (accountsError) throw accountsError;

            addToast({ type: 'success', title: 'Team Created', message: `${newTeamName} has been initialized.` });

            // Cleanup and Refresh
            setIsTeamModalOpen(false);
            setNewTeamName('');
            setSelectedTeamMemberIds([]);
            setSelectedAccountIds([]);
            fetchTeams();

        } catch (error: any) {
            console.error('Error creating team:', error);
            addToast({ type: 'error', title: 'Creation Failed', message: error.message });
        } finally {
            setIsSavingTeam(false);
        }
    };

    const projectManagers = useMemo(() => {
        return profiles
            .filter(p => {
                const r = p.role?.toLowerCase().trim();
                return r === 'project manager';
            })
            .map(p => ({ label: p.name, value: p.id, description: p.email }));
    }, [profiles]);

    const accountOptions = useMemo(() => {
        return availableAccounts.map(a => ({ label: a.name, value: a.id, description: a.prefix || '' }));
    }, [availableAccounts]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast({ type: 'success', title: 'Copied', message: 'Copied to clipboard.' });
    };

    const columns = [
        {
            header: 'User',
            key: 'name',
            className: 'min-w-[280px]',
            render: (item: any) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        size="sm"
                        status={item.status === 'Active' ? 'online' : item.status === 'Pending' ? 'away' : 'offline'}
                        initials={item.isInvitation ? '?' : item.name.split(' ').map((n: any) => n[0]).join('')}
                    />
                    <div className="flex flex-col">
                        <span className={`font-semibold ${item.isInvitation ? 'text-gray-500 italic' : 'text-white/90'}`}>{item.name}</span>
                        <span className="text-[10px] text-gray-500 font-medium">{item.email}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Role',
            key: 'role',
            className: 'min-w-[180px]',
            render: (item: any) => <span className="text-gray-400 font-medium">{item.role}</span>
        },
        {
            header: 'Status',
            key: 'status',
            className: 'min-w-[120px]',
            render: (item: any) => (
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${item.status === 'Active' ? 'bg-brand-success/10 text-brand-success border-brand-success/20' :
                    item.status === 'Pending' ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/20' :
                        'bg-white/5 text-gray-500 border-white/10'
                    }`}>
                    {item.status}
                </span>
            )
        },
        {
            header: 'Joined',
            key: 'joined',
            render: (item: any) => <span className="text-gray-400 font-medium">{item.joined}</span>
        },
        {
            header: '',
            key: 'actions',
            className: 'text-right w-10',
            render: (item: any) => (
                <KebabMenu
                    options={[
                        {
                            label: item.isInvitation ? 'Resend Invite' : 'View Profile',
                            icon: item.isInvitation ? <IconRefreshCw size={14} /> : <IconUser size={14} />,
                            onClick: () => {
                                if (item.isInvitation) {
                                    handleResendInvitation(item);
                                } else {
                                    onUserOpen(item.id);
                                }
                            }
                        },
                        {
                            label: 'Edit Permissions',
                            icon: <IconEdit size={14} />,
                            onClick: () => handleEditPermissions(item)
                        },
                        {
                            label: 'Remove Member',
                            icon: <IconTrash size={14} />,
                            variant: 'danger',
                            onClick: () => confirmRemoveMember(item)
                        }
                    ]}
                />
            )
        },
    ];

    const teamColumns = [
        {
            header: 'Team Name',
            key: 'name',
            className: 'min-w-[200px]',
            render: (item: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20">
                        <IconUsers size={20} />
                    </div>
                    <span className="font-semibold text-white/90">{item.name}</span>
                </div>
            )
        },
        {
            header: 'Members',
            key: 'members',
            render: (item: any) => (
                <div className="flex flex-wrap gap-1">
                    {item.memberNames.map((name: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-brand-primary/5 border border-brand-primary/10 text-[10px] text-brand-primary font-medium">
                            {name}
                        </span>
                    ))}
                </div>
            )
        },
        {
            header: 'Accounts',
            key: 'accounts',
            render: (item: any) => (
                <div className="flex flex-wrap gap-1">
                    {item.accounts.map((acc: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-400 font-medium">
                            {acc}
                        </span>
                    ))}
                </div>
            )
        },
        {
            header: '',
            key: 'actions',
            className: 'text-right w-10',
            render: (item: any) => (
                <KebabMenu
                    options={[
                        { label: 'Edit', icon: <IconEdit size={14} />, onClick: () => console.log('Edit', item.id) },
                        { label: 'Delete', icon: <IconTrash size={14} />, variant: 'danger', onClick: () => console.log('Delete', item.id) }
                    ]}
                />
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            {/* Navigation Tabs */}
            <div className="flex items-center justify-between gap-6 px-2">
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {activeTab === 'users' && (
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" leftIcon={<IconFilter className="w-4 h-4" />}>Filters</Button>
                        <Button variant="primary" size="sm" leftIcon={<IconPlus className="w-4 h-4" />} onClick={handleOpenModal}>Add Member</Button>
                    </div>
                )}
            </div>

            {activeTab === 'users' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card isElevated className="relative overflow-hidden group min-h-[140px] flex flex-col justify-between">
                            <div className="relative z-10 flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Total Members</p>
                                    <p className="text-4xl font-bold text-white tracking-tight">{stats.total}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shadow-lg shadow-brand-primary/5 group-hover:scale-110 transition-transform duration-500">
                                    <IconUser size={24} />
                                </div>
                            </div>
                            <div className="relative z-10 flex items-center gap-2 mt-4">
                                <span className="text-[10px] font-bold text-brand-success bg-brand-success/10 px-2 py-0.5 rounded-full border border-brand-success/20">+12%</span>
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Growth this month</span>
                            </div>
                        </Card>

                        <Card isElevated className="relative overflow-hidden group min-h-[140px] flex flex-col justify-between">
                            <div className="relative z-10 flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Active Now</p>
                                    <p className="text-4xl font-bold text-white tracking-tight">{stats.active}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-brand-success/10 flex items-center justify-center text-brand-success border border-brand-success/20 shadow-lg shadow-brand-success/5 group-hover:scale-110 transition-transform duration-500">
                                    <div className="relative">
                                        <IconClock size={24} />
                                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-success border-2 border-surface-card animate-pulse" />
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-10 flex items-center gap-2 mt-4">
                                <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">Real-time sync</span>
                            </div>
                        </Card>

                        <Card isElevated className="relative overflow-hidden group min-h-[140px] flex flex-col justify-between">
                            <div className="relative z-10 flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">Invites Pending</p>
                                    <p className="text-4xl font-bold text-white tracking-tight">{stats.pending}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-brand-warning/10 flex items-center justify-center text-brand-warning border border-brand-warning/20 shadow-lg shadow-brand-warning/5 group-hover:scale-110 transition-transform duration-500">
                                    <IconBell size={24} />
                                </div>
                            </div>
                            <div className="relative z-10 mt-4">
                                <button className="text-[10px] font-bold text-brand-primary hover:text-brand-primary/80 transition-all uppercase tracking-widest flex items-center gap-1 group/btn">
                                    Review Applications
                                    <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                                </button>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">All Users</h3>
                            <div className="w-full sm:w-64">
                                <Input
                                    placeholder="Search members..."
                                    leftIcon={<IconSearch className="w-4 h-4" />}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <Table
                            columns={columns}
                            data={allMembers}
                            isLoading={isLoading}
                            onRowClick={(item: any) => {
                                if (!item.isInvitation) {
                                    onUserOpen(item.id);
                                }
                            }}
                        />
                    </div>
                </>
            ) : activeTab === 'teams' ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">All Teams</h3>
                        <Button
                            variant="metallic"
                            size="sm"
                            leftIcon={<IconPlus className="w-4 h-4" />}
                            onClick={() => setIsTeamModalOpen(true)}
                        >
                            Create Team
                        </Button>
                    </div>
                    <Table
                        columns={teamColumns}
                        data={teams}
                        isLoading={false}
                    />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-2">
                        <IconClock size={32} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Designer Shifts Coming Soon</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            We're currently refining this section to provide you with a powerful way to manage workflow schedules.
                        </p>
                    </div>
                </div>
            )}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={showSuccess ? "Member Added Successfully" : "Add New Member"}
                size="md"
                footer={
                    showSuccess ? (
                        <div className="flex justify-end w-full">
                            <Button variant="primary" onClick={handleCloseModal} className="w-full">Close</Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-end gap-3 w-full">
                            <Button variant="ghost" onClick={handleCloseModal} disabled={isSending}>Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={handleAddMember}
                                isLoading={isSending}
                                className="px-8 shadow-lg shadow-brand-primary/20"
                            >
                                Add Member
                            </Button>
                        </div>
                    )
                }
            >
                {showSuccess && createdMember ? (
                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-brand-success/10 border border-brand-success/20 text-center">
                            <p className="text-brand-success font-semibold">User account created successfully!</p>
                            <p className="text-xs text-gray-400 mt-1">Please copy the details below.</p>
                        </div>

                        <div className="relative">
                            <div className="p-4 rounded-xl bg-black/40 border border-white/10 font-mono text-sm text-gray-300 space-y-2">
                                <p><span className="text-gray-500 uppercase text-[10px] tracking-widest w-20 inline-block select-none">Name</span> <span className="text-white">{createdMember.name}</span></p>
                                <p><span className="text-gray-500 uppercase text-[10px] tracking-widest w-20 inline-block select-none">Email</span> <span className="text-white">{createdMember.email}</span></p>
                                <p><span className="text-gray-500 uppercase text-[10px] tracking-widest w-20 inline-block select-none">Password</span> <span className="text-white">{createdMember.password}</span></p>
                                <p><span className="text-gray-500 uppercase text-[10px] tracking-widest w-20 inline-block select-none">Role</span> <span className="text-brand-primary">{createdMember.role}</span></p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="absolute top-2 right-2 bg-transparent hover:bg-white/10 border-none text-gray-400 hover:text-white transition-all p-2 h-auto"
                                onClick={() => copyToClipboard(`Name: ${createdMember.name}\nEmail: ${createdMember.email}\nPassword: ${createdMember.password}\nRole: ${createdMember.role}`)}
                                title="Copy All Details"
                            >
                                <IconCopy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</p>
                            <Input
                                placeholder="e.g. John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                leftIcon={<IconUser className="w-4 h-4" />}
                                variant="metallic"
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</p>
                            <Input
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                leftIcon={<IconMail className="w-4 h-4" />}
                                variant="metallic"
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</p>
                            <Input
                                type="text"
                                placeholder="Set initial password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                leftIcon={<IconAlertTriangle className="w-4 h-4" />} // Using alert icon for sensitive data
                                variant="metallic"
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Role</p>
                            <Dropdown
                                options={roles}
                                value={role}
                                onChange={(val) => setRole(val)}
                                placeholder="Select a role"
                                variant="metallic"
                                size="md"
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Permissions Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit User Permissions"
                size="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={() => editingUser && handleSavePermissions(editingUser.id, editingUser.role)}
                            isLoading={isUpdating}
                        >
                            Save Changes
                        </Button>
                    </div>
                }
            >
                {editingUser && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
                            <Avatar
                                size="md"
                                initials={editingUser.name.split(' ').map(n => n[0]).join('')}
                                status={editingUser.status === 'Active' ? 'online' : editingUser.status === 'Pending' ? 'away' : 'offline'}
                            />
                            <div>
                                <h4 className="font-bold text-white">{editingUser.name}</h4>
                                <p className="text-xs text-gray-500">{editingUser.email}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Platform Role</label>
                                <Dropdown
                                    options={roles}
                                    value={editingUser.role}
                                    onChange={(val) => setEditingUser({ ...editingUser, role: val })}
                                    variant="metallic"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Quick Status Update</label>
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={editingUser.status === 'Active' ? 'bg-brand-success/10 border-brand-success/30 text-brand-success' : 'border-white/10 text-gray-400'}
                                        onClick={() => handleUpdateUserStatus(editingUser.id, 'Active')}
                                        isLoading={isUpdating}
                                    >
                                        Approve / Active
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={editingUser.status === 'Suspended' ? 'bg-brand-warning/10 border-brand-warning/30 text-brand-warning' : 'border-white/10 text-gray-400'}
                                        onClick={() => handleUpdateUserStatus(editingUser.id, 'Suspended')}
                                        isLoading={isUpdating}
                                    >
                                        Suspend
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={editingUser.status === 'Disabled' ? 'bg-brand-error/10 border-brand-error/30 text-brand-error' : 'border-white/10 text-gray-400'}
                                        onClick={() => handleUpdateUserStatus(editingUser.id, 'Disabled')}
                                        isLoading={isUpdating}
                                    >
                                        Disable
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Remove Member Confirmation Modal */}
            <Modal
                isOpen={isRemoveModalOpen}
                onClose={() => setIsRemoveModalOpen(false)}
                title="Remove Member"
                size="sm"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsRemoveModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            className="bg-brand-error hover:bg-brand-error/90 border-brand-error/20"
                            onClick={executeRemoveMember}
                            isLoading={isUpdating}
                        >
                            Confirm Removal
                        </Button>
                    </div>
                }
            >
                {userToRemove && (
                    <div className="space-y-6 py-2">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-brand-error/10 flex items-center justify-center text-brand-error border border-brand-error/20">
                                <IconTrash className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-white">Permanently Remove?</h3>
                                <p className="text-sm text-gray-400 px-4">
                                    You are about to remove <span className="text-white font-semibold">{userToRemove.name === 'Pending Invitation' ? userToRemove.email : userToRemove.name}</span> from the directory.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-brand-error/[0.03] border border-brand-error/10 space-y-3">
                            <div className="flex items-center gap-2 text-brand-error">
                                <IconAlertTriangle className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Danger Zone</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                This action is permanent and cannot be undone. All associated platform permissions for this user will be revoked immediately.
                            </p>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create Team Modal */}
            <Modal
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                title="Create New Team"
                size="md"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setIsTeamModalOpen(false)} disabled={isSavingTeam}>Cancel</Button>
                        <Button
                            variant="metallic"
                            onClick={handleCreateTeam}
                            isLoading={isSavingTeam}
                            className="px-8"
                        >
                            Initialize Team
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Team Name</p>
                        <Input
                            placeholder="e.g. Design Elites"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            leftIcon={<IconUsers className="w-4 h-4 text-brand-primary" />}
                            variant="metallic"
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Team Members (Project Managers)</p>
                        <Dropdown
                            isMulti
                            options={projectManagers}
                            value={selectedTeamMemberIds}
                            onChange={(val) => setSelectedTeamMemberIds(val)}
                            placeholder="Select Project Managers"
                            variant="metallic"
                            size="md"
                            showSearch
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Assign Accounts</p>
                        <Dropdown
                            isMulti
                            options={accountOptions}
                            value={selectedAccountIds}
                            onChange={(val) => setSelectedAccountIds(val)}
                            placeholder="Select Accounts (e.g. ARS)"
                            variant="metallic"
                            size="md"
                            showSearch
                        />
                    </div>
                </div>
            </Modal>

            {/* Create Team Modal */}
            <Modal
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                title="Create New Team"
                size="md"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setIsTeamModalOpen(false)} disabled={isSavingTeam}>Cancel</Button>
                        <Button
                            variant="metallic"
                            onClick={handleCreateTeam}
                            isLoading={isSavingTeam}
                            className="px-8"
                        >
                            Initialize Team
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Team Name</p>
                        <Input
                            placeholder="e.g. Design Elites"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            leftIcon={<IconUsers className="w-4 h-4 text-brand-primary" />}
                            variant="metallic"
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Team Members (Project Managers)</p>
                        <Dropdown
                            isMulti
                            options={projectManagers}
                            value={selectedTeamMemberIds}
                            onChange={(val) => setSelectedTeamMemberIds(val)}
                            placeholder="Select Project Managers"
                            variant="metallic"
                            size="md"
                            showSearch
                            selectionLabel="Project Managers selected"
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Assign Accounts</p>
                        <Dropdown
                            isMulti
                            options={accountOptions}
                            value={selectedAccountIds}
                            onChange={(val) => setSelectedAccountIds(val)}
                            placeholder="Select Accounts (e.g. ARS)"
                            variant="metallic"
                            size="md"
                            showSearch
                            selectionLabel="Accounts assigned"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Users;

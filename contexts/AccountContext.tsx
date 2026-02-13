
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';

interface Account {
    id: string;
    name: string;
    prefix: string;
    display_prefix?: string;
    status?: string;
}

interface AccountContextType {
    accounts: Account[];
    loading: boolean;
    fetchAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const { profile } = useUser();

    const fetchAccounts = async () => {
        if (!profile) return;

        setLoading(true);
        const userRole = profile.role?.toLowerCase().trim();

        try {
            if (userRole === 'admin' || userRole === 'freelancer') {
                const { data, error } = await supabase
                    .from('accounts')
                    .select('*')
                    .order('name', { ascending: true });

                if (!error && data) {
                    setAccounts(data);
                }
            } else if (userRole === 'project manager') {
                // 1. Get teams this PM belongs to
                const { data: userTeams, error: teamError } = await supabase
                    .from('team_members')
                    .select('team_id')
                    .eq('member_id', profile.id);

                if (teamError || !userTeams || userTeams.length === 0) {
                    setAccounts([]);
                    return;
                }

                const teamIds = userTeams.map(t => t.team_id);

                // 2. Get accounts linked to those teams
                const { data: teamAccountLinks, error: accountLinkError } = await supabase
                    .from('team_accounts')
                    .select('account_id')
                    .in('team_id', teamIds);

                if (accountLinkError || !teamAccountLinks || teamAccountLinks.length === 0) {
                    setAccounts([]);
                    return;
                }

                const accountIds = [...new Set(teamAccountLinks.map(ta => ta.account_id))];

                // 3. Fetch the actual account details
                const { data: teamAccounts, error: accountsError } = await supabase
                    .from('accounts')
                    .select('*')
                    .in('id', accountIds)
                    .order('name', { ascending: true });

                if (!accountsError && teamAccounts) {
                    setAccounts(teamAccounts);
                } else {
                    setAccounts([]);
                }
            } else {
                // Default: fetch all accounts
                const { data, error } = await supabase
                    .from('accounts')
                    .select('*')
                    .order('name', { ascending: true });

                if (!error && data) {
                    setAccounts(data);
                }
            }
        } catch (err) {
            console.error('Error fetching accounts in context:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile) {
            fetchAccounts();

            // Subscribe to changes in accounts table
            const channel = supabase
                .channel('accounts_changes')
                .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'accounts' }, () => {
                    fetchAccounts();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setAccounts([]);
            setLoading(false);
        }
    }, [profile]);

    return (
        <AccountContext.Provider value={{ accounts, loading, fetchAccounts }}>
            {children}
        </AccountContext.Provider>
    );
};

export const useAccounts = () => {
    const context = useContext(AccountContext);
    if (context === undefined) {
        throw new Error('useAccounts must be used within an AccountProvider');
    }
    return context;
};

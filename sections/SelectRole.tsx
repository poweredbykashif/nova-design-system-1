import React, { useState, useEffect } from 'react';
import { IconUser, IconBriefcase, IconCheckCircle, IconSettings, IconLayout, IconDollar } from '../components/Icons';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';

interface SelectRoleProps {
    onRoleSelect: (role: string) => void;
}

interface Role {
    id: string;
    name: string;
    description: string;
}

const getRoleIcon = (roleName: string) => {
    switch (roleName) {
        case 'Admin':
            return IconSettings;
        case 'Project Manager':
            return IconBriefcase;
        case 'Freelancer':
            return IconUser;
        case 'Presentation Designer':
            return IconLayout;
        case 'Finance Manager':
            return IconDollar;
        default:
            return IconUser;
    }
};

const SelectRole: React.FC<SelectRoleProps> = ({ onRoleSelect }) => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const { data, error } = await supabase
                    .from('roles')
                    .select('*');

                if (error) throw error;
                setRoles(data || []);
            } catch (error) {
                console.error('Error fetching roles:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();
    }, []);

    const handleContinue = () => {
        if (selected) {
            const selectedRole = roles.find(r => r.id === selected);
            if (selectedRole) {
                onRoleSelect(selectedRole.name);
            }
        }
    };

    if (loading) {
        return (
            <div className="w-full max-w-4xl min-h-[400px] flex items-center justify-center bg-surface-card border border-surface-border rounded-3xl mx-auto">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl bg-surface-card border border-surface-border p-10 rounded-3xl shadow-2xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-2">Select Your Role</h2>
                <p className="text-gray-400">Tell us how you plan to use Nova.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {roles.map((role) => {
                    const isSelected = selected === role.id;
                    const Icon = getRoleIcon(role.name);
                    return (
                        <div
                            key={role.id}
                            onClick={() => setSelected(role.id)}
                            className={`relative cursor-pointer group p-6 rounded-2xl border transition-all duration-300 h-full flex flex-col ${isSelected
                                ? 'bg-brand-primary/10 border-brand-primary shadow-[0_0_30px_-5px_rgba(255,100,50,0.3)]'
                                : 'bg-surface-bg border-surface-border hover:border-gray-600 hover:bg-surface-hover'
                                }`}
                        >
                            {isSelected && (
                                <div className="absolute top-4 right-4 text-brand-primary">
                                    <IconCheckCircle size={20} />
                                </div>
                            )}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors shrink-0 ${isSelected ? 'bg-brand-primary text-white' : 'bg-surface-border text-gray-400 group-hover:text-white'
                                }`}>
                                <Icon size={24} />
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                {role.name}
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {role.description}
                            </p>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between items-center mt-10">
                <button
                    type="button"
                    onClick={async () => {
                        localStorage.removeItem('nova_onboarding_step');
                        localStorage.removeItem('nova_selected_role');
                        await supabase.auth.signOut();
                        window.location.reload();
                    }}
                    className="text-sm font-medium text-gray-500 hover:text-brand-error transition-colors"
                >
                    Sign Out
                </button>
                <Button
                    variant="primary"
                    className="w-full md:w-auto px-10 py-3"
                    disabled={!selected}
                    onClick={handleContinue}
                >
                    Continue
                </Button>
            </div>
        </div>
    );
};

export default SelectRole;

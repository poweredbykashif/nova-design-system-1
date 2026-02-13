import React, { useState, useEffect } from 'react';
import Dashboard from './sections/Dashboard';
import Projects, { ProjectsHandle } from './sections/Projects';
import Finances from './sections/Finances';
import Accounts from './sections/Accounts';
import Assets from './sections/Assets';
import Chats from './sections/Chats';
import Users from './sections/Users';
import Channels from './sections/Channels';
import Integrations from './sections/Integrations';
import Settings, { SettingsHandle } from './sections/Settings';
import { Modal } from './components/Surfaces';
import Button from './components/Button';
import { IconLock, IconSettings, IconBell } from './components/Icons';
import Earnings from './sections/Earnings';
import ProjectDetails from './sections/ProjectDetails';
import UserDetails from './sections/UserDetails';
import SelectRole from './sections/SelectRole';
import CompleteProfile from './sections/CompleteProfile';
import PendingApproval from './sections/PendingApproval';
import Reminders from './sections/Reminders';
import { DashboardLayout, DashboardView } from './layouts/DashboardLayout';
import { SignInScreen, SignUpScreen } from './sections/AuthScreens';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ToastContainer } from './components/Toast';
import { getInitialView, updateRoute } from './utils/routing';
import { NotificationProvider } from './contexts/NotificationContext';
import { UserProvider } from './contexts/UserContext';
import { AccountProvider } from './contexts/AccountContext';
import { ReminderOverlay } from './components/ReminderOverlay';


type View = 'dashboard' | 'signin' | 'signup' | 'select-role' | 'complete-profile' | 'pending-approval';

const App: React.FC = () => {
  const initial = getInitialView();
  const [view, setView] = useState<View>('signin');
  const [dashboardView, setDashboardView] = useState<DashboardView>(initial.view);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initial.projectId);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const [pendingView, setPendingView] = useState<DashboardView | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const settingsRef = React.useRef<SettingsHandle>(null);
  const projectsRef = React.useRef<ProjectsHandle>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);

      if (session) {
        // Check if user has a profile in the database
        const { data: profile } = await supabase
          .from('profiles')
          .select('status, role')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          // Profile exists, check status
          if (profile.status === 'Invited') {
            setView('complete-profile');
          } else if (profile.status === 'Pending') {
            setView('pending-approval');
          } else {
            setView('dashboard');
          }
          if (profile.role) setSelectedRole(profile.role);
        } else {
          // No profile, check onboarding progress
          const savedStep = localStorage.getItem('nova_onboarding_step') as View | null;
          const savedRole = localStorage.getItem('nova_selected_role');

          if (savedStep && (savedStep === 'select-role' || savedStep === 'complete-profile')) {
            setView(savedStep);
            if (savedRole) setSelectedRole(savedRole);
          } else {
            setView('select-role');
          }
        }
      } else {
        // No session, always start at signin
        setView('signin');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // Check for onboarding state
      const savedStep = localStorage.getItem('nova_onboarding_step') as View | null;
      const savedRole = localStorage.getItem('nova_selected_role');

      if (session && savedStep && (savedStep === 'select-role' || savedStep === 'complete-profile' || savedStep === 'pending-approval')) {
        setView(savedStep);
        if (savedRole) setSelectedRole(savedRole);
      } else if (session) {
        // Do nothing here, let the initial useEffect or manual routing handle it
        // Or better: check profile here too to be safe on refresh
        // For now, we rely on the initial check to set the view correctly.
        // If we just set dashboard here, it overrides the "Invited" check.
        // Correct fix: check profile again inside onAuthStateChange.
        supabase
          .from('profiles')
          .select('status, role')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              if (profile.role) setSelectedRole(profile.role);
              if (profile.status === 'Invited') setView('complete-profile');
              else if (profile.status === 'Pending') setView('pending-approval');
              else setView('dashboard');
            } else {
              // Fallback
              const savedStep = localStorage.getItem('nova_onboarding_step') as View | null;
              if (savedStep) setView(savedStep);
              else setView('select-role'); // Should be dashboard but safety
            }
          });
      } else {
        setView('signin');
        // Clear last view on sign out
        localStorage.removeItem('lastDashboardView');
      }
    });

    const handlePopState = () => {
      const { view, projectId } = getInitialView();
      setDashboardView(view);
      setSelectedProjectId(projectId);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (view === 'dashboard') {
      updateRoute(dashboardView, undefined, selectedProjectId);
    }
  }, [view, dashboardView, selectedProjectId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setView('signin');
  };

  const handleItemSelect = (item: DashboardView) => {
    if (isSettingsDirty && dashboardView === 'Settings') {
      setPendingView(item);
      setPendingProjectId(null);
      return;
    }
    setDashboardView(item);
    setSelectedProjectId(null);
    setSelectedUserId(null);
  };

  const handleProjectOpen = (projectId: string) => {
    if (isSettingsDirty && dashboardView === 'Settings') {
      setPendingProjectId(projectId);
      setPendingView(null);
      return;
    }
    setSelectedProjectId(projectId);
  };

  // Dirty State Confirmation Modal
  const renderDirtyModal = () => (
    <Modal
      isOpen={!!pendingView || !!pendingProjectId}
      onClose={() => {
        setPendingView(null);
        setPendingProjectId(null);
      }}
      title="Unsaved Changes"
      size="sm"
      isElevatedFooter
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              settingsRef.current?.discard();
              const nextView = pendingView;
              const nextProject = pendingProjectId;
              setPendingView(null);
              setPendingProjectId(null);
              if (nextView) {
                setDashboardView(nextView);
                setSelectedProjectId(null);
                setSelectedUserId(null);
              } else if (nextProject) {
                setDashboardView('Projects');
                setSelectedProjectId(nextProject);
              }
            }}
            className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
          >
            Discard
          </Button>
          <Button
            variant="metallic"
            onClick={async () => {
              await settingsRef.current?.save();
              const nextView = pendingView;
              const nextProject = pendingProjectId;
              setPendingView(null);
              setPendingProjectId(null);
              if (nextView) {
                setDashboardView(nextView);
                setSelectedProjectId(null);
                setSelectedUserId(null);
              } else if (nextProject) {
                setDashboardView('Projects');
                setSelectedProjectId(nextProject);
              }
            }}
            className="px-8 shadow-lg shadow-brand-primary/20"
          >
            Save & Continue
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-6 animate-pulse">
          <IconSettings className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Wait! You have unsaved changes</h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-[280px]">
          You were in the middle of updating your account settings. Would you like to save these changes before leaving?
        </p>
      </div>
    </Modal>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-bg flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (view === 'dashboard') {
    if (!session) {
      setView('signin');
      return null;
    }

    const renderDashboardView = () => {
      // Handle Projects specifically to preserve in-memory state (scrolling, filters, etc.)
      if (dashboardView === 'Projects') {
        return (
          <>
            <div className={selectedProjectId ? 'hidden' : 'block h-full'}>
              <Projects
                ref={projectsRef}
                onProjectOpen={setSelectedProjectId}
                isProjectOpen={!!selectedProjectId}
              />
            </div>
            {selectedProjectId && (
              <ProjectDetails
                projectId={selectedProjectId}
                onBack={() => setSelectedProjectId(null)}
                onStatusChange={() => projectsRef.current?.refresh()}
              />
            )}
          </>
        );
      }

      switch (dashboardView) {
        case 'Dashboard':
          return <Dashboard />;
        case 'Finances':
          return <Finances />;
        case 'Earnings':
          return <Earnings />;
        case 'Accounts':
          return <Accounts />;
        case 'Assets':
          return <Assets />;
        case 'Chats':
          return <Chats />;
        case 'Users':
          return (
            <>
              <div className={selectedUserId ? 'hidden' : 'block h-full'}>
                <Users onUserOpen={setSelectedUserId} isUserOpen={!!selectedUserId} />
              </div>
              {selectedUserId && (
                <UserDetails
                  userId={selectedUserId}
                  onBack={() => setSelectedUserId(null)}
                />
              )}
            </>
          );
        case 'Channels':
          return <Channels />;
        case 'Integrations':
          return <Integrations />;
        case 'Settings':
          return (
            <Settings
              ref={settingsRef}
              onBack={() => handleItemSelect('Dashboard')}
              onDirtyChange={setIsSettingsDirty}
            />
          );
        case 'Reminders':
          return <Reminders />;
        default:
          return <Dashboard />;
      }
    };

    return (
      <UserProvider>
        <AccountProvider>
          <NotificationProvider>
            <DashboardLayout
              onSignOut={handleSignOut}
              activeItem={dashboardView}
              onItemSelect={handleItemSelect}
              onProjectOpen={handleProjectOpen}
              noPadding={!!selectedProjectId}
            >
              {renderDashboardView()}
            </DashboardLayout>
            <ReminderOverlay />
          </NotificationProvider>
          <ToastContainer />
          {pendingView && renderDirtyModal()}
        </AccountProvider>
      </UserProvider>
    );
  }


  return (
    <UserProvider>
      <AccountProvider>
        <div className="min-h-screen bg-surface-bg flex items-center justify-center p-6">
          <div className="w-full">
            {view === 'signin' ? (
              <SignInScreen
                onToggle={() => setView('signup')}
                onSuccess={async () => {
                  // Fetch profile to determine next view
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) {
                    const { data: profile } = await supabase
                      .from('profiles')
                      .select('status, role')
                      .eq('id', session.user.id)
                      .single();

                    if (profile) {
                      if (profile.role) setSelectedRole(profile.role);

                      if (profile.status === 'Invited') {
                        setView('complete-profile');
                      } else if (profile.status === 'Pending') {
                        setView('pending-approval');
                      } else {
                        // Reset state to ensure fresh dashboard view
                        setDashboardView('Dashboard');
                        setSelectedProjectId(null);
                        setSelectedUserId(null);
                        setView('dashboard');
                      }
                    } else {
                      // Fallback if no profile
                      setDashboardView('Dashboard');
                      setSelectedProjectId(null);
                      setSelectedUserId(null);
                      setView('dashboard');
                    }
                  } else {
                    setDashboardView('Dashboard');
                    setSelectedProjectId(null);
                    setSelectedUserId(null);
                    setView('dashboard');
                  }
                }}
              />
            ) : view === 'signup' ? (
              <SignUpScreen
                onToggle={() => setView('signin')}
                onSuccess={() => {
                  localStorage.setItem('nova_onboarding_step', 'select-role');
                  setView('select-role');
                }}
              />
            ) : view === 'complete-profile' ? (
              <CompleteProfile
                role={selectedRole}
                onComplete={() => {
                  const isAdmin = selectedRole?.toLowerCase() === 'admin';
                  // Admins go to dashboard, everyone else to pending approval
                  const nextView = isAdmin ? 'dashboard' : 'pending-approval';

                  // Clear any lingering onboarding step so they don't get stuck in a loop if they refresh
                  // But if they are pending, we DO want them to stay there.
                  if (nextView === 'pending-approval') {
                    localStorage.setItem('nova_onboarding_step', 'pending-approval');
                  } else {
                    localStorage.removeItem('nova_onboarding_step');
                  }

                  setView(nextView as any);
                }}
              />
            ) : view === 'pending-approval' ? (
              <PendingApproval
                role={selectedRole}
                onSignOut={async () => {
                  localStorage.removeItem('nova_onboarding_step');
                  localStorage.removeItem('nova_selected_role');
                  await supabase.auth.signOut();
                  setView('signin');
                }}
              />
            ) : (
              <SelectRole onRoleSelect={(role) => {
                setSelectedRole(role);
                localStorage.setItem('nova_onboarding_step', 'complete-profile');
                localStorage.setItem('nova_selected_role', role);
                setView('complete-profile');
              }} />
            )}
          </div>
        </div>
        <ReminderOverlay />
        <ToastContainer />
      </AccountProvider>
    </UserProvider>
  );
};

export default App;


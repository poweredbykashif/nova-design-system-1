
import { DashboardView } from '../layouts/DashboardLayout';

const VIEW_MAP: Record<string, DashboardView> = {
    'dashboard': 'Dashboard',
    'projects': 'Projects',
    'finances': 'Finances',
    'earnings': 'Earnings',
    'accounts': 'Accounts',
    'assets': 'Assets',
    'chats': 'Chats',
    'users': 'Users',
    'channels': 'Channels',
    'integrations': 'Integrations',
    'settings': 'Settings',
    'reminders': 'Reminders'
};

const PATH_MAP: Record<DashboardView, string> = Object.entries(VIEW_MAP).reduce((acc, [path, view]) => {
    acc[view] = path;
    return acc;
}, {} as Record<DashboardView, string>);

export const getInitialView = (): { view: DashboardView; projectId: string | null } => {
    const segments = window.location.pathname.substring(1).split('/');
    const firstSegment = segments[0]?.toLowerCase();

    if (firstSegment && VIEW_MAP[firstSegment]) {
        const view = VIEW_MAP[firstSegment];
        const secondSegment = segments[1];

        // If it's projects and the second segment is likely a project ID (not a tab like 'progress')
        if (view === 'Projects' && secondSegment && !['progress', 'completed', 'cancelled', 'disputes', 'trash'].includes(secondSegment.toLowerCase())) {
            // Decode URL-encoded characters and convert hyphens back to spaces for database lookup
            const decodedProjectId = decodeURIComponent(secondSegment).replace(/-/g, ' ');
            return { view: 'Projects', projectId: decodedProjectId };
        }

        return { view, projectId: null };
    }

    const saved = localStorage.getItem('lastDashboardView') as DashboardView;
    if (saved && Object.values(VIEW_MAP).includes(saved)) {
        return { view: saved, projectId: null };
    }

    return { view: 'Dashboard', projectId: null };
};

export const getInitialTab = (view: string, defaultTab: string): string => {
    const segments = window.location.pathname.substring(1).split('/');
    const firstSegment = segments[0]?.toLowerCase();

    if (firstSegment === VIEW_MAP[view]?.toLowerCase() || firstSegment === view.toLowerCase()) {
        const secondSegment = segments[1]?.toLowerCase();
        if (secondSegment && ['progress', 'completed', 'cancelled', 'disputes', 'trash'].includes(secondSegment)) {
            return secondSegment;
        }
    }

    const saved = localStorage.getItem(`lastTab_${view}`);
    return saved || defaultTab;
};

export const updateRoute = (view: DashboardView, tab?: string, projectId?: string | null) => {
    const viewPath = PATH_MAP[view];
    let newPath = `/${viewPath}`;

    if (view === 'Projects' && projectId) {
        // Replace spaces with hyphens for cleaner URLs
        const urlFriendlyId = projectId.replace(/\s+/g, '-');
        newPath += `/${urlFriendlyId}`;
    } else if (tab) {
        newPath += `/${tab.toLowerCase()}`;
    }

    if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
    }

    localStorage.setItem('lastDashboardView', view);
    if (tab) {
        localStorage.setItem(`lastTab_${view}`, tab);
    }
};

export const navigateToProjectDetails = (projectId: string) => {
    const newPath = `/projects/${projectId}`;
    window.history.pushState(null, '', newPath);
    // Explicitly returning navigation intent
    return { view: 'Projects' as DashboardView, projectId };
};

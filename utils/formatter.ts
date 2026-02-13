/**
 * Formats a date string (YYYY-MM-DD) into a standard display format.
 * @param dateStr Date string (e.g., "2026-01-09")
 * @returns Formatted string (e.g., "09 Jan 2026")
 */
export const formatDeadlineDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';

    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
};

/**
 * Formats a 24-hour time string (HH:mm) into a 12-hour AM/PM string.
 * @param timeStr 24-hour time string (e.g., "17:00")
 * @returns 12-hour formatted string (e.g., "5:00 PM")
 */
export const formatTime = (timeStr: string | null | undefined): string => {
    if (!timeStr) return '';

    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return timeStr;

        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');

        return `${displayHours}:${displayMinutes} ${period}`;
    } catch (e) {
        return timeStr;
    }
};

/**
 * Calculates the time remaining or overdue status with strict color logic.
 * @param deadlineAt Timestamp string (UTC) or Date object
 * @returns { label: string, color: 'text-brand-success' | 'text-brand-warning' | 'text-brand-error' | 'text-gray-500' }
 */
export const getTimeLeft = (deadlineAt: string | Date | null | undefined) => {
    // 1. Initial Check
    if (!deadlineAt) {
        return { label: '--', color: 'text-gray-500' };
    }

    try {
        // 2. Consistent PKT "Now" Calculation (UTC+5)
        // We calculate what time it is in Karachi right now, formatted as a standard Date object
        const now = new Date();
        const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
        const pktNowMs = utcMs + (5 * 3600000);
        const pktNow = new Date(pktNowMs);

        // 3. Parse Deadline
        let deadline: Date;
        if (deadlineAt instanceof Date) {
            // Assume the date object represents the wall clock time for the deadline
            deadline = new Date(deadlineAt.getTime());
        } else {
            // String parsing - replace T/Z to avoid UTC interpretation if it's meant to be wall time
            const cleanStr = deadlineAt.replace('T', ' ').replace('Z', '').split('.')[0];
            deadline = new Date(cleanStr);
        }

        // 4. Validate Date
        if (isNaN(deadline.getTime())) {
            return { label: 'TBD', color: 'text-gray-500' };
        }

        // 5. Calculate Difference
        const diffInMs = deadline.getTime() - pktNow.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        // 6. Handle Edge Case (NaN result)
        if (isNaN(diffInHours)) {
            return { label: '--', color: 'text-gray-500' };
        }

        // 7. Determine Color
        let color = 'text-gray-500';
        if (diffInHours >= 24) color = 'text-brand-success';
        else if (diffInHours > 0) color = 'text-brand-warning';
        else color = 'text-brand-error';

        // 8. Generate Label
        let label = '';
        const absDiff = Math.abs(diffInHours);

        if (diffInHours > 0) {
            if (diffInHours >= 24) {
                const days = Math.floor(diffInHours / 24);
                const hours = Math.floor(diffInHours % 24);
                label = hours === 0 ? `${days} Day${days > 1 ? 's' : ''} Left` : `${days}d ${hours}h Left`;
            } else {
                const hours = Math.ceil(diffInHours);
                label = `${hours} Hour${hours > 1 ? 's' : ''} Left`;
            }
        } else {
            if (absDiff < 1) {
                label = 'Due Now';
            } else if (absDiff < 24) {
                const hours = Math.floor(absDiff);
                label = `${hours} Hour${hours > 1 ? 's' : ''} Late`;
            } else {
                const days = Math.floor(absDiff / 24);
                const hours = Math.floor(absDiff % 24);
                label = hours === 0 ? `${days} Day${days > 1 ? 's' : ''} Late` : `${days}d ${hours}h Late`;
            }
        }

        return { label, color };
    } catch (e) {
        console.error('TimeLeft Error:', e);
        return { label: '--', color: 'text-gray-500' };
    }
};

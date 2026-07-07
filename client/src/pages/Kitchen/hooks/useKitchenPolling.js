import { useEffect, useRef } from 'react';

/**
 * Custom hook to poll the backend API periodically.
 * Uses the Page Visibility API to pause polling when the tab is hidden (saving CPU and network)
 * and automatically resumes polling when the tab becomes active again.
 */
export default function useKitchenPolling(fetchQueue, intervalMs = 1500) {
    const fetchQueueRef = useRef(fetchQueue);

    useEffect(() => {
        fetchQueueRef.current = fetchQueue;
    }, [fetchQueue]);

    useEffect(() => {
        let intervalId = null;

        const startPolling = () => {
            if (!intervalId) {
                fetchQueueRef.current(); // Initial fetch
                intervalId = setInterval(() => {
                    fetchQueueRef.current();
                }, intervalMs);
            }
        };

        const stopPolling = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                startPolling();
            } else {
                stopPolling();
            }
        };

        // Start initially if tab is currently visible
        if (document.visibilityState === 'visible') {
            startPolling();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [intervalMs]);
}

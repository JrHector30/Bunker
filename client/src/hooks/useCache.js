import { useState, useEffect } from 'react';

// Global cache object for fast memory retrieval
const globalCache = {};

export function useCache(key, fetcher, initialData = []) {
    const [data, setData] = useState(() => {
        // 1. Check memory cache (instant)
        if (globalCache[key]) return globalCache[key];
        
        // 2. Check localStorage (persistent across reloads)
        const local = localStorage.getItem(key);
        if (local) {
            try {
                const parsed = JSON.parse(local);
                globalCache[key] = parsed; // Populate memory
                return parsed;
            } catch (e) {
                return initialData;
            }
        }
        
        return initialData;
    });
    
    // Only show loading if we have absolutely no data
    const [loading, setLoading] = useState(!globalCache[key] && !localStorage.getItem(key));

    const mutate = async () => {
        try {
            const result = await fetcher();
            
            // Only update if data changed (simple stringify comparison to avoid React re-renders)
            const newString = JSON.stringify(result);
            if (JSON.stringify(globalCache[key]) !== newString) {
                globalCache[key] = result;
                localStorage.setItem(key, newString);
                setData(result);
            }
        } catch (error) {
            console.error(`Cache fetch error for ${key}:`, error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return { data, loading, mutate };
}

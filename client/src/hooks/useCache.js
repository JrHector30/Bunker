import { useState, useEffect } from 'react';

// Global cache object for fast memory retrieval
const globalCache = {};

export function useCache(key, fetcher, initialData = []) {
    const getCachedData = () => {
        if (globalCache[key]) return globalCache[key];
        
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
    };

    const [data, setData] = useState(getCachedData);
    const [loading, setLoading] = useState(!globalCache[key] && !localStorage.getItem(key));

    // When the key prop changes, we update our local state to point to the new key's cached data.
    useEffect(() => {
        let isMounted = true;
        
        // Solo cargar del cache, NO refrescar automáticamente
        const cached = getCachedData();
        setData(cached);
        
        // Solo marcar loading si NO hay cache
        if (!globalCache[key] && !localStorage.getItem(key)) {
            setLoading(true);
            
            // Fetch solo si no hay datos en cache
            fetcher()
                .then(result => {
                    if (isMounted) {
                        const newString = JSON.stringify(result);
                        globalCache[key] = result;
                        localStorage.setItem(key, newString);
                        setData(result);
                    }
                })
                .catch(error => console.error(`Cache fetch error for ${key}:`, error))
                .finally(() => { if (isMounted) setLoading(false); });
        } else {
            setLoading(false);
        }

        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    // Manual mutate for forced refreshes (e.g. Refresh button)
    const manualMutate = async () => {
        setLoading(!globalCache[key]);
        try {
            const result = await fetcher();
            const newString = JSON.stringify(result);
            if (JSON.stringify(globalCache[key]) !== newString) {
                globalCache[key] = result;
                localStorage.setItem(key, newString);
            }
            setData(result);
        } catch (error) {
            console.error(`Cache fetch error for ${key}:`, error);
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, mutate: manualMutate };
}

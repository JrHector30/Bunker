import { useState, useEffect, useRef, useCallback } from 'react';

// Global cache object for fast memory retrieval
const globalCache = {};

export function useCache(key, fetcher, initialData = []) {
    const fetcherRef = useRef(fetcher);
    // Siempre actualizar el ref sin re-ejecutar effects
    useEffect(() => { fetcherRef.current = fetcher; });

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
        
        // Cargar inmediatamente del cache
        const cached = getCachedData();
        setData(cached);
        
        // Solo marcar loading si NO hay cache
        const hasCache = !!(globalCache[key] || localStorage.getItem(key));
        if (!hasCache) {
            setLoading(true);
        }
        
        // Siempre refrescar en segundo plano al montar o cambiar la clave para tener datos frescos
        fetcherRef.current()
            .then(result => {
                if (!isMounted) return;
                const newString = JSON.stringify(result);
                globalCache[key] = result;
                localStorage.setItem(key, newString);
                setData(result);
            })
            .catch(error => console.error(`Cache background fetch error for ${key}:`, error))
            .finally(() => { if (isMounted) setLoading(false); });

        return () => { isMounted = false; };
        // SOLO 'key' como dependencia — fetcher está en ref para estabilidad absoluta
    }, [key]);

    const keyRef = useRef(key);
    useEffect(() => { keyRef.current = key; }, [key]);

    // Manual mutate for forced refreshes (e.g. Refresh button)
    const manualMutate = useCallback(async () => {
        const currentKey = keyRef.current;
        setLoading(!globalCache[currentKey]);
        try {
            const result = await fetcherRef.current();
            const newString = JSON.stringify(result);
            if (JSON.stringify(globalCache[currentKey]) !== newString) {
                globalCache[currentKey] = result;
                localStorage.setItem(currentKey, newString);
            }
            setData(result);
        } catch (error) {
            console.error(`Cache fetch error for ${currentKey}:`, error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Retornar siempre la misma referencia de mutate
    return { data, loading, mutate: manualMutate };
}

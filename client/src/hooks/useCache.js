import { useState, useEffect, useRef, useCallback } from 'react';

// Global cache object for fast memory retrieval
const globalCache = {};

// Global locks object to override slow backend tables status
if (!globalCache.locks) {
    globalCache.locks = {};
}

export function setOptimisticLock(tableId, estado) {
    globalCache.locks[tableId] = { estado, timestamp: Date.now() };
}

function applyLocks(key, data) {
    if (key !== 'tables' || !Array.isArray(data)) return data;
    if (!globalCache.locks) return data;
    
    const now = Date.now();
    return data.map(table => {
        const lock = globalCache.locks[table.id];
        // 5 seconds lock
        if (lock && (now - lock.timestamp < 5000)) {
            return { 
                ...table, 
                estado: lock.estado,
                comandas: lock.estado === 'libre' ? [] : (table.comandas && table.comandas.length > 0 ? table.comandas : [{ id: 'temp' }]) 
            };
        }
        return table;
    });
}

export function useCache(key, fetcher, initialData = []) {
    const fetcherRef = useRef(fetcher);
    // Siempre actualizar el ref sin re-ejecutar effects
    useEffect(() => { fetcherRef.current = fetcher; });

    const getCachedData = () => {
        let cached = initialData;
        if (globalCache[key]) {
            cached = globalCache[key];
        } else {
            const local = localStorage.getItem(key);
            if (local) {
                try {
                    cached = JSON.parse(local);
                    globalCache[key] = cached; // Populate memory
                } catch (e) {
                    cached = initialData;
                }
            }
        }
        return applyLocks(key, cached);
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
                const lockedResult = applyLocks(key, result);
                const newString = JSON.stringify(lockedResult);
                globalCache[key] = lockedResult;
                localStorage.setItem(key, newString);
                setData(lockedResult);
            })
            .catch(error => console.error(`Cache background fetch error for ${key}:`, error))
            .finally(() => { if (isMounted) setLoading(false); });

        return () => { isMounted = false; };
        // SOLO 'key' como dependencia — fetcher está en ref para estabilidad absoluta
    }, [key]);

    const keyRef = useRef(key);
    useEffect(() => { keyRef.current = key; }, [key]);

    // Manual mutate for forced refreshes (e.g. Refresh button) or optimistic updates
    const manualMutate = useCallback(async (optimisticData = null) => {
        const currentKey = keyRef.current;
        if (optimisticData !== null) {
            const lockedOptimistic = applyLocks(currentKey, optimisticData);
            globalCache[currentKey] = lockedOptimistic;
            localStorage.setItem(currentKey, JSON.stringify(lockedOptimistic));
            setData(lockedOptimistic);
            return;
        }
        setLoading(!globalCache[currentKey]);
        try {
            const result = await fetcherRef.current();
            const lockedResult = applyLocks(currentKey, result);
            const newString = JSON.stringify(lockedResult);
            if (JSON.stringify(globalCache[currentKey]) !== newString) {
                globalCache[currentKey] = lockedResult;
                localStorage.setItem(currentKey, newString);
            }
            setData(lockedResult);
        } catch (error) {
            console.error(`Cache fetch error for ${currentKey}:`, error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Retornar siempre la misma referencia de mutate
    return { data, loading, mutate: manualMutate };
}

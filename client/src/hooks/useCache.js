import { useState, useEffect, useRef, useCallback } from 'react';
import { logStateChange } from '../utils/auditLogger';

// Global cache object for fast memory retrieval
const globalCache = {};

// Global locks object to override slow backend tables status
if (!globalCache.locks) {
    globalCache.locks = {};
}

export function setOptimisticLock(tableId, estado) {
    globalCache.locks[tableId] = { estado, timestamp: Date.now() };
}

export function useCache(key, fetcher, initialData = []) {
    const fetcherRef = useRef(fetcher);
    // Siempre actualizar el ref sin re-ejecutar effects
    useEffect(() => { fetcherRef.current = fetcher; });

    const keyRef = useRef(key);
    useEffect(() => { keyRef.current = key; }, [key]);

    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Identificador incremental para rastrear el último fetch iniciado y evitar respuestas fuera de orden
    const lastFetchIdRef = useRef(0);
    const lastResolvedFetchIdRef = useRef(0);

    const applyLocks = useCallback((currentKey, data) => {
        if (currentKey !== 'tables' || !Array.isArray(data)) return data;
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
    }, []);

    const getCachedData = useCallback((currentKey) => {
        let cached = initialData;
        if (globalCache[currentKey]) {
            cached = globalCache[currentKey];
        } else {
            const local = localStorage.getItem(currentKey);
            if (local) {
                try {
                    cached = JSON.parse(local);
                    globalCache[currentKey] = cached; // Populate memory
                } catch (e) {
                    cached = initialData;
                }
            }
        }
        return applyLocks(currentKey, cached);
    }, [initialData, applyLocks]);

    const [data, setData] = useState(() => getCachedData(key));
    const [prevKey, setPrevKey] = useState(key);
    const [loading, setLoading] = useState(() => {
        return !globalCache[key] && !localStorage.getItem(key);
    });

    // Sincronización inmediata en fase de renderizado al cambiar la clave de caché
    if (key !== prevKey) {
        setPrevKey(key);
        const cached = getCachedData(key);
        setData(cached);
        const hasCache = !!(globalCache[key] || localStorage.getItem(key));
        setLoading(!hasCache);
    }

    // Instrumentación y auditoría de estado
    const prevDataRef = useRef(data);
    useEffect(() => {
        if (prevDataRef.current !== data) {
            logStateChange(`useCache[${key}]`, 'useCache Hook', prevDataRef.current, data);
            prevDataRef.current = data;
        }
    }, [data, key]);

    useEffect(() => {
        let isMounted = true;
        const fetchId = ++lastFetchIdRef.current;
        
        // Refrescar en segundo plano al cambiar la clave para tener datos frescos
        fetcherRef.current()
            .then(result => {
                if (!isMounted || fetchId <= lastResolvedFetchIdRef.current) return;
                lastResolvedFetchIdRef.current = fetchId;
                const lockedResult = applyLocks(key, result);
                const newString = JSON.stringify(lockedResult);
                globalCache[key] = lockedResult;
                localStorage.setItem(key, newString);
                setData(lockedResult);
            })
            .catch(error => {
                console.error(`Cache background fetch error for ${key}:`, error);
            })
            .finally(() => { 
                if (isMounted && fetchId === lastFetchIdRef.current) setLoading(false); 
            });

        return () => { 
            isMounted = false; 
        };
    }, [key, applyLocks]);

    // Mutación manual para refrescos explícitos o actualizaciones optimistas
    const manualMutate = useCallback(async (optimisticData = null) => {
        const currentKey = keyRef.current;
        if (optimisticData !== null) {
            const lockedOptimistic = applyLocks(currentKey, optimisticData);
            globalCache[currentKey] = lockedOptimistic;
            localStorage.setItem(currentKey, JSON.stringify(lockedOptimistic));
            if (isMountedRef.current && keyRef.current === currentKey) {
                setData(lockedOptimistic);
            }
            return;
        }

        const fetchId = ++lastFetchIdRef.current;

        if (isMountedRef.current && keyRef.current === currentKey) {
            setLoading(!globalCache[currentKey]);
        }

        try {
            const result = await fetcherRef.current();
            const lockedResult = applyLocks(currentKey, result);
            const newString = JSON.stringify(lockedResult);
            
            // Siempre poblar memoria y disco localmente para la clave de origen
            globalCache[currentKey] = lockedResult;
            localStorage.setItem(currentKey, newString);

            // Solo actualizar UI si es la petición más reciente o más nueva que el último resultado procesado
            if (isMountedRef.current && keyRef.current === currentKey && fetchId > lastResolvedFetchIdRef.current) {
                lastResolvedFetchIdRef.current = fetchId;
                setData(lockedResult);
            }
        } catch (error) {
            console.error(`Cache fetch error for ${currentKey}:`, error);
            throw error; // Re-lanzar para que el invocador maneje errores en modo online
        } finally {
            if (isMountedRef.current && keyRef.current === currentKey && fetchId === lastFetchIdRef.current) {
                setLoading(false);
            }
        }
    }, [applyLocks]);

    return { data, loading, mutate: manualMutate };
}

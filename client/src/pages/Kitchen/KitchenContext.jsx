import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useKitchenPolling from './hooks/useKitchenPolling';
import { soundPlayer } from './KitchenSounds';
import { networkStatus, NetworkState, offlineKitchenService } from '../../offline';

const KitchenContext = createContext();

export const KitchenProvider = ({ children }) => {
    const { user } = useAuth();
    const { mode } = useTheme();
    const isDarkMode = mode === 'dark';

    // Global Queue Cache preservation across mounts
    const [queue, setQueue] = useState(() => {
        const saved = window.__globalKitchenQueueCache;
        return saved || [];
    });

    const updateGlobalCache = (newQueue) => {
        window.__globalKitchenQueueCache = newQueue;
        setQueue(newQueue);
    };

    // Preferences & Config States (infrequent updates)
    const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
        const saved = localStorage.getItem('kitchen_sound_enabled');
        return saved ? saved === 'true' : true;
    });

    const [isHeaderExpanded, setIsHeaderExpanded] = useState(() => {
        const saved = localStorage.getItem('kitchen_header_expanded');
        return saved ? saved === 'true' : false;
    });

    const [activeTabletTab, setActiveTabletTab] = useState(() => {
        return localStorage.getItem('kitchen_active_tablet_tab') || 'pendiente';
    });

    const [selectedTable, setSelectedTable] = useState('TODAS');
    const [searchQuery, setSearchQuery] = useState('');
    const [dismissedAlertKeys, setDismissedAlertKeys] = useState([]);
    const [timeOffsets, setTimeOffsets] = useState({});

    // Sync preferences to LocalStorage
    useEffect(() => {
        localStorage.setItem('kitchen_sound_enabled', String(isAudioEnabled));
        soundPlayer.setEnabled(isAudioEnabled);
    }, [isAudioEnabled]);

    useEffect(() => {
        localStorage.setItem('kitchen_header_expanded', String(isHeaderExpanded));
    }, [isHeaderExpanded]);

    useEffect(() => {
        localStorage.setItem('kitchen_active_tablet_tab', activeTabletTab);
    }, [activeTabletTab]);

    // Polling and pending updates
    const pendingUpdates = useRef({});
    const fetchCounter = useRef(0);
    const lastAppliedFetchId = useRef(0);

    const fetchQueue = useCallback(() => {
        fetchCounter.current += 1;
        const currentFetchId = fetchCounter.current;

        if (networkStatus.isOffline()) {
            offlineKitchenService.getQueue()
                .then(data => {
                    if (currentFetchId < lastAppliedFetchId.current) return;
                    lastAppliedFetchId.current = currentFetchId;

                    // Merge in-flight optimistic updates
                    const mergedData = data.map(item => {
                        const pending = pendingUpdates.current[item.id];
                        return pending ? { ...item, ...pending } : item;
                    });
                    updateGlobalCache(mergedData);
                })
                .catch(err => console.error("[KitchenContext] Error leyendo cola local offline:", err));
            return;
        }

        fetch('/api/kitchen/queue')
            .then(res => {
                // Tratar HTTP 500 / !ok igual que error de red → usar fallback offline
                if (!res.ok) {
                    console.warn(`[KitchenContext] Backend respondió ${res.status}. Activando fallback offline.`);
                    networkStatus.setStatus(NetworkState.OFFLINE_CONFIRMED);
                    fetchQueue();
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (!data) return; // Fallback offline ya fue disparado
                if (currentFetchId < lastAppliedFetchId.current) return;
                lastAppliedFetchId.current = currentFetchId;

                // Merge in-flight optimistic updates
                const mergedData = data.map(item => {
                    const pending = pendingUpdates.current[item.id];
                    return pending ? { ...item, ...pending } : item;
                });
                updateGlobalCache(mergedData);
            })
            .catch(err => {
                console.warn("[KitchenContext] Polling online falló (error de red). Conmutando a offline local.");
                networkStatus.setStatus(NetworkState.OFFLINE_CONFIRMED);
                fetchQueue();
            });
    }, []);

    // Start Polling (Visibility API smart polling is managed inside hook)
    useKitchenPolling(fetchQueue, 1500);

    // Initial play sound setup (Autoplay compliance)
    const [hasInteracted, setHasInteracted] = useState(false);
    const triggerFirstInteraction = useCallback(() => {
        if (!hasInteracted) {
            setHasInteracted(true);
            soundPlayer.playStartupSweep();
        }
    }, [hasInteracted]);

    // Audio chime trigger on new pending items
    const prevPendingCountReq = useRef(0);
    const pendingItemsCount = queue.filter(i => i.estado === 'pendiente' || i.estado === 'enviada').length;
    
    useEffect(() => {
        if (pendingItemsCount > prevPendingCountReq.current && isAudioEnabled && hasInteracted) {
            soundPlayer.playNewOrderBell();
        }
        prevPendingCountReq.current = pendingItemsCount;
    }, [pendingItemsCount, isAudioEnabled, hasInteracted]);

    // WebSocket / BroadcastChannel / Cross-tab listener
    useEffect(() => {
        const handleRefresh = () => {
            fetchQueue();
        };
        window.addEventListener('refreshKitchenQueue', handleRefresh);

        let channel = null;
        try {
            channel = new BroadcastChannel('bunker');
            channel.onmessage = (event) => {
                if (event.data === 'refreshKitchenQueue') {
                    fetchQueue();
                }
            };
        } catch (e) {
            console.error(e);
        }

        return () => {
            window.removeEventListener('refreshKitchenQueue', handleRefresh);
            if (channel) channel.close();
        };
    }, [fetchQueue]);

    // Action Dispatcher: PUT /api/orders/details/:id
    const updateItemStatus = useCallback(async (itemId, status, options = {}) => {
        // Trigger lazy sound player instantiation
        triggerFirstInteraction();

        const payload = { estado: status };
        if (status === 'preparando' && !options.preserveCook) {
            payload.cocineroId = user.id;
        }

        // Optimistic State
        const optimisticData = { estado: status };
        if (status === 'preparando' && !options.preserveCook) {
            optimisticData.cocinero = { id: user.id, nombre: user.nombre || 'Yo' };
            optimisticData.cocineroId = user.id;
            soundPlayer.playStartChime();
        } else if (status === 'listo') {
            soundPlayer.playSuccessChime();
        } else if (status === 'pendiente') {
            soundPlayer.playRewindChime();
        } else if (options.preserveCook) {
            soundPlayer.playRewindChime();
        }

        pendingUpdates.current[itemId] = optimisticData;

        // Apply local optimistic update
        updateGlobalCache(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, ...optimisticData };
            }
            return item;
        }));

        if (networkStatus.isOffline()) {
            try {
                await offlineKitchenService.updateItemStatus(itemId, status, {
                    id: user.id,
                    nombre: user.nombre
                });
                delete pendingUpdates.current[itemId];
                fetchQueue();

                // Notificar cambios de cocina locales
                window.dispatchEvent(new CustomEvent('refreshKitchenQueue'));
                window.dispatchEvent(new CustomEvent('refreshTables'));
                try {
                    const channel = new BroadcastChannel('bunker');
                    channel.postMessage('refreshKitchenQueue');
                    channel.postMessage('refreshTables');
                    channel.close();
                } catch (e) {}
            } catch (err) {
                console.error('[KitchenContext] Error al actualizar plato en cocina local:', err);
                delete pendingUpdates.current[itemId];
                fetchQueue();
            }
            return;
        }

        try {
            const res = await fetch(`/api/orders/details/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("HTTP error " + res.status);

            fetchCounter.current += 1;
            const currentFetchId = fetchCounter.current;

            const freshRes = await fetch('/api/kitchen/queue');
            if (freshRes.ok) {
                const freshData = await freshRes.json();
                if (currentFetchId >= lastAppliedFetchId.current) {
                    lastAppliedFetchId.current = currentFetchId;
                    delete pendingUpdates.current[itemId];

                    // Merge and set
                    const mergedData = freshData.map(item => {
                        const pending = pendingUpdates.current[item.id];
                        return pending ? { ...item, ...pending } : item;
                    });
                    updateGlobalCache(mergedData);
                }
            } else {
                delete pendingUpdates.current[itemId];
                fetchQueue();
            }
        } catch (error) {
            console.error("Error updating item, reverting...", error);
            delete pendingUpdates.current[itemId];
            fetchQueue();
        }
    }, [user, fetchQueue, triggerFirstInteraction]);

    const handleAddMinutes = useCallback((id, mins) => {
        triggerFirstInteraction();
        setTimeOffsets(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + mins
        }));
        soundPlayer.playTickChime();
    }, [triggerFirstInteraction]);

    return (
        <KitchenContext.Provider value={{
            queue,
            isAudioEnabled,
            setIsAudioEnabled,
            isHeaderExpanded,
            setIsHeaderExpanded,
            selectedTable,
            setSelectedTable,
            searchQuery,
            setSearchQuery,
            activeTabletTab,
            setActiveTabletTab,
            dismissedAlertKeys,
            setDismissedAlertKeys,
            timeOffsets,
            handleAddMinutes,
            updateItemStatus,
            fetchQueue,
            isDarkMode,
            hasInteracted,
            triggerFirstInteraction
        }}>
            {children}
        </KitchenContext.Provider>
    );
};

export const useKitchen = () => useContext(KitchenContext);

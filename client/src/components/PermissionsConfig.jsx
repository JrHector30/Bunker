import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { Save, Shield } from 'lucide-react';

const PermissionsConfig = () => {
    const { showToast } = useNotification();
    const [permisos, setPermisos] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);

    const modulos = [
        { key: 'mesas', label: '🍽️ Sala / Mesas', description: 'Gestión de mesas y comandas' },
        { key: 'cocina', label: '👨‍🍳 Cocina', description: 'Vista de pedidos y preparación' },
        { key: 'caja', label: '💰 Caja', description: 'Cierre de cuentas y pagos' },
        { key: 'logistica', label: '📦 Logística', description: 'Inventario, insumos y recetas' },
        { key: 'categories', label: '🏷️ Categorías', description: 'Gestión de categorías de platos' },
        { key: 'reportes', label: '📊 Reportes', description: 'Estadísticas y análisis' },
        { key: 'usuarios', label: '👥 Usuarios', description: 'Gestión de empleados' },
    ];

    const roles = ['mozo', 'cocina', 'caja'];

    useEffect(() => {
        fetchPermisos();
    }, []);

    const fetchPermisos = async () => {
        try {
            const res = await fetch('/api/permisos');
            const data = await res.json();
            setPermisos(data);
        } catch (error) {
            console.error("Error fetching permissions:", error);
        }
    };

    const handleToggle = (rol, modulo) => {
        if (rol === 'admin') return; // Admin siempre tiene todo

        setPermisos(prev => {
            const exists = prev.some(p => p.rol === rol && p.modulo === modulo);
            if (exists) {
                return prev.map(p =>
                    p.rol === rol && p.modulo === modulo
                        ? { ...p, habilitado: !p.habilitado }
                        : p
                );
            } else {
                return [...prev, { rol, modulo, habilitado: true }];
            }
        });
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            const promises = permisos
                .filter(p => p.rol !== 'admin') // No guardar cambios para admin
                .map(p =>
                    fetch(`/api/permisos/${p.rol}/${p.modulo}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ habilitado: p.habilitado })
                    })
                );

            await Promise.all(promises);
            showToast('✅ Permisos actualizados correctamente', 'success');
            setHasChanges(false);
        } catch (error) {
            showToast('❌ Error al guardar permisos', 'error');
        }
    };

    const isEnabled = (rol, modulo) => {
        const permiso = permisos.find(p => p.rol === rol && p.modulo === modulo);
        return permiso?.habilitado || false;
    };

    return (
        <div className="glass-panel" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={24} style={{ color: 'var(--primary)' }} />
                    <div>
                        <h2 style={{ margin: 0 }}>Configuración de Permisos</h2>
                        <p className="text-muted" style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}>
                            Habilita o deshabilita módulos para cada rol de usuario
                        </p>
                    </div>
                </div>
                <button
                    className={`glass-button ${hasChanges ? 'primary' : ''}`}
                    onClick={handleSave}
                    disabled={!hasChanges}
                >
                    <Save size={18} /> Guardar Cambios
                </button>
            </div>

            <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                            <th style={{ padding: 15 }}>Módulo</th>
                            {roles.map(rol => (
                                <th key={rol} style={{ padding: 15, textAlign: 'center' }}>
                                    {rol.charAt(0).toUpperCase() + rol.slice(1)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {modulos.map(mod => (
                            <tr key={mod.key} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                                <td style={{ padding: 15 }}>
                                    <div style={{ fontWeight: 'bold' }}>{mod.label}</div>
                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{mod.description}</div>
                                </td>
                                {roles.map(rol => (
                                    <td key={rol} style={{ padding: 15, textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={isEnabled(rol, mod.key)}
                                            onChange={() => handleToggle(rol, mod.key)}
                                            style={{
                                                width: 20,
                                                height: 20,
                                                accentColor: 'var(--primary)',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="text-muted" style={{ marginTop: 20, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                ℹ️ <strong>Nota:</strong> El rol "Admin" siempre tiene acceso completo a todos los módulos.
            </div>
        </div>
    );
};

export default PermissionsConfig;

import React, { useState, useEffect, useRef } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, X, User, Save, Upload, ArrowLeft, Power, CheckCircle, ChevronLeft, ChevronRight, Users, Filter, ArrowUp, ArrowDown, ArrowUpDown, Check } from 'lucide-react';
import { useCache } from '../hooks/useCache';
import CloseButton from '../components/ui/CloseButton';
import SmoothDropdown from '../components/ui/SmoothDropdown';

const UsersView = () => {
    const { showConfirmation } = useConfirmation();
    const { showToast } = useNotification();
    const navigate = useNavigate();

    const currentTenant = (() => {
        try {
            const raw = localStorage.getItem('bunker_current_tenant');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    })();

    const fetcher = () => {
        let url = '/api/users';
        if (currentTenant?.id) {
            url += `?restauranteId=${currentTenant.id}`;
        }
        return fetch(url).then(res => res.json());
    };

    const cacheKey = currentTenant?.id ? `users_tenant_${currentTenant.id}` : 'users';
    const { data: users, loading, mutate: fetchUsers } = useCache(cacheKey, fetcher, []);

    // Search, Filters & Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState('nombre'); // 'nombre' | 'estado' | 'rol'
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
    const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'caja' | 'cocina' | 'mozo'
    const [openHeaderFilter, setOpenHeaderFilter] = useState(null); // 'estado' | 'rol' | null

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 6;

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Close header popovers on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (openHeaderFilter && !e.target.closest('.header-filter-popover')) {
                setOpenHeaderFilter(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openHeaderFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortColumn, sortDirection, statusFilter, roleFilter]);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        usuario: '',
        rol: 'mozo',
        password: '',
        foto: ''
    });
    const [previewImage, setPreviewImage] = useState(null);

    // Email Assignment Modal State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailStep, setEmailStep] = useState(1); // 1: ingresar correo, 2: ingresar código
    const [emailInput, setEmailInput] = useState('');
    const [emailCode, setEmailCode] = useState('');
    const [emailError, setEmailError] = useState('');
    const [emailSuccess, setEmailSuccess] = useState('');

    const handleOpenEmailAssign = () => {
        setEmailInput(editingUser?.correo || '');
        setEmailCode('');
        setEmailStep(1);
        setEmailError('');
        setEmailSuccess('');
        setShowEmailModal(true);
    };

    const handleSendCode = async () => {
        setEmailError('');
        setEmailCode('');
        if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
            return setEmailError('Ingrese un correo válido.');
        }

        try {
            const loggedInUser = JSON.parse(localStorage.getItem('bunker_user'));
            const adminId = loggedInUser?.id;

            const res = await fetch(`/api/users/${editingUser.id}/assign-email/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Id': adminId
                },
                body: JSON.stringify({ correo: emailInput })
            });

            const data = await res.json();
            if (res.ok) {
                setEmailStep(2);
                setEmailSuccess('Código enviado correctamente.');
                setTimeout(() => setEmailSuccess(''), 4000);
            } else {
                setEmailError(data.error || 'Error al enviar código.');
            }
        } catch (err) {
            setEmailError('Error de red al enviar código.');
        }
    };

    const handleVerifyCode = async () => {
        setEmailError('');
        if (emailCode.length !== 6 || !/^\d+$/.test(emailCode)) {
            return setEmailError('El código debe ser de 6 dígitos.');
        }

        try {
            const loggedInUser = JSON.parse(localStorage.getItem('bunker_user'));
            const adminId = loggedInUser?.id;

            const res = await fetch(`/api/users/${editingUser.id}/assign-email/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Id': adminId
                },
                body: JSON.stringify({ correo: emailInput, code: emailCode })
            });

            const data = await res.json();
            if (res.ok) {
                setEmailSuccess('Correo asociado correctamente.');
                setEditingUser(prev => ({ ...prev, correo: emailInput }));
                fetchUsers();
                setTimeout(() => {
                    setShowEmailModal(false);
                }, 1500);
            } else {
                setEmailError(data.error || 'El código ingresado no es correcto.');
            }
        } catch (err) {
            setEmailError('Error de red al verificar código.');
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                nombre: user.nombre,
                usuario: user.usuario || '',
                rol: user.rol,
                password: '',
                foto: user.foto || ''
            });
            setPreviewImage(user.foto ? user.foto : null);
        } else {
            setEditingUser(null);
            setFormData({ nombre: '', usuario: '', rol: 'mozo', password: '', foto: '' });
            setPreviewImage(null);
        }
        setShowModal(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            showToast('La imagen debe ser de 15MB como máximo', 'error');
            return;
        }

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setPreviewImage(reader.result);
        reader.readAsDataURL(file);

        // Upload
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/upload?type=user', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) {
                showToast('La imagen debe ser de 15MB como máximo', 'error');
                return;
            }
            const data = await res.json();
            if (data.url) {
                setFormData(prev => ({ ...prev, foto: data.url }));
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            showToast('La imagen debe ser de 15MB como máximo', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingUser
                ? `/api/users/${editingUser.id}`
                : '/api/users';

            const method = editingUser ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                ...(!editingUser && currentTenant?.id ? { restauranteId: currentTenant.id } : {})
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Usuario guardado exitosamente', 'success');
                fetchUsers();
                setShowModal(false);
            } else {
                const err = await res.json();
                showToast('Error: ' + err.error, 'error');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const adminCount = users.filter(u => u.rol === 'admin').length;
    const isSoleAdmin = editingUser && editingUser.rol === 'admin' && adminCount <= 1;

    const handleDelete = async (id) => {
        const userToDelete = users.find(u => u.id === id);
        if (userToDelete && userToDelete.rol === 'admin') {
            showToast('No es posible eliminar el perfil de un Administrador', 'error');
            return;
        }

        if (!await showConfirmation(`¿Seguro de eliminar al usuario "${userToDelete?.nombre || ''}"?`, { type: 'danger' })) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                showToast(err.error || 'No se pudo eliminar el usuario', 'error');
                return;
            }
            showToast('Usuario eliminado correctamente', 'success');
            fetchUsers();
        } catch (error) {
            console.error(error);
        }
    };

    const handleToggleStatus = async (user) => {
        if (user.rol === 'admin') {
            showToast('No es posible suspender el perfil de un Administrador', 'error');
            return;
        }

        const isCurrentlyActive = user.activo !== false;
        const newStatus = !isCurrentlyActive;
        const actionText = newStatus ? 'activar' : 'suspender';

        const confirmed = await showConfirmation(
            `¿Deseas ${actionText} a "${user.nombre}"? ${!newStatus ? 'El usuario quedará Inactivo y no aparecerá en el inicio de sesión.' : 'El usuario volverá a estar Activo en el sistema.'}`,
            { type: newStatus ? 'info' : 'warning' }
        );
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: newStatus })
            });

            if (res.ok) {
                showToast(`Usuario ${newStatus ? 'activado' : 'suspendido'} exitosamente`, 'success');
                fetchUsers();
            } else {
                const err = await res.json();
                showToast(err.error || `Error al ${actionText} usuario`, 'error');
            }
        } catch (error) {
            console.error(error);
            showToast(`Error de red al ${actionText} usuario`, 'error');
        }
    };

    const getUserActions = (user) => {
        const isAdmin = user.rol === 'admin';
        const isSuspended = user.activo === false;

        // Los administradores no pueden tener la acción de eliminar su perfil ni tampoco suspenderlo
        if (isAdmin) {
            return [
                { id: 'editar', label: 'Editar', icon: Edit }
            ];
        }

        return [
            { id: 'editar', label: 'Editar', icon: Edit },
            { 
                id: 'toggle-status', 
                label: isSuspended ? 'Activar' : 'Suspender', 
                icon: Power 
            },
            { id: 'borrar', label: 'Eliminar', icon: Trash2 }
        ];
    };

    const handleUserAction = (actionId, user) => {
        if (actionId === 'editar') {
            handleOpenModal(user);
        } else if (actionId === 'toggle-status') {
            handleToggleStatus(user);
        } else if (actionId === 'borrar') {
            handleDelete(user.id);
        }
    };

    const filteredUsers = (users || [])
        .filter(u => {
            const matchesSearch =
                !searchTerm ||
                (u.nombre && u.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (u.usuario && u.usuario.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (u.correo && u.correo.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!matchesSearch) return false;

            if (statusFilter === 'active' && u.activo === false) return false;
            if (statusFilter === 'inactive' && u.activo !== false) return false;

            if (roleFilter !== 'all' && u.rol !== roleFilter) return false;

            return true;
        })
        .sort((a, b) => {
            if (!sortColumn) return 0;
            let valA = '';
            let valB = '';

            if (sortColumn === 'nombre') {
                valA = a.nombre || '';
                valB = b.nombre || '';
            } else if (sortColumn === 'estado') {
                valA = a.activo !== false ? 'Activo' : 'Inactivo';
                valB = b.activo !== false ? 'Activo' : 'Inactivo';
            } else if (sortColumn === 'rol') {
                valA = a.rol || '';
                valB = b.rol || '';
            }

            const cmp = valA.localeCompare(valB, 'es', { sensitivity: 'base' });
            return sortDirection === 'asc' ? cmp : -cmp;
        });

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
            {/* Top Bar Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        className="glass-button p-2.5 rounded-xl hover:bg-white/10 transition-colors" 
                        onClick={() => navigate('/')} 
                        title="Volver"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--text-main)]">
                        <Users className="size-5" />
                    </div>
                    <div>
                        <h1 className="font-heading text-lg font-bold tracking-tight text-[var(--text-main)]">
                            Gestión de Usuarios
                        </h1>
                        <p className="text-xs text-[var(--text-muted)]">
                            {users.length} {users.length === 1 ? 'miembro registrado' : 'miembros registrados'} en este local
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative flex items-center">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                            <Search size={15} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar usuarios..."
                            className="h-9 w-48 sm:w-64 !pl-9 pr-8 text-xs rounded-xl border transition-colors bg-[var(--input-bg)] text-[var(--input-text)] border-[var(--glass-border)] focus:outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                                title="Limpiar búsqueda"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Nuevo Usuario Button */}
                    <button 
                        type="button"
                        className="glass-button primary flex items-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-xl"
                        onClick={() => handleOpenModal()}
                    >
                        <Plus size={16} /> Nuevo Usuario
                    </button>
                </div>
            </div>

            {/* Active Filters Pill Bar (if any filter is on) */}
            {(statusFilter !== 'all' || roleFilter !== 'all' || searchTerm) && (
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider">Filtros:</span>
                    {statusFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[var(--text-main)] font-medium">
                            Estado: <strong>{statusFilter === 'active' ? 'Activos' : 'Inactivos'}</strong>
                            <button 
                                type="button" 
                                onClick={() => setStatusFilter('all')} 
                                className="hover:text-red-400 ml-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {roleFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[var(--text-main)] font-medium">
                            Rol: <strong className="capitalize">{roleFilter}</strong>
                            <button 
                                type="button" 
                                onClick={() => setRoleFilter('all')} 
                                className="hover:text-red-400 ml-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    {searchTerm && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[var(--text-main)] font-medium">
                            Texto: <strong>"{searchTerm}"</strong>
                            <button 
                                type="button" 
                                onClick={() => setSearchTerm('')} 
                                className="hover:text-red-400 ml-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => { setStatusFilter('all'); setRoleFilter('all'); setSearchTerm(''); }}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] underline ml-1 cursor-pointer"
                    >
                        Limpiar todos
                    </button>
                </div>
            )}

            {/* Table Card */}
            <div className="glass-panel overflow-visible p-0 rounded-2xl border" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="overflow-x-auto rounded-2xl">
                    <table className="w-full border-collapse">
                        <thead className="relative select-none">
                            <tr 
                                className="text-xs font-bold uppercase tracking-wider text-on-primary"
                                style={{ 
                                    background: 'var(--primary)', 
                                    color: '#ffffff', 
                                    borderBottom: '1px solid var(--table-row-border)' 
                                }}
                            >
                                {/* 1. Columna Miembros */}
                                <th className="py-3.5 px-5 text-left font-semibold first:rounded-tl-2xl">
                                    <button
                                        type="button"
                                        onClick={() => handleSort('nombre')}
                                        className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity uppercase tracking-wider font-semibold cursor-pointer"
                                        title="Ordenar por Miembro"
                                    >
                                        <span>Miembros</span>
                                        {sortColumn === 'nombre' ? (
                                            sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                        ) : (
                                            <ArrowUpDown size={14} className="opacity-60" />
                                        )}
                                    </button>
                                </th>

                                {/* 2. Columna Estado */}
                                <th className="py-3.5 px-4 !text-center font-semibold relative">
                                    <div className="inline-flex items-center justify-center gap-1.5 header-filter-popover relative">
                                        <button
                                            type="button"
                                            onClick={() => handleSort('estado')}
                                            className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity uppercase tracking-wider font-semibold cursor-pointer"
                                            title="Ordenar por Estado"
                                        >
                                            <span>Estado</span>
                                            {sortColumn === 'estado' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenHeaderFilter(openHeaderFilter === 'estado' ? null : 'estado');
                                            }}
                                            className={`p-1 rounded-md transition-colors cursor-pointer ${statusFilter !== 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'hover:bg-white/20 text-white'}`}
                                            title="Filtrar por Estado"
                                        >
                                            <Filter size={13} />
                                        </button>

                                        {openHeaderFilter === 'estado' && (
                                            <div 
                                                className="smooth-dropdown-bg absolute top-full left-1/2 -translate-x-1/2 mt-2 w-36 rounded-xl border shadow-2xl p-1.5 z-50 text-xs normal-case font-normal"
                                                style={{ borderColor: 'var(--glass-border)' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => { setStatusFilter('all'); setOpenHeaderFilter(null); }}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-white/10 font-bold text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
                                                >
                                                    <span>Todos</span>
                                                    {statusFilter === 'all' && <Check size={13} />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setStatusFilter('active'); setOpenHeaderFilter(null); }}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${statusFilter === 'active' ? 'bg-white/10 font-bold text-emerald-400' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
                                                >
                                                    <span>Activos</span>
                                                    {statusFilter === 'active' && <Check size={13} />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setStatusFilter('inactive'); setOpenHeaderFilter(null); }}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${statusFilter === 'inactive' ? 'bg-white/10 font-bold text-zinc-300' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
                                                >
                                                    <span>Inactivos</span>
                                                    {statusFilter === 'inactive' && <Check size={13} />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </th>

                                {/* 3. Columna Rol */}
                                <th className="py-3.5 px-4 !text-center font-semibold relative">
                                    <div className="inline-flex items-center justify-center gap-1.5 header-filter-popover relative">
                                        <button
                                            type="button"
                                            onClick={() => handleSort('rol')}
                                            className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity uppercase tracking-wider font-semibold cursor-pointer"
                                            title="Ordenar por Rol"
                                        >
                                            <span>Rol</span>
                                            {sortColumn === 'rol' && (
                                                sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenHeaderFilter(openHeaderFilter === 'rol' ? null : 'rol');
                                            }}
                                            className={`p-1 rounded-md transition-colors cursor-pointer ${roleFilter !== 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'hover:bg-white/20 text-white'}`}
                                            title="Filtrar por Rol"
                                        >
                                            <Filter size={13} />
                                        </button>

                                        {openHeaderFilter === 'rol' && (
                                            <div 
                                                className="smooth-dropdown-bg absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 rounded-xl border shadow-2xl p-1.5 z-50 text-xs normal-case font-normal"
                                                style={{ borderColor: 'var(--glass-border)' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {[
                                                    { id: 'all', label: 'Todos los roles' },
                                                    { id: 'admin', label: 'Administrador' },
                                                    { id: 'caja', label: 'Caja' },
                                                    { id: 'cocina', label: 'Cocina' },
                                                    { id: 'mozo', label: 'Mozo' },
                                                ].map((r) => (
                                                    <button
                                                        key={r.id}
                                                        type="button"
                                                        onClick={() => { setRoleFilter(r.id); setOpenHeaderFilter(null); }}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${roleFilter === r.id ? 'bg-white/10 font-bold text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
                                                    >
                                                        <span>{r.label}</span>
                                                        {roleFilter === r.id && <Check size={13} />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </th>

                                {/* 4. Columna Acción */}
                                <th className="py-3.5 px-5 !text-center font-semibold w-24 last:rounded-tr-2xl">
                                    Acción
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-xs" style={{ borderColor: 'var(--table-row-border)' }}>
                            {paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-sm text-[var(--text-muted)]">
                                        {searchTerm ? 'No se encontraron usuarios coincidentes.' : 'No hay usuarios registrados o cargando...'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user, index) => {
                                    const isActive = user.activo !== false;
                                    const initial = user.nombre ? user.nombre.charAt(0).toUpperCase() : '?';

                                    return (
                                        <tr
                                            key={user.id}
                                            className="transition-colors hover:bg-white/[0.03]"
                                            style={{ borderBottom: '1px solid var(--table-row-border)' }}
                                        >
                                            {/* 1. Columna Miembros */}
                                            <td className="py-3 px-5">
                                                <div className="flex items-center gap-3">
                                                    {user.foto ? (
                                                        <img
                                                            src={user.foto}
                                                            alt={user.nombre}
                                                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/10"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-white/10 text-[var(--text-main)] border border-white/10">
                                                            {initial}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-semibold block truncate text-sm text-[var(--text-main)]">
                                                            {user.nombre}
                                                        </p>
                                                        <p className="text-xs text-[var(--text-muted)] font-mono block truncate">
                                                            @{user.usuario}{user.correo ? ` • ${user.correo}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 2. Columna Estado */}
                                            <td className="py-3 px-4 !text-center">
                                                {isActive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        Activo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                                        Inactivo
                                                    </span>
                                                )}
                                            </td>

                                            {/* 3. Columna Rol */}
                                            <td className="py-3 px-4 !text-center">
                                                <span
                                                    className="inline-block px-3 py-1 rounded-lg text-xs font-semibold capitalize"
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        color: user.rol === 'admin' ? 'var(--text-main)' : 'var(--text-muted)',
                                                        fontWeight: user.rol === 'admin' ? '700' : '500'
                                                    }}
                                                >
                                                    {user.rol === 'admin' ? 'Administrador' : (user.rol ? user.rol.charAt(0).toUpperCase() + user.rol.slice(1) : '-')}
                                                </span>
                                            </td>

                                            {/* 4. Columna Acción */}
                                            <td className="py-3 px-5 !text-center relative" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center items-center h-10">
                                                    <SmoothDropdown
                                                        id={user.id}
                                                        dropUp={index >= Math.max(1, paginatedUsers.length - 2)}
                                                        items={getUserActions(user)}
                                                        onAction={(actionId) => handleUserAction(actionId, user)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination */}
                <div
                    className="flex items-center justify-between gap-4 px-5 py-3 border-t text-xs text-[var(--text-muted)]"
                    style={{ borderColor: 'var(--table-row-border)', background: 'rgba(0, 0, 0, 0.06)' }}
                >
                    <p>
                        <span className="font-semibold text-[var(--text-main)]">{filteredUsers.length}</span> {filteredUsers.length === 1 ? 'Usuario' : 'Usuarios'}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="glass-button p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Página anterior"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-2 text-xs font-mono">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="glass-button p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Página siguiente"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>


            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
                        <div className="modal-header">
                            <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                            <CloseButton onClick={() => setShowModal(false)} className="scale-90" />
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>

                            {/* Photo Upload */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.2)' }}>
                                    {previewImage ? (
                                        <img src={previewImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={40} className="text-muted" />
                                    )}
                                </div>
                                <label className="glass-button" style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
                                    <Upload size={14} style={{ marginRight: 5 }} /> Subir Foto
                                    <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Nombre Completo</label>
                                    <input type="text" className="glass-input" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                                </div>
                                <div>
                                    <label>Usuario (Login)</label>
                                    <input type="text" className="glass-input" required value={formData.usuario} onChange={e => setFormData({ ...formData, usuario: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Rol</label>
                                    <select 
                                        className="glass-input" 
                                        value={formData.rol} 
                                        onChange={e => setFormData({ ...formData, rol: e.target.value })}
                                        disabled={isSoleAdmin}
                                        style={isSoleAdmin ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                                    >
                                        <option value="mozo">Mozo</option>
                                        <option value="cocina">Cocina</option>
                                        <option value="caja">Caja</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    {isSoleAdmin && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                                            🔒 Único Administrador (no se puede cambiar el rol)
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <label>Contraseña</label>
                                    <input
                                        type="text"
                                        className="glass-input"
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, ''); // solo números
                                            if (val.length <= 6) {
                                                setFormData({ ...formData, password: val });
                                            }
                                        }}
                                        placeholder={editingUser ? "•••••• (Vacío para mantener)" : "6 dígitos numéricos"}
                                    />
                                </div>
                            </div>

                            {/* Sección Asignar Correo para admin */}
                            {editingUser && formData.rol === 'admin' && (
                                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#ccc' }}>
                                            {editingUser.correo ? `Correo: ${editingUser.correo}` : 'Sin correo asociado'}
                                        </span>
                                        <button
                                            type="button"
                                            className="glass-button"
                                            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                            onClick={handleOpenEmailAssign}
                                        >
                                            {editingUser.correo ? 'Modificar Correo' : 'Asignar Correo'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="glass-button primary" style={{ marginTop: 20, height: 50, fontSize: '1.1rem' }}>
                                <Save size={20} style={{ marginRight: 10 }} /> Guardar Usuario
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Secundario de Asociación de Correo */}
            {showEmailModal && (
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowEmailModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
                        <div className="modal-header">
                            <h2>Asociar Correo</h2>
                            <CloseButton onClick={() => setShowEmailModal(false)} className="scale-90" />
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {emailError && <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{emailError}</div>}
                            {emailSuccess && <div style={{ color: 'var(--success)', fontSize: '0.9rem' }}>{emailSuccess}</div>}

                            {emailStep === 1 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <label>Correo electrónico</label>
                                        <input
                                            type="email"
                                            className="glass-input"
                                            placeholder="admin@bunker.com"
                                            value={emailInput}
                                            onChange={e => setEmailInput(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="glass-button primary"
                                        style={{ height: 44 }}
                                        onClick={handleSendCode}
                                    >
                                        Enviar código
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                                        Código enviado a: <strong>{emailInput}</strong>
                                    </div>
                                    <div>
                                        <label>Ingresa el código enviado a tu correo</label>
                                        <input
                                            type="text"
                                            className="glass-input"
                                            maxLength={6}
                                            placeholder="------"
                                            style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px' }}
                                            value={emailCode}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 6) setEmailCode(val);
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button
                                            type="button"
                                            className="glass-button"
                                            style={{ flex: 1, height: 44 }}
                                            onClick={() => setEmailStep(1)}
                                        >
                                            Atrás
                                        </button>
                                        <button
                                            type="button"
                                            className="glass-button primary"
                                            style={{ flex: 1, height: 44 }}
                                            onClick={handleVerifyCode}
                                        >
                                            Confirmar
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        className="glass-button"
                                        style={{ fontSize: '0.85rem', padding: '10px', marginTop: 5, width: '100%', borderColor: 'rgba(255,255,255,0.05)' }}
                                        onClick={handleSendCode}
                                    >
                                        Reenviar código
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UsersView;

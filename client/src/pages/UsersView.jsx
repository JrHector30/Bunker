import React, { useState, useEffect, useRef } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, X, User, Save, Upload, Power, CheckCircle, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Users, Filter, ArrowUp, ArrowDown, ChevronsUpDown, Check, Shield, ChevronDown } from 'lucide-react';
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
        <div className="p-3.5 sm:p-6 max-w-6xl mx-auto w-full">
            {/* Header Mobile (md:hidden) */}
            <header className="md:hidden space-y-3 mb-4">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 mt-0.5 shadow-2xs">
                        <Users className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                            Gestión de Usuarios
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                            {users.length} {users.length === 1 ? 'miembro registrado' : 'miembros registrados'} en este local
                        </p>
                    </div>
                </div>

                {/* Buscador largo y completo */}
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Buscar usuarios..."
                        className="w-full min-h-[42px] pl-10 pr-9 text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 shadow-2xs"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Botón Nuevo Usuario debajo del buscador */}
                <button
                    type="button"
                    onClick={() => handleOpenModal()}
                    className="min-h-[42px] w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-[13px] font-bold rounded-xl text-white shadow-[0_6px_16px_-4px_rgba(242,101,34,0.45)] active:scale-95 transition-all cursor-pointer border-0"
                    style={{ backgroundColor: 'var(--primary, #F26522)' }}
                >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Usuario</span>
                </button>

                {/* Filtros debajo del botón de Nuevo Usuario */}
                <div className="space-y-2 pt-0.5">
                    <div className="relative">
                        <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full min-h-[42px] pl-10 pr-9 text-xs font-semibold rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 shadow-2xs cursor-pointer"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="active">Activo</option>
                            <option value="inactive">Inactivo</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full min-h-[42px] pl-10 pr-9 text-xs font-semibold rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 shadow-2xs cursor-pointer"
                        >
                            <option value="all">Todos los roles</option>
                            <option value="admin">Administrador</option>
                            <option value="caja">Caja</option>
                            <option value="cocina">Cocina</option>
                            <option value="mozo">Mozo</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            </header>

            {/* Top Bar Header Desktop (hidden md:flex) */}
            <div className="hidden md:flex mb-6 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
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

            {/* Active Filters Pill Bar Desktop (hidden md:flex) */}
            {(statusFilter !== 'all' || roleFilter !== 'all' || searchTerm) && (
                <div className="hidden md:flex mb-4 flex-wrap items-center gap-2 text-xs">
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

            {/* Table Card Desktop (hidden md:block) */}
            <div className="hidden md:block glass-panel overflow-visible p-0 rounded-2xl border" style={{ borderColor: 'var(--glass-border)' }}>
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
                                <th 
                                    className="py-2.5 px-5 text-left font-semibold first:rounded-tl-2xl cursor-pointer select-none"
                                    onClick={() => handleSort('nombre')}
                                    title="Ordenar por Miembro"
                                >
                                    <div className="inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity uppercase tracking-wider font-semibold">
                                        <span>Miembros</span>
                                        {sortColumn === 'nombre' ? (
                                            sortDirection === 'asc' ? <ArrowUp size={13} className="text-white" /> : <ArrowDown size={13} className="text-white" />
                                        ) : (
                                            <ChevronsUpDown size={13} className="text-white opacity-40" />
                                        )}
                                    </div>
                                </th>

                                {/* 2. Columna Estado */}
                                <th className="py-2.5 px-4 !text-center font-semibold relative">
                                    <div className="inline-flex items-center justify-center gap-2 header-filter-popover relative">
                                        <div
                                            onClick={() => handleSort('estado')}
                                            className="inline-flex items-center gap-1 hover:opacity-90 transition-opacity uppercase tracking-wider font-semibold cursor-pointer select-none"
                                            title="Ordenar por Estado"
                                        >
                                            <span>Estado</span>
                                            {sortColumn === 'estado' ? (
                                                sortDirection === 'asc' ? <ArrowUp size={13} className="text-white" /> : <ArrowDown size={13} className="text-white" />
                                            ) : (
                                                <ChevronsUpDown size={13} className="text-white opacity-40" />
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenHeaderFilter(openHeaderFilter === 'estado' ? null : 'estado');
                                            }}
                                            className={`p-1 rounded-md transition-all cursor-pointer border bg-transparent flex items-center justify-center outline-none ${
                                                statusFilter !== 'all' 
                                                    ? 'border-white bg-white/25 text-white shadow-xs' 
                                                    : 'border-white/40 text-white hover:border-white hover:bg-white/10'
                                            }`}
                                            title="Filtrar por Estado"
                                        >
                                            <Filter size={12} />
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
                                <th className="py-2.5 px-4 !text-center font-semibold relative">
                                    <div className="inline-flex items-center justify-center gap-2 header-filter-popover relative">
                                        <div
                                            onClick={() => handleSort('rol')}
                                            className="inline-flex items-center gap-1 hover:opacity-90 transition-opacity uppercase tracking-wider font-semibold cursor-pointer select-none"
                                            title="Ordenar por Rol"
                                        >
                                            <span>Rol</span>
                                            {sortColumn === 'rol' ? (
                                                sortDirection === 'asc' ? <ArrowUp size={13} className="text-white" /> : <ArrowDown size={13} className="text-white" />
                                            ) : (
                                                <ChevronsUpDown size={13} className="text-white opacity-40" />
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenHeaderFilter(openHeaderFilter === 'rol' ? null : 'rol');
                                            }}
                                            className={`p-1 rounded-md transition-all cursor-pointer border bg-transparent flex items-center justify-center outline-none ${
                                                roleFilter !== 'all' 
                                                    ? 'border-white bg-white/25 text-white shadow-xs' 
                                                    : 'border-white/40 text-white hover:border-white hover:bg-white/10'
                                            }`}
                                            title="Filtrar por Rol"
                                        >
                                            <Filter size={12} />
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
                                <th className="py-2.5 px-5 !text-center font-semibold w-24 last:rounded-tr-2xl">
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
                                            <td className="py-2 px-5">
                                                <div className="flex items-center gap-2.5">
                                                    {user.foto ? (
                                                        <img
                                                            src={user.foto}
                                                            alt={user.nombre}
                                                            className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10"
                                                        />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 bg-white/10 text-[var(--text-main)] border border-white/10">
                                                            {initial}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-semibold block truncate text-xs text-[var(--text-main)] leading-tight">
                                                            {user.nombre}
                                                        </p>
                                                        <p className="text-[11px] text-[var(--text-muted)] font-mono block truncate leading-tight mt-0.5">
                                                            @{user.usuario}{user.correo ? ` • ${user.correo}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 2. Columna Estado */}
                                            <td className="py-2 px-4 !text-center">
                                                {isActive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        Activo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                                        Inactivo
                                                    </span>
                                                )}
                                            </td>

                                            {/* 3. Columna Rol */}
                                            <td className="py-2 px-4 !text-center">
                                                <span
                                                    className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold capitalize"
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
                                            <td className="py-2 px-5 !text-center relative" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center items-center">
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

                {/* Footer Pagination (Idéntica a Arqueo de Caja) */}
                <div
                    className="p-3 bg-transparent relative flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)] font-sans border-t"
                    style={{ borderColor: 'var(--table-row-border)' }}
                >
                    <span className="font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                        Total: <strong className="text-slate-800 dark:text-slate-100 font-bold">{filteredUsers.length}</strong> {filteredUsers.length === 1 ? 'Usuario' : 'Usuarios'}
                    </span>
                    <div className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            title="Ir al inicio"
                            aria-label="Primera página"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs"
                        >
                            <ChevronFirst className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            title="Página anterior"
                            aria-label="Página anterior"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 px-2 select-none whitespace-nowrap text-xs tabular-nums">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            title="Página siguiente"
                            aria-label="Página siguiente"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage >= totalPages}
                            title="Ir al final"
                            aria-label="Última página"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs"
                        >
                            <ChevronLast className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de Tarjetas Mobile (md:hidden) */}
            <section className="md:hidden space-y-2.5 mb-4">
                {paginatedUsers.length === 0 ? (
                    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 py-10 text-center text-xs text-slate-400">
                        {searchTerm ? 'No se encontraron usuarios coincidentes.' : 'No hay usuarios registrados con esos filtros.'}
                    </div>
                ) : (
                    paginatedUsers.map((user, index) => {
                        const isActive = user.activo !== false;
                        const initial = user.nombre ? user.nombre.charAt(0).toUpperCase() : '?';

                        return (
                            <div
                                key={user.id}
                                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs space-y-3 relative"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {user.foto ? (
                                            <img
                                                src={user.foto}
                                                alt={user.nombre}
                                                className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                                            />
                                        ) : (
                                            <div className="w-11 h-11 rounded-full bg-slate-800 dark:bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0 border border-slate-700">
                                                {initial}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {user.nombre}
                                            </h2>
                                            <p className="text-[11.5px] text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5">
                                                @{user.usuario}{user.correo ? ` • ${user.correo}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <SmoothDropdown
                                            id={user.id}
                                            dropUp={index >= Math.max(1, paginatedUsers.length - 2)}
                                            items={getUserActions(user)}
                                            onAction={(actionId) => handleUserAction(actionId, user)}
                                        />
                                    </div>
                                </div>

                                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                    <span className={`text-xs ${user.rol === 'admin' ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-600 dark:text-slate-300'}`}>
                                        Rol: {user.rol === 'admin' ? 'Administrador' : (user.rol ? user.rol.charAt(0).toUpperCase() + user.rol.slice(1) : '-')}
                                    </span>

                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                            isActive
                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                        {isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>

            {/* Paginación Mobile (md:hidden) */}
            {totalPages > 0 && (
                <div
                    className="md:hidden p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 shadow-2xs"
                >
                    <span className="font-medium text-slate-600 dark:text-slate-300 tabular-nums text-[11px]">
                        Total: <strong className="text-slate-800 dark:text-slate-100 font-bold">{filteredUsers.length}</strong>
                    </span>

                    <div className="flex items-center justify-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            title="Ir al inicio"
                            aria-label="Primera página"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs active:scale-95"
                        >
                            <ChevronFirst className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            title="Página anterior"
                            aria-label="Página anterior"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs active:scale-95"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 px-1 select-none whitespace-nowrap text-xs tabular-nums">
                            {currentPage}/{totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            title="Página siguiente"
                            aria-label="Página siguiente"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs active:scale-95"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage >= totalPages}
                            title="Ir al final"
                            aria-label="Última página"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs active:scale-95"
                        >
                            <ChevronLast className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content w-full max-w-lg mx-3 sm:mx-auto max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label>Nombre Completo</label>
                                    <input type="text" className="glass-input" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                                </div>
                                <div>
                                    <label>Usuario (Login)</label>
                                    <input type="text" className="glass-input" required value={formData.usuario} onChange={e => setFormData({ ...formData, usuario: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                    <div className="modal-content w-full max-w-md mx-3 sm:mx-auto max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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

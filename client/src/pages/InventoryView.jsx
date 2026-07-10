import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash, Save, X, Search, Image as ImageIcon, Sparkles, ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeft, Package, Beaker, BookOpen, AlertTriangle, History, ClipboardCheck, Download, Upload, Check, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownRangeDatePicker } from '../components/DropdownRangeDatePicker';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../hooks/useCache';
import CategorizedCombobox from '../components/CategorizedCombobox';
import SimpleCombobox from '../components/SimpleCombobox';
import DeleteButton from '../components/ui/DeleteButton';
import EditButton from '../components/ui/EditButton';
import CloseButton from '../components/ui/CloseButton';
import { motion } from 'motion/react';
import { safeRecordProductShadow } from '../offline';

const InventoryView = () => {
    const { showConfirmation } = useConfirmation();
    const { showToast } = useNotification();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab') || 'platos';
    const [activeTab, setActiveTab] = useState(tabParam);

    // Sync tab state when URL search params change
    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
    };

    // Data States from Cache
    const fetchProductsAPI = () => fetch('/api/products').then(res => res.json());
    const fetchCategoriesAPI = () => fetch('/api/categories').then(res => res.json());
    const fetchInsumosAPI = () => fetch('/api/insumos').then(res => res.json());
    const fetchKardexAPI = () => fetch('/api/kardex').then(res => res.json());

    const { data: products, mutate: refetchProducts } = useCache('products', fetchProductsAPI, []);
    const { data: categories, mutate: refetchCategories } = useCache('categories', fetchCategoriesAPI, []);
    const { data: insumos, mutate: refetchInsumos } = useCache('insumos', fetchInsumosAPI, []);
    const { data: kardex, mutate: refetchKardex } = useCache('kardex', fetchKardexAPI, []);

    // UI States
    const [formError, setFormError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });
    const [kardexDateFilterRange, setKardexDateFilterRange] = useState(undefined);
    const [kardexCurrentPage, setKardexCurrentPage] = useState(1);

    const fetchData = () => {
        refetchProducts();
        refetchCategories();
    };

    const fetchInsumos = () => {
        refetchInsumos();
        window.dispatchEvent(new Event('insumos-updated'));
    };

    const fetchKardex = () => {
        refetchKardex();
    };

    useEffect(() => {
        if (categories.length > 0 && formData.categoriaId === '') {
            setFormData(prev => ({ ...prev, categoriaId: categories[0].id }));
        }
    }, [categories]);

    useEffect(() => {
        fetchData();
        fetchInsumos();
        if (activeTab === 'kardex') fetchKardex();
    }, [activeTab]);

    // --- SORTING LOGIC ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            setSortConfig({ key: '', direction: '' });
            return;
        }
        setSortConfig({ key, direction });
    };

    const sortedProducts = [...products].sort((a, b) => {
        if (!sortConfig.key) return 0;
        let valA = sortConfig.key === 'categoria' ? a.categoria?.nombre || '' : a[sortConfig.key];
        let valB = sortConfig.key === 'categoria' ? b.categoria?.nombre || '' : b[sortConfig.key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortHeader = ({ label, sortKey }) => {
        const isActive = sortConfig.key === sortKey;
        const Icon = isActive ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
        return (
            <th style={{ padding: 15, cursor: 'pointer', userSelect: 'none', color: isActive ? 'var(--primary)' : 'inherit' }} onClick={() => handleSort(sortKey)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                    {label} <Icon size={14} style={{ opacity: isActive ? 1 : 0.3 }} />
                </div>
            </th>
        );
    };

    // --- TAB 1: PLATOS (Original Inventory Logic) ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [filterCategory, setFilterCategory] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '', descripcion: '', precio: '', categoriaId: '', activo: true, imageFile: null, imagePreview: null
    });

    // Autocomplete & Mode Switch states
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [debouncedNombre, setDebouncedNombre] = useState('');
    const [modalMode, setModalMode] = useState('create');

    const normalizeText = (text) => {
        if (!text) return '';
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/\s+/g, ' ') // collapse multiple spaces
            .trim()
            .toLowerCase();
    };

    // Debounce Name input by 200ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedNombre(formData.nombre);
        }, 200);
        return () => clearTimeout(timer);
    }, [formData.nombre]);

    // Priority-based sorting (starts with vs contains) & name/code scalable search
    const suggestions = useMemo(() => {
        const query = normalizeText(debouncedNombre);
        if (query.length < 2) return [];

        const startsWithMatches = [];
        const containsMatches = [];

        products.forEach(p => {
            const normalizedName = normalizeText(p.nombre);
            const normalizedCode = p.codigoInterno ? normalizeText(p.codigoInterno) : '';

            const nameStartsWith = normalizedName.startsWith(query);
            const codeStartsWith = normalizedCode.startsWith(query);
            const nameContains = normalizedName.includes(query);
            const codeContains = normalizedCode.includes(query);

            if (nameStartsWith || codeStartsWith) {
                startsWithMatches.push(p);
            } else if (nameContains || codeContains) {
                containsMatches.push(p);
            }
        });

        return [...startsWithMatches, ...containsMatches].slice(0, 10);
    }, [debouncedNombre, products]);

    // Exact Match Lookup
    const exactMatchProduct = useMemo(() => {
        const query = normalizeText(formData.nombre);
        if (!query) return null;
        return products.find(p => normalizeText(p.nombre) === query);
    }, [formData.nombre, products]);

    // Prioritized autocompletion load order: Name -> Description -> Price -> Category -> Image
    const autocompleteProduct = (item) => {
        setFormData(prev => ({
            ...prev,
            nombre: item.nombre
        }));

        setTimeout(() => {
            setFormData(prev => ({
                ...prev,
                descripcion: item.descripcion || ''
            }));
        }, 30);

        setTimeout(() => {
            setFormData(prev => ({
                ...prev,
                precio: item.precio
            }));
        }, 60);

        setTimeout(() => {
            setFormData(prev => ({
                ...prev,
                categoriaId: item.categoriaId
            }));
        }, 90);

        setTimeout(() => {
            setFormData(prev => ({
                ...prev,
                activo: item.activo,
                imageFile: null,
                imagePreview: item.imagen || null
            }));
            setEditingProduct(item);
        }, 120);

        setShowSuggestions(false);
    };

    // Auto-autocomplete on exact match
    useEffect(() => {
        if (exactMatchProduct) {
            if (!editingProduct || editingProduct.id !== exactMatchProduct.id) {
                autocompleteProduct(exactMatchProduct);
            }
        } else {
            if (modalMode === 'create' && editingProduct) {
                setEditingProduct(null);
            }
        }
    }, [exactMatchProduct]);

    // Keyboard handlers
    const handleKeyDownSuggestions = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;
        const maxIndex = suggestions.length;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => (prev + 1) % (maxIndex + 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev - 1 + maxIndex + 1) % (maxIndex + 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex < suggestions.length) {
                    autocompleteProduct(suggestions[highlightedIndex]);
                } else if (highlightedIndex === suggestions.length) {
                    setEditingProduct(null);
                    setShowSuggestions(false);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setShowSuggestions(false);
                break;
            default:
                break;
        }
    };

    // Text highlighting for matches
    const highlightMatch = (text, query) => {
        if (!query) return <span>{text}</span>;
        const normalizedQuery = normalizeText(query);
        const parts = text.split(new RegExp(`(${normalizedQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    normalizeText(part) === normalizedQuery ? <strong key={i} style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{part}</strong> : part
                )}
            </span>
        );
    };

    // --- EXCEL BULK IMPORT STATES ---
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importAnalysisLoading, setImportAnalysisLoading] = useState(false);
    const [importRows, setImportRows] = useState([]);
    const [importStats, setImportStats] = useState({ newCount: 0, updateCount: 0, warningCount: 0, errorCount: 0 });
    const [importTimeTaken, setImportTimeTaken] = useState(0);
    const [importSuccessModalOpen, setImportSuccessModalOpen] = useState(false);
    const [importTimeStart, setImportTimeStart] = useState(0);
    const [isSavingImport, setIsSavingImport] = useState(false);
    const [importStep1Status, setImportStep1Status] = useState('pending');
    const [importStep2Status, setImportStep2Status] = useState('pending');
    const [importStep3Status, setImportStep3Status] = useState('pending');
    const [importStep4Status, setImportStep4Status] = useState('pending');
    const fileInputRef = useRef(null);

    const normalizeString = (str) => {
        if (str === null || str === undefined) return '';
        return str
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, ' ')
            .trim();
    };

    const levenshteinDistance = (a, b) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    };

    const findClosestCategory = (inputCat) => {
        const normInput = normalizeString(inputCat);
        let closest = '';
        let minDistance = 999;

        categories.forEach(cat => {
            const normCat = normalizeString(cat.nombre);
            const dist = levenshteinDistance(normInput, normCat);
            if (dist < minDistance && dist <= 3) {
                minDistance = dist;
                closest = cat.nombre;
            }
        });
        return closest;
    };

    const handleDownloadTemplate = async () => {
        try {
            const workbook = new ExcelJS.Workbook();

            // Sheet 1: Platos
            const wsPlatos = workbook.addWorksheet('Platos');
            wsPlatos.columns = [
                { header: 'Nombre del Plato *', key: 'nombre', width: 25 },
                { header: 'Descripción (Opcional)', key: 'descripcion', width: 40 },
                { header: 'Categoría *', key: 'categoriaName', width: 20 },
                { header: 'Precio Venta (S/.)', key: 'precio', width: 20 },
                { header: 'Estado (Activo/Inactivo)', key: 'estado', width: 22 }
            ];

            wsPlatos.getRow(1).font = { bold: true };

            wsPlatos.addRow({
                nombre: 'Ceviche Mixto',
                descripcion: 'Delicioso ceviche de pescado y mariscos',
                categoriaName: categories[0]?.nombre || 'Marino',
                precio: 35.00,
                estado: 'Activo'
            });

            // Sheet 2: Categorías
            const wsCategorias = workbook.addWorksheet('Categorías');
            wsCategorias.columns = [
                { header: 'Nombre', key: 'nombre', width: 25 }
            ];
            wsCategorias.getRow(1).font = { bold: true };

            categories.forEach(cat => {
                wsCategorias.addRow({ nombre: cat.nombre });
            });

            const numCats = categories.length;
            const catRangeFormula = `Categorías!$A$2:$A$${numCats + 1}`;

            for (let i = 2; i <= 200; i++) {
                wsPlatos.getCell(`C${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [catRangeFormula],
                    showErrorMessage: true,
                    errorTitle: 'Categoría inválida',
                    error: 'Por favor seleccione una categoría de la lista desplegable.'
                };

                wsPlatos.getCell(`E${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['"Activo,Inactivo"'],
                    showErrorMessage: true,
                    errorTitle: 'Estado inválido',
                    error: 'Por favor seleccione Activo o Inactivo.'
                };
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'Plantilla_Platos_Bunker.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Plantilla descargada con éxito', 'success');
        } catch (error) {
            console.error('Error downloading template:', error);
            showToast('Error al descargar plantilla', 'error');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const timeStart = performance.now();
        setImportTimeStart(timeStart);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                const wsName = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsName];

                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
                if (rows.length <= 1) {
                    showToast('El archivo Excel está vacío o no contiene filas de datos.', 'warning');
                    return;
                }

                processImportRows(rows);
            } catch (err) {
                console.error(err);
                showToast('Error al leer el archivo Excel.', 'error');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const processImportRows = (rows) => {
        const headers = rows[0].map(h => h ? h.toString().trim() : '');

        const nameIdx = headers.findIndex(h => h.toLowerCase().includes('nombre'));
        const descIdx = headers.findIndex(h => h.toLowerCase().includes('descripc'));
        const catIdx = headers.findIndex(h => h.toLowerCase().includes('categor'));
        const priceIdx = headers.findIndex(h => h.toLowerCase().includes('precio'));
        const statusIdx = headers.findIndex(h => h.toLowerCase().includes('estado'));

        if (nameIdx === -1 || catIdx === -1 || priceIdx === -1) {
            showToast('El archivo no posee las columnas obligatorias: Nombre, Categoría y Precio.', 'error');
            return;
        }

        setImportModalOpen(true);
        setImportAnalysisLoading(true);
        setImportStep1Status('loading');
        setImportStep2Status('pending');
        setImportStep3Status('pending');
        setImportStep4Status('pending');

        const processed = [];
        const categoryNamesMap = {};
        categories.forEach(c => {
            categoryNamesMap[normalizeString(c.nombre)] = c.nombre;
        });

        const productNamesMap = {};
        products.forEach(p => {
            productNamesMap[normalizeString(p.nombre)] = p;
        });

        let newCount = 0;
        let updateCount = 0;
        let warningCount = 0;
        let errorCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0 || row.every(val => val === null || val === undefined || val === '')) {
                continue;
            }

            const rawName = row[nameIdx];
            const rawDesc = descIdx !== -1 ? row[descIdx] : '';
            const rawCat = catIdx !== -1 ? row[catIdx] : '';
            const rawPrice = priceIdx !== -1 ? row[priceIdx] : '';
            const rawStatus = statusIdx !== -1 ? row[statusIdx] : 'Activo';

            const name = rawName ? rawName.toString().trim() : '';
            const desc = rawDesc ? rawDesc.toString().trim() : '';
            const cat = rawCat ? rawCat.toString().trim() : '';
            const status = rawStatus ? rawStatus.toString().trim() : 'Activo';

            let error = '';
            let warning = '';
            let statusIcon = '✅';
            let actionText = 'Nuevo';

            if (!name) {
                error = 'Nombre del plato es obligatorio.';
                statusIcon = '❌';
                actionText = 'Error';
                errorCount++;
            } else if (!cat) {
                error = 'Categoría es obligatoria.';
                statusIcon = '❌';
                actionText = 'Error';
                errorCount++;
            } else if (rawPrice === null || rawPrice === undefined || rawPrice === '') {
                error = 'Precio es obligatorio.';
                statusIcon = '❌';
                actionText = 'Error';
                errorCount++;
            } else {
                const price = parseFloat(rawPrice);
                if (Number.isNaN(price) || price <= 0) {
                    error = 'Precio de venta debe ser un número mayor a cero.';
                    statusIcon = '❌';
                    actionText = 'Error';
                    errorCount++;
                } else {
                    const normCat = normalizeString(cat);
                    const matchedCatName = categoryNamesMap[normCat];

                    if (!matchedCatName) {
                        const suggestion = findClosestCategory(cat);
                        if (suggestion) {
                            warning = `Categoría no existe. ¿Quiso decir "${suggestion}"?`;
                        } else {
                            warning = `Categoría "${cat}" no existe en el sistema.`;
                        }
                        statusIcon = '⚠️';
                        actionText = 'Omitir';
                        warningCount++;
                    } else {
                        const normStatus = normalizeString(status);
                        if (normStatus !== 'activo' && normStatus !== 'inactivo') {
                            warning = `Estado "${status}" inválido (debe ser Activo o Inactivo).`;
                            statusIcon = '⚠️';
                            actionText = 'Omitir';
                            warningCount++;
                        } else {
                            const normName = normalizeString(name);
                            if (productNamesMap[normName]) {
                                statusIcon = '✏️';
                                actionText = 'Actualizar';
                                updateCount++;
                            } else {
                                statusIcon = '✅';
                                actionText = 'Nuevo';
                                newCount++;
                            }
                        }
                    }
                }
            }

            processed.push({
                rowNumber: i + 1,
                nombre: name,
                descripcion: desc,
                categoriaNombre: cat,
                precio: rawPrice,
                activo: normalizeString(status) !== 'inactivo',
                statusIcon,
                actionText,
                error,
                warning
            });
        }

        setImportRows(processed);
        setImportStats({ newCount, updateCount, warningCount, errorCount });

        setTimeout(() => {
            setImportStep1Status('completed');
            setImportStep2Status('loading');
        }, 600);

        setTimeout(() => {
            setImportStep2Status('completed');
            setImportStep3Status('loading');
        }, 1200);

        setTimeout(() => {
            setImportStep3Status('completed');
            setImportStep4Status('loading');
        }, 1800);

        setTimeout(() => {
            setImportStep4Status('completed');
            setImportAnalysisLoading(false);
        }, 2400);
    };

    const handleConfirmImport = async () => {
        const validRows = importRows.filter(r => r.statusIcon === '✅' || r.statusIcon === '✏️');
        if (validRows.length === 0) {
            showToast('No hay filas válidas para importar.', 'warning');
            return;
        }

        setIsSavingImport(true);
        try {
            const res = await fetch('/api/products/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: validRows })
            });

            const data = await res.json();
            if (data.success) {
                const timeEnd = performance.now();
                const seconds = ((timeEnd - importTimeStart) / 1000).toFixed(1);
                setImportTimeTaken(seconds);

                setImportModalOpen(false);
                setImportSuccessModalOpen(true);
                fetchData();
            } else {
                showToast(data.error || 'Error al procesar la importación masiva.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error de red al procesar la importación.', 'error');
        } finally {
            setIsSavingImport(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (!formData.nombre) { showToast("Por favor, ingrese un nombre primero.", 'info'); return; }
        setIsGenerating(true);
        try {
            const categoryName = categories.find(c => c.id == formData.categoriaId)?.nombre || '';
            const res = await fetch('/api/generate-description', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: formData.nombre, categoryName })
            });
            const data = await res.json();
            if (data.description) setFormData(prev => ({ ...prev, descripcion: data.description }));
        } catch (error) {
            console.error("AI Generation failed", error); showToast("Error generando descripción", 'error');
        } finally { setIsGenerating(false); }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) setFormData({ ...formData, imageFile: file, imagePreview: URL.createObjectURL(file) });
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setModalMode('edit');
            setFormData({
                nombre: product.nombre, descripcion: product.descripcion || '', precio: product.precio,
                categoriaId: product.categoriaId, activo: product.activo, imageFile: null, imagePreview: product.imagen ? product.imagen : null
            });
        } else {
            setEditingProduct(null);
            setModalMode('create');
            setFormData({
                nombre: '', descripcion: '', precio: '', categoriaId: categories.length > 0 ? categories[0].id : '',
                activo: true, imageFile: null, imagePreview: null
            });
        }
        setIsModalOpen(true);
    };

    const handleDeleteProduct = async (product) => {
        const id = product.id;
        if (!await showConfirmation('¿Seguro que desea eliminar este producto?', { type: 'danger' })) return;
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
            safeRecordProductShadow('DELETE', product);
            fetchData();
        }
    };

    const handleSubmitProduct = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (Number.isNaN(formData.precio) || formData.precio === null || formData.precio === '') {
            setFormError("El precio debe ser un número válido.");
            return;
        }
        if (Number.isNaN(formData.categoriaId) || formData.categoriaId === null || formData.categoriaId === '') {
            setFormError("Debe seleccionar una categoría válida.");
            return;
        }
        let imageUrl = editingProduct ? editingProduct.imagen : null;
        if (formData.imageFile) {
            const uploadData = new FormData(); uploadData.append('image', formData.imageFile);
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
                imageUrl = (await res.json()).url;
            } catch (error) { showToast('Falló la subida de imagen', 'error'); return; }
        }
        const payload = { ...formData, imagen: imageUrl };
        const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
        const method = editingProduct ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            try {
                // Clonamos para no consumir el stream del response original, evitando efectos colaterales
                const savedProduct = await res.clone().json();
                safeRecordProductShadow(method === 'POST' ? 'CREATE' : 'UPDATE', savedProduct);
            } catch (err) {
                console.error('[ShadowIntegration] Error al procesar respuesta del servidor:', err);
            }
            showToast('Plato guardado exitosamente', 'success');
            setIsModalOpen(false);
            fetchData();
        }
    };

    // --- TAB 2: INSUMOS ---
    const [isInsumoModalOpen, setIsInsumoModalOpen] = useState(false);
    const [editingInsumo, setEditingInsumo] = useState(null);
    const [insumoForm, setInsumoForm] = useState({ nombre: '', precioCompra: '', unidadMedida: 'kg', stock: '', stockMinimo: '', notificarAlerta: false });

    const handleOpenInsumoModal = (insumo = null) => {
        if (insumo) {
            setEditingInsumo(insumo);
            setInsumoForm({ nombre: insumo.nombre, precioCompra: insumo.precioCompra, unidadMedida: insumo.unidadMedida, stock: insumo.stock, stockMinimo: insumo.stockMinimo || '', notificarAlerta: insumo.notificarAlerta || false });
        } else {
            setEditingInsumo(null);
            setInsumoForm({ nombre: '', precioCompra: '', unidadMedida: 'kg', stock: '', stockMinimo: '', notificarAlerta: false });
        }
        setIsInsumoModalOpen(true);
    };

    const handleSubmitInsumo = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (Number.isNaN(insumoForm.precioCompra) || insumoForm.precioCompra === null || insumoForm.precioCompra === '') {
            setFormError("El precio de compra debe ser un número válido.");
            return;
        }
        if (Number.isNaN(insumoForm.stock) || insumoForm.stock === null || insumoForm.stock === '') {
            setFormError("El stock debe ser un número válido.");
            return;
        }
        if (insumoForm.stockMinimo !== '' && Number.isNaN(insumoForm.stockMinimo)) {
            setFormError("El stock mínimo debe ser un número válido o estar vacío.");
            return;
        }

        // CORRECCIÓN DE PAYLOAD: Mapeo limpio y seguro contra el schema.prisma
        const payload = {
            nombre: String(insumoForm.nombre).trim(),
            unidadMedida: insumoForm.unidadMedida,
            precioCompra: Number(insumoForm.precioCompra) || 0,
            stock: Number(insumoForm.stock) || 0,
            // Si está vacío o nulo, pasamos 0 en lugar de null para evitar el choque con el NOT NULL de PostgreSQL
            stockMinimo: (insumoForm.stockMinimo === '' || insumoForm.stockMinimo === null) ? 0 : Number(insumoForm.stockMinimo),
            notificarAlerta: Boolean(insumoForm.notificarAlerta)
        };

        const url = editingInsumo ? `/api/insumos/${editingInsumo.id}` : '/api/insumos';
        const method = editingInsumo ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('Insumo guardado exitosamente', 'success');
                setIsInsumoModalOpen(false);
                fetchInsumos();
            } else {
                const errData = await res.json();
                setFormError(errData.error || "Error controlado por el servidor (400).");
            }
        } catch (error) {
            console.error(error);
            setFormError("Error de conexión con el servidor.");
        }
    };

    const handleDeleteInsumo = async (id) => {
        if (await showConfirmation('¿Seguro que desea eliminar este insumo?', { type: 'danger' })) {
            await fetch(`/api/insumos/${id}`, { method: 'DELETE' });
            fetchInsumos();
        }
    };

    // --- TAB 3: RECETARIO ---
    const [selectedPlatoId, setSelectedPlatoId] = useState('');
    const [currentRecipe, setCurrentRecipe] = useState([]);
    const [selectedPlatoObj, setSelectedPlatoObj] = useState(null);

    useEffect(() => {
        if (selectedPlatoId) {
            fetch(`/api/recetas/${selectedPlatoId}`)
                .then(res => res.json())
                .then(data => {
                    const mapped = data.map(d => ({ insumoId: d.insumoId, cantidad: d.cantidad, insumo: d.insumo }));
                    setCurrentRecipe(mapped);
                });

            const p = products.find(p => p.id === parseInt(selectedPlatoId));
            setSelectedPlatoObj(p);
        } else {
            setCurrentRecipe([]);
            setSelectedPlatoObj(null);
        }
    }, [selectedPlatoId, products]);

    const handleAddIngredientRow = () => setCurrentRecipe([...currentRecipe, { insumoId: '', cantidad: '', insumo: null }]);

    const handleIngredientChange = (index, field, value) => {
        const newRecipe = [...currentRecipe];
        newRecipe[index][field] = value;
        if (field === 'insumoId') {
            newRecipe[index].insumo = insumos.find(i => i.id === parseInt(value));
        }
        setCurrentRecipe(newRecipe);
    };

    const handleRemoveIngredient = (index) => setCurrentRecipe(currentRecipe.filter((_, i) => i !== index));

    const handleSaveRecipe = async () => {
        if (!selectedPlatoId) return;
        setFormError(null);

        // Validar NaNs en receta
        const hasInvalidQty = currentRecipe.some(i => i.insumoId && (Number.isNaN(i.cantidad) || i.cantidad === null || i.cantidad === ''));
        if (hasInvalidQty) {
            showToast("Error: Existen cantidades inválidas en la receta.", 'error');
            return;
        }

        const validIngredients = currentRecipe.filter(i => i.insumoId && i.cantidad > 0);

        try {
            const res = await fetch(`/api/recetas/${selectedPlatoId}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredientes: validIngredients })
            });

            if (res.ok) {
                showToast('Receta guardada. Costos actualizados.', 'success');
                fetchData(); // refresh product list for new cost
            } else {
                showToast('Error al guardar receta.', 'error');
            }
        } catch (e) { showToast('Error de red al guardar receta.', 'error'); }
    };

    // --- RENDER HELPERS ---
    const renderPlatosTab = () => {
        const filteredProducts = sortedProducts.filter(p => {
            const matchesCategory = filterCategory ? p.categoriaId === parseInt(filterCategory) : true;
            const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        const categoryOptions = [
            { id: '', name: 'Todas las categorías' },
            ...categories.map(c => ({
                id: c.id.toString(),
                name: `${c.icono || ''} ${c.nombre}`.trim()
            }))
        ];
        const selectedCategoryOption = categoryOptions.find(opt => opt.id === filterCategory?.toString()) || categoryOptions[0];

        return (
            <>
                <div className="glass-panel" style={{ position: 'relative', zIndex: 10, marginBottom: 20, display: 'flex', gap: 15, padding: 15, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="search-container" style={{ flex: '1 1 300px', maxWidth: '600px' }}>
                        <Search size={22} className="text-muted" />
                        <input
                            type="text" placeholder="Buscar plato..." className="search-input"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ width: 200, textAlign: 'left' }}>
                        <SimpleCombobox
                            items={categoryOptions}
                            selectedItem={selectedCategoryOption}
                            onSelect={(opt) => setFilterCategory(opt ? opt.id : '')}
                            placeholder="Todas las categorías"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button className="glass-button flex items-center gap-1.5 px-3 py-2 text-xs font-semibold cursor-pointer h-9" onClick={handleDownloadTemplate}>
                            <Download size={16} /> Descargar Plantilla
                        </button>
                        <button className="glass-button flex items-center gap-1.5 px-3 py-2 text-xs font-semibold cursor-pointer h-9" onClick={() => fileInputRef.current.click()}>
                            <Upload size={16} /> Importar Excel
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            accept=".xlsx, .xls"
                        />
                        <button className="glass-button primary h-9 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold" onClick={() => handleOpenModal()}>
                            <Plus size={16} /> Nuevo Plato
                        </button>
                    </div>
                </div>

                <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--table-header-bg)', textAlign: 'left' }}>
                                <th style={{ padding: 15 }}>Imagen</th>
                                <SortHeader label="Nombre" sortKey="nombre" />
                                <SortHeader label="Categoría" sortKey="categoria" />
                                <SortHeader label="Precio Venta" sortKey="precio" />
                                <th style={{ padding: 15, textAlign: 'center' }}>Costo Prod.</th>
                                <th style={{ padding: 15, textAlign: 'center' }}>Costo %</th>
                                <th style={{ padding: 15 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(prod => {
                                const costo = prod.costoProduccion || 0;
                                const margenPct = prod.precio > 0 ? (costo / prod.precio) * 100 : 0;
                                const isWarning = margenPct > 40;

                                return (
                                    <tr key={prod.id} style={{ borderBottom: '1px solid var(--table-row-border)', textAlign: 'center' }}>
                                        <td style={{ padding: 15 }}>
                                            {prod.imagen ? <img src={prod.imagen} alt={prod.nombre} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }} />
                                                : <div style={{ width: 50, height: 50, background: 'var(--item-hover)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} className="text-muted" /></div>}
                                        </td>
                                        <td style={{ padding: 15, fontWeight: 'bold' }}>{prod.nombre}</td>
                                        <td style={{ padding: 15 }}><span style={{ padding: '4px 8px', borderRadius: 4, background: prod.categoria?.color + '40', color: prod.categoria?.color }}>{prod.categoria?.icono} {prod.categoria?.nombre}</span></td>
                                        <td style={{ padding: 15 }} className="font-mono">S/. {prod.precio.toFixed(2)}</td>
                                        <td style={{ padding: 15, color: isWarning ? 'var(--danger)' : 'var(--success)' }} className="font-mono">S/. {costo.toFixed(2)}</td>
                                        <td style={{ padding: 15 }}>
                                            {isWarning ? (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 4, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                    <AlertTriangle size={14} /> {margenPct.toFixed(1)}%
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.9rem' }}>{margenPct.toFixed(1)}%</span>
                                            )}
                                        </td>
                                        <td style={{ padding: 15 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                                <EditButton onClick={() => handleOpenModal(prod)} className="scale-75 -my-2 -mx-1" />
                                                <DeleteButton onClick={() => handleDeleteProduct(prod)} className="scale-75 -my-2 -mx-1" />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderInsumosTab = () => {
        const filteredInsumos = insumos.filter(i => i.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
        const sortedInsumos = [...filteredInsumos].sort((a, b) => {
            if (!sortConfig.key) return 0;
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return (
            <>
                <div className="glass-panel" style={{ marginBottom: 20, display: 'flex', gap: 15, padding: 15, alignItems: 'center' }}>
                    <div className="search-container" style={{ flex: 1 }}>
                        <Search size={22} className="text-muted" />
                        <input
                            type="text" placeholder="Buscar insumo..." className="search-input"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="glass-button primary" onClick={() => handleOpenInsumoModal()}><Plus size={20} /> Nuevo Insumo</button>
                </div>

                <div className="glass-panel table-responsive" style={{ padding: 0, textAlign: 'center' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--table-header-bg)', textAlign: 'center' }}>
                                <SortHeader label="Nombre" sortKey="nombre" />
                                <SortHeader label="Costo Unitario Bruto" sortKey="precioCompra" />
                                <SortHeader label="Stock Actual" sortKey="stock" />
                                <th style={{ padding: 15, textAlign: 'center' }}>Nivel de Stock</th>
                                <th style={{ padding: 15, textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedInsumos.map(insumo => {
                                const stockPct = Math.min(100, Math.max(0, (insumo.stock / 100) * 100)); // Demo ratio against 100 units
                                return (
                                    <tr key={insumo.id}>
                                        <td style={{ padding: 15, fontWeight: 'bold', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                                {insumo.nombre}
                                                {insumo.notificarAlerta && insumo.stock <= insumo.stockMinimo && (
                                                    <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center' }} title={`Stock crítico (Mínimo: ${insumo.stockMinimo})`}>
                                                        <AlertTriangle size={16} />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: 15 }}><span className="font-mono">S/. {Number(insumo.precioCompra).toFixed(2)}</span> / {insumo.unidadMedida}</td>
                                        <td style={{ padding: 15, color: (insumo.notificarAlerta && insumo.stock <= insumo.stockMinimo) ? 'var(--warning)' : 'inherit', fontWeight: (insumo.notificarAlerta && insumo.stock <= insumo.stockMinimo) ? 'bold' : 'normal' }}>
                                            {Number(insumo.stock).toFixed(2)} {insumo.unidadMedida}
                                        </td>
                                        <td style={{ padding: 15 }}>
                                            <div style={{ height: 10, width: 150, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                                <div style={{ height: '100%', width: `${stockPct}%`, background: stockPct < 20 ? 'var(--danger)' : 'var(--primary)', transition: 'width 0.3s' }} />
                                            </div>
                                        </td>
                                        <td style={{ padding: 15 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                                <EditButton onClick={() => handleOpenInsumoModal(insumo)} className="scale-75 -my-2 -mx-1" />
                                                <DeleteButton onClick={() => handleDeleteInsumo(insumo.id)} className="scale-75 -my-2 -mx-1" />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderRecetarioTab = () => {
        let draftCosto = 0;
        currentRecipe.forEach(item => {
            const insu = item.insumo || insumos.find(i => i.id === parseInt(item.insumoId));
            if (insu && item.cantidad > 0) draftCosto += (insu.precioCompra * item.cantidad);
        });

        const isWarning = selectedPlatoObj && selectedPlatoObj.precio > 0 ? (draftCosto / selectedPlatoObj.precio) * 100 > 40 : false;

        const comboboxItems = products.map(p => {
            const cat = categories.find(c => c.id === p.categoriaId);
            return {
                id: p.id.toString(),
                name: p.nombre,
                category: cat ? cat.nombre : 'Otros',
                precio: p.precio
            };
        });
        const selectedComboboxItem = comboboxItems.find(item => item.id === selectedPlatoId) || null;
        const categoriesList = categories.map(c => c.nombre);

        return (
            <div className="glass-panel" style={{ padding: 30 }}>
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: 30, marginBottom: 30, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <label style={{ display: 'block', marginBottom: 10, fontSize: '1.1rem', fontWeight: 'bold' }}>Seleccionar Plato del Menú</label>
                        <CategorizedCombobox
                            items={comboboxItems}
                            selectedItem={selectedComboboxItem}
                            onSelect={(item) => setSelectedPlatoId(item ? item.id : '')}
                            categoriesList={categoriesList}
                        />
                        <p className="text-muted" style={{ marginTop: 10, fontSize: '0.9rem' }}>El costo se descontará del stock en Logística al venderse este plato.</p>
                    </div>
                    {selectedPlatoObj && (
                        <div style={{ flex: '1 1 300px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', padding: 20, borderRadius: 16 }}>
                            <h3 style={{ margin: '0 0 15px 0' }}>Análisis de Costos</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '1.1rem' }}>
                                <span className="text-muted">Precio Venta (PVP):</span>
                                <strong className="font-mono">S/. {selectedPlatoObj.precio.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '1.1rem' }}>
                                <span className="text-muted">Costo Producción:</span>
                                <strong style={{ color: isWarning ? 'var(--danger)' : 'var(--success)' }} className="font-mono">S/. {draftCosto.toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: 10, marginTop: 10, fontSize: '1.1rem' }}>
                                <span className="text-muted">Margen Bruto:</span>
                                <strong className="font-mono">S/. {(selectedPlatoObj.precio - draftCosto).toFixed(2)}</strong>
                            </div>
                            {isWarning && (
                                <div style={{ background: 'var(--danger)', color: 'white', padding: '8px 15px', borderRadius: 8, marginTop: 15, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 'bold' }}>
                                    <AlertTriangle size={18} /> El costo supera el 40% del Venta.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {selectedPlatoId && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3>Ingredientes de la Receta</h3>
                            <button className="glass-button" onClick={handleAddIngredientRow}><Plus size={18} /> Añadir Insumo</button>
                        </div>

                        {currentRecipe.length === 0 ? (
                            <div className="text-muted" style={{ textAlign: 'center', padding: 40, border: '1px dashed var(--glass-border)', borderRadius: 12 }}>
                                <Beaker size={48} style={{ opacity: 0.5, marginBottom: 15 }} />
                                <div>Este plato no tiene insumos asignados.</div>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="recipe-table" style={{ width: '100%', marginBottom: 20 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--table-header-bg)', textAlign: 'left' }}>
                                            <th style={{ padding: 15 }}>Insumo</th>
                                            <th style={{ padding: 15 }}>Unidad</th>
                                            <th style={{ padding: 15 }}>Cantidad a descontar</th>
                                            <th style={{ padding: 15 }}>Costo Subtotal</th>
                                            <th style={{ padding: 15, width: 60 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentRecipe.map((item, index) => {
                                            const insu = item.insumo || insumos.find(i => i.id === parseInt(item.insumoId));
                                            const subtotal = insu && item.cantidad ? (insu.precioCompra * item.cantidad) : 0;
                                            const insumoOptions = insumos.map(i => ({
                                                id: i.id.toString(),
                                                name: i.nombre
                                            })).sort((a, b) => a.name.localeCompare(b.name));
                                            const selectedInsumoOption = insumoOptions.find(opt => opt.id === item.insumoId?.toString()) || null;

                                            return (
                                                <tr key={index} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                                                    <td style={{ padding: 15 }}>
                                                        <SimpleCombobox
                                                            items={insumoOptions}
                                                            selectedItem={selectedInsumoOption}
                                                            onSelect={(opt) => handleIngredientChange(index, 'insumoId', opt ? opt.id : '')}
                                                            placeholder="Seleccionar Insumo..."
                                                        />
                                                    </td>
                                                    <td style={{ padding: 15 }} className="text-muted">{insu ? insu.unidadMedida : '-'}</td>
                                                    <td style={{ padding: 15 }}>
                                                        <input type="number" step="0.01" className="glass-input font-sans text-xs" style={{ width: 120 }} placeholder="0.00" value={Number.isNaN(item.cantidad) ? '' : item.cantidad} onChange={e => handleIngredientChange(index, 'cantidad', e.target.valueAsNumber)} />
                                                    </td>
                                                    <td style={{ padding: 15 }} className="font-mono">{insu ? `S/. ${subtotal.toFixed(2)}` : '-'}</td>
                                                    <td style={{ padding: 15 }}>
                                                        <DeleteButton onClick={() => handleRemoveIngredient(index)} className="scale-75 -my-2 -mx-1" />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                            <button className="glass-button primary" onClick={handleSaveRecipe} style={{ fontSize: '1.1rem', padding: '12px 30px' }}>
                                <Save size={20} /> Guardar Receta Completa
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // --- TAB 4: KARDEX ---
    const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);
    const [kardexForm, setKardexForm] = useState({ insumoId: '', tipoMovimiento: 'MERMA', cantidad: '', motivo: '' });

    const handleSaveKardexManual = async (e) => {
        e.preventDefault();
        setFormError(null);

        if (Number.isNaN(kardexForm.cantidad) || kardexForm.cantidad === null || kardexForm.cantidad === '') {
            setFormError("La cantidad debe ser un número válido.");
            return;
        }
        if (Number.isNaN(kardexForm.insumoId) || kardexForm.insumoId === null || kardexForm.insumoId === '') {
            setFormError("Debe seleccionar un insumo válido.");
            return;
        }

        // Validar que el usuario esté autenticado
        if (!user || !user.id) {
            showToast("❌ Error: Usuario no autenticado", 'error');
            return;
        }

        try {
            const payload = { ...kardexForm, usuarioId: user.id };
            const res = await fetch('/api/kardex', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsKardexModalOpen(false);
                fetchKardex();
                fetchInsumos();
                setKardexForm({ insumoId: '', tipoMovimiento: 'MERMA', cantidad: '', motivo: '' });
            } else {
                showToast("❌ Error al guardar movimiento", 'error');
            }
        } catch (error) { showToast("❌ Error de conexión", 'error'); }
    };

    const renderKardexTab = () => {
        // --- Pagination & Filtering Logic ---
        const ITEMS_PER_PAGE = 50;

        // Filter by Date
        const filteredKardex = kardex.filter(mov => {
            if (!kardexDateFilterRange || (!kardexDateFilterRange.from && !kardexDateFilterRange.to)) return true;

            const movDate = new Date(mov.fecha);
            const dateToCompare = new Date(movDate.getFullYear(), movDate.getMonth(), movDate.getDate());

            if (kardexDateFilterRange.from && kardexDateFilterRange.to) {
                const fromDate = new Date(kardexDateFilterRange.from.getFullYear(), kardexDateFilterRange.from.getMonth(), kardexDateFilterRange.from.getDate());
                const toDate = new Date(kardexDateFilterRange.to.getFullYear(), kardexDateFilterRange.to.getMonth(), kardexDateFilterRange.to.getDate());
                return dateToCompare >= fromDate && dateToCompare <= toDate;
            } else if (kardexDateFilterRange.from) {
                const fromDate = new Date(kardexDateFilterRange.from.getFullYear(), kardexDateFilterRange.from.getMonth(), kardexDateFilterRange.from.getDate());
                return dateToCompare.getTime() === fromDate.getTime();
            }
            return true;
        });

        // Pagination
        const totalPages = Math.ceil(filteredKardex.length / ITEMS_PER_PAGE) || 1;
        const currentData = filteredKardex.slice(
            (kardexCurrentPage - 1) * ITEMS_PER_PAGE,
            kardexCurrentPage * ITEMS_PER_PAGE
        );

        const handlePrevPage = () => setKardexCurrentPage(p => Math.max(1, p - 1));
        const handleNextPage = () => setKardexCurrentPage(p => Math.min(totalPages, p + 1));

        const handleExportExcel = () => {
            if (filteredKardex.length === 0) {
                showToast("No hay datos para exportar en el rango seleccionado.", 'error');
                return;
            }

            const exportData = filteredKardex.map(mov => {
                const isPositive = ['COMPRA', 'AJUSTE_POSITIVO'].includes(mov.tipoMovimiento);
                const sign = isPositive ? '+' : '-';
                return {
                    "Fecha y Hora": new Date(mov.fecha).toLocaleString(),
                    "Insumo": mov.insumo?.nombre || '-',
                    "Tipo": mov.tipoMovimiento,
                    "Cantidad": `${sign}${mov.cantidad} ${mov.insumo?.unidadMedida || ''}`,
                    "Usuario": mov.usuario?.nombre || 'General / Sistema',
                    "Motivo": mov.motivo || '-'
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Kardex");

            const dateStr = kardexDateFilterRange?.from
                ? (kardexDateFilterRange.to
                    ? `${format(kardexDateFilterRange.from, 'yyyy-MM-dd')}_a_${format(kardexDateFilterRange.to, 'yyyy-MM-dd')}`
                    : format(kardexDateFilterRange.from, 'yyyy-MM-dd'))
                : 'General';
            XLSX.writeFile(workbook, `Reporte_Kardex_${dateStr}.xlsx`);
        };

        return (
            <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <h2 style={{ margin: 0 }}>Historial de Movimientos</h2>
                        <DropdownRangeDatePicker
                            mode="range"
                            value={kardexDateFilterRange}
                            onChange={(range) => {
                                setKardexDateFilterRange(range);
                                setKardexCurrentPage(1);
                            }}
                            placeholder="Filtrar por Fecha"
                        />
                        <button className="glass-button" onClick={handleExportExcel} style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', padding: '6px 15px', color: 'var(--success)' }}>
                            <Download size={18} /> Exportar Excel
                        </button>
                    </div>
                    <button className="glass-button secondary" onClick={() => setIsKardexModalOpen(true)}>
                        <Plus size={18} /> Nuevo Movimiento Manual
                    </button>
                </div>

                <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', justifyItems: 'center', alignItems: 'center', textAlign: 'center' }}>
                        <thead>
                            <tr style={{ background: 'var(--table-header-bg)', textAlign: 'left' }}>
                                <th style={{ padding: 15 }}>Fecha y Hora</th>
                                <th style={{ padding: 15 }}>Insumo</th>
                                <th style={{ padding: 15 }}>Tipo</th>
                                <th style={{ padding: 15 }}>Cantidad</th>
                                <th style={{ padding: 15 }}>Usuario</th>
                                <th style={{ padding: 15 }}>Motivo / Info</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        {kardexDateFilterRange?.from ? 'No se registraron movimientos en este periodo.' : 'No hay movimientos registrados.'}
                                    </td>
                                </tr>
                            ) : currentData.map(mov => {
                                const isPositive = ['COMPRA', 'AJUSTE_POSITIVO'].includes(mov.tipoMovimiento);
                                const color = isPositive ? 'var(--success)' : (mov.tipoMovimiento === 'VENTA' ? 'var(--primary)' : 'var(--danger)');
                                return (
                                    <tr key={mov.id} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                                        <td style={{ padding: 15 }}>{new Date(mov.fecha).toLocaleString()}</td>
                                        <td style={{ padding: 15, fontWeight: 'bold' }}>{mov.insumo?.nombre}</td>
                                        <td style={{ padding: 15 }}>
                                            <span style={{ padding: '4px 8px', borderRadius: 4, background: `${color}40`, color: color, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                {mov.tipoMovimiento}
                                            </span>
                                        </td>
                                        <td style={{ padding: 15, color: color, fontWeight: 'bold' }}>
                                            {isPositive ? '+' : '-'}{mov.cantidad} {mov.insumo?.unidadMedida}
                                        </td>
                                        <td style={{ padding: 15, color: 'rgba(255,255,255,0.8)' }}>
                                            {mov.usuario?.nombre || 'General / Sistema'}
                                        </td>
                                        <td style={{ padding: 15, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>{mov.motivo || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div style={{ padding: 15, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15, borderTop: '1px solid var(--table-row-border)' }}>
                            <button className="glass-button" disabled={kardexCurrentPage === 1} onClick={handlePrevPage}>Anterior</button>
                            <span style={{ fontSize: '0.9rem' }}>Página {kardexCurrentPage} de {totalPages}</span>
                            <button className="glass-button" disabled={kardexCurrentPage === totalPages} onClick={handleNextPage}>Siguiente</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- TAB 5: AUDITORÍA ---
    const [auditData, setAuditData] = useState({}); // { insumoId: realStockValue }

    const handleAuditChange = (insumoId, value) => {
        setAuditData(prev => ({ ...prev, [insumoId]: value }));
    };

    const handleApplyAudit = async () => {
        // Validar que el usuario esté autenticado
        if (!user || !user.id) {
            showToast("❌ Error: Usuario no autenticado", 'error');
            return;
        }

        if (!await showConfirmation("¿Desea aplicar estos ajustes de conciliación? Se generarán movimientos de AJUSTE en el Kardex y el stock se actualizará.", { type: 'warning' })) return;

        try {
            const promises = Object.entries(auditData).map(async ([insumoId, stockReal]) => {
                const id = parseInt(insumoId);
                const real = parseFloat(stockReal);
                const insumo = insumos.find(i => i.id === id);
                if (!insumo || isNaN(real)) return null;

                const diferencia = real - insumo.stock;
                if (Math.abs(diferencia) < 0.0001) return null; // No change

                const tipoMovimiento = diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';
                const motivo = `Conciliación Física. Stock anterior: ${insumo.stock}, Nuevo: ${real}`;

                return fetch('/api/kardex', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        insumoId: id,
                        tipoMovimiento,
                        cantidad: Math.abs(diferencia),
                        motivo,
                        usuarioId: user.id
                    })
                });
            });

            await Promise.all(promises.filter(p => p !== null));
            showToast("✅ Conciliación aplicada exitosamente.", 'success');
            setAuditData({});
            fetchInsumos();
        } catch (e) { showToast("❌ Error al conciliar.", 'error'); }
    };

    const renderAuditoriaTab = () => {
        let hasChanges = Object.keys(auditData).some(id => {
            const real = parseFloat(auditData[id]);
            const insumo = insumos.find(i => i.id === parseInt(id));
            return insumo && !isNaN(real) && Math.abs(real - insumo.stock) >= 0.0001;
        });

        // Add sorting logic for Auditoria
        const sortedAuditInsumos = [...insumos].sort((a, b) => {
            if (!sortConfig.key) return 0;
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return (
            <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2>Conciliación de Inventario</h2>
                        <p className="text-muted">Ingrese el stock físico real para calcular mermas o excedentes.</p>
                    </div>
                    <button className="glass-button primary" onClick={handleApplyAudit} disabled={!hasChanges}>
                        <ClipboardCheck size={18} /> Aplicar Ajustes
                    </button>
                </div>

                <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                <SortHeader label="Insumo" sortKey="nombre" />
                                <SortHeader label="Stock Teórico (Actual)" sortKey="stock" />
                                <th style={{ padding: 15 }}>Stock Físico (Real)</th>
                                <th style={{ padding: 15 }}>Diferencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAuditInsumos.map(insumo => {
                                const realInput = auditData[insumo.id] !== undefined ? auditData[insumo.id] : '';
                                const realValue = parseFloat(realInput);
                                const dif = !isNaN(realValue) ? realValue - insumo.stock : 0;
                                const isDiscrepancy = Math.abs(dif) >= 0.0001;
                                const difColor = dif < 0 ? 'var(--danger)' : (dif > 0 ? 'var(--warning)' : 'var(--success)');

                                return (
                                    <tr key={insumo.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: 15, fontWeight: 'bold' }}>{insumo.nombre}</td>
                                        <td style={{ padding: 15 }}>{insumo.stock.toFixed(2)} {insumo.unidadMedida}</td>
                                        <td style={{ padding: 15 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <input
                                                    type="number" step="0.01" className="glass-input" style={{ width: 120, borderColor: isDiscrepancy ? difColor : 'var(--glass-border)' }}
                                                    placeholder={insumo.stock.toFixed(2)}
                                                    value={realInput}
                                                    onChange={(e) => handleAuditChange(insumo.id, e.target.value)}
                                                />
                                                <span className="text-muted">{insumo.unidadMedida}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: 15 }}>
                                            {isDiscrepancy ? (
                                                <span style={{ color: difColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    {dif > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                                    {Math.abs(dif).toFixed(2)} {insumo.unidadMedida}
                                                </span>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const getModuleTitle = () => {
        switch (activeTab) {
            case 'platos':
                return 'Menú (Platos)';
            case 'insumos':
                return 'Inventario (Insumos)';
            case 'recetario':
                return 'Recetarios (Costeo)';
            case 'kardex':
                return 'Kardex de Inventario';
            case 'auditoria':
                return 'Auditoría de Insumos';
            default:
                return 'Logística';
        }
    };

    return (
        <div className="fade-in" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 10 }}><ArrowLeft size={24} /></button>
                    <h1 style={{ margin: 0 }}>{getModuleTitle()}</h1>
                </div>
            </div>

            {activeTab === 'platos' && renderPlatosTab()}
            {activeTab === 'insumos' && renderInsumosTab()}
            {activeTab === 'recetario' && renderRecetarioTab()}
            {activeTab === 'kardex' && renderKardexTab()}
            {activeTab === 'auditoria' && renderAuditoriaTab()}

            {/* Modal para Producto */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingProduct ? 'Editar Plato' : 'Nuevo Plato'}</h2>
                            <CloseButton onClick={() => setIsModalOpen(false)} className="scale-90" />
                        </div>
                        <form onSubmit={handleSubmitProduct} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <div style={{ display: 'flex', gap: 20 }}>
                                <div style={{ width: 100, height: 100, background: 'rgba(0,0,0,0.2)', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {formData.imagePreview ? <img src={formData.imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={30} className="text-muted" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Imagen del Plato</label>
                                    <input type="file" onChange={handleImageChange} accept="image/*" className="glass-input" />
                                </div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <label>Nombre del Plato</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                                    onKeyDown={handleKeyDownSuggestions}
                                    required
                                />

                                {/* Suggestions dropdown list */}
                                {showSuggestions && formData.nombre.length >= 2 && (
                                    <div
                                        className="absolute left-0 right-0 z-50 rounded-lg shadow-2xl overflow-hidden flex flex-col"
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            zIndex: 1000,
                                            backgroundColor: 'var(--bg-surface)',
                                            borderColor: 'var(--glass-border)',
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            marginTop: '4px',
                                            maxHeight: '220px',
                                            overflowY: 'auto',
                                            padding: '4px',
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)'
                                        }}
                                    >
                                        {/* Match counter header */}
                                        <div style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Sugerencias de Platos</span>
                                            <span>{suggestions.length} {suggestions.length === 1 ? 'coincidencia' : 'coincidencias'}</span>
                                        </div>

                                        {/* Items list */}
                                        <div style={{ padding: '4px 0' }}>
                                            {suggestions.map((item, index) => {
                                                const isHighlighted = index === highlightedIndex;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        className="flex items-center w-full px-3 py-2 rounded-md text-left cursor-pointer transition-all"
                                                        style={{
                                                            backgroundColor: isHighlighted ? 'var(--bg-secondary)' : 'transparent',
                                                            border: isHighlighted ? '1px solid var(--glass-border)' : '1px solid transparent',
                                                            color: 'var(--text-main)',
                                                            fontFamily: 'var(--font-sans)',
                                                            fontSize: '0.875rem',
                                                        }}
                                                        onMouseEnter={() => setHighlightedIndex(index)}
                                                        onClick={() => autocompleteProduct(item)}
                                                    >
                                                        <div style={{ marginRight: '10px', fontSize: '1rem' }}>🍲</div>
                                                        <div style={{ flex: 1 }}>
                                                            {highlightMatch(item.nombre, formData.nombre)}
                                                            {item.codigoInterno && (
                                                                <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    ({item.codigoInterno})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}

                                            {/* Force Create option */}
                                            <button
                                                type="button"
                                                className="flex items-center w-full px-3 py-2 rounded-md text-left cursor-pointer transition-all"
                                                style={{
                                                    backgroundColor: highlightedIndex === suggestions.length ? 'var(--bg-secondary)' : 'transparent',
                                                    border: highlightedIndex === suggestions.length ? '1px solid var(--glass-border)' : '1px solid transparent',
                                                    color: 'var(--text-main)',
                                                    fontFamily: 'var(--font-sans)',
                                                    fontSize: '0.875rem',
                                                    borderTop: '1px solid var(--glass-border)',
                                                    marginTop: 4,
                                                    fontWeight: '500'
                                                }}
                                                onMouseEnter={() => setHighlightedIndex(suggestions.length)}
                                                onClick={() => {
                                                    setEditingProduct(null);
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <div style={{ marginRight: '10px', fontSize: '1rem' }}>✨</div>
                                                <span>Crear nuevo plato: "{formData.nombre}"</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Exact Match Alert & Badge */}
                                {exactMatchProduct && (
                                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(96, 165, 250)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            <span>✓ Plato existente. Se actualizará este registro.</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'color-mix(in srgb, var(--primary) 70%, white)', fontWeight: '500' }}>
                                            ✓ Este plato ya existe. Guardar actualizará el plato existente.
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <label>Descripción</label>
                                <button type="button" onClick={handleGenerateDescription} disabled={isGenerating} style={{ background: 'linear-gradient(45deg, #7c3aed, #db2777)', border: 'none', borderRadius: 12, padding: '4px 10px', color: 'white', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Sparkles size={12} /> {isGenerating ? 'Generando...' : 'Generar IA'}
                                </button>
                            </div>
                            <textarea className="glass-input" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />

                            {formError && <div style={{ color: 'white', background: 'var(--danger)', padding: 10, borderRadius: 8, marginBottom: 15 }}>{formError}</div>}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div><label>Categoría</label><select className="glass-input" value={formData.categoriaId} onChange={e => setFormData({ ...formData, categoriaId: Number(e.target.value) })} required>{categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                                <div><label>Precio (S/.)</label><input type="number" step="0.01" className="glass-input" value={Number.isNaN(formData.precio) ? '' : formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.valueAsNumber })} required /></div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={formData.activo} onChange={e => setFormData({ ...formData, activo: e.target.checked })} /> Producto Activo</label>
                            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 10 }}>
                                <button type="submit" className="glass-button primary" style={{ width: '100%' }}><Save size={18} /> Guardar Plato</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Insumo */}
            {isInsumoModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingInsumo ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
                            <CloseButton onClick={() => setIsInsumoModalOpen(false)} className="scale-90" />
                        </div>
                        <form onSubmit={handleSubmitInsumo} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {formError && <div style={{ color: 'white', background: 'var(--danger)', padding: 10, borderRadius: 8, marginBottom: 15 }}>{formError}</div>}
                            <div>
                                <label>Nombre del Insumo</label>
                                <input type="text" className="glass-input" value={insumoForm.nombre} onChange={e => setInsumoForm({ ...insumoForm, nombre: e.target.value })} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Precio Compra Inicial (S/.)</label>
                                    <input type="number" step="0.01" className="glass-input" value={Number.isNaN(insumoForm.precioCompra) ? '' : insumoForm.precioCompra} onChange={e => setInsumoForm({ ...insumoForm, precioCompra: e.target.valueAsNumber })} required />
                                </div>
                                <div>
                                    <label>Medida Lógica</label>
                                    <select className="glass-input" value={insumoForm.unidadMedida} onChange={e => setInsumoForm({ ...insumoForm, unidadMedida: e.target.value })}>
                                        <option value="kg">Kilogramos (kg)</option>
                                        <option value="gr">Gramos (gr)</option>
                                        <option value="L">Litros (L)</option>
                                        <option value="ml">Mililitros (ml)</option>
                                        <option value="ud">Unidades (ud)</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Stock Física en Bodega</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="glass-input"
                                        value={Number.isNaN(insumoForm.stock) ? '' : insumoForm.stock}
                                        onChange={e => setInsumoForm({ ...insumoForm, stock: e.target.valueAsNumber })}
                                        required
                                    />
                                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 5 }}>Medida Actual.</p>
                                </div>
                                <div>
                                    <label>Stock Mínimo (Alerta)</label>
                                    <input type="number" step="0.01" className="glass-input" value={Number.isNaN(insumoForm.stockMinimo) ? '' : insumoForm.stockMinimo} onChange={e => {
                                        const val = e.target.valueAsNumber;
                                        setInsumoForm({ ...insumoForm, stockMinimo: val, notificarAlerta: (!Number.isNaN(val) && val !== null) ? insumoForm.notificarAlerta : false });
                                    }} />
                                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 5 }}>Nivel de escasez.</p>
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: (!insumoForm.stockMinimo || String(insumoForm.stockMinimo).trim() === '') ? 'not-allowed' : 'pointer', padding: '10px 0', opacity: (!insumoForm.stockMinimo || String(insumoForm.stockMinimo).trim() === '') ? 0.5 : 1 }}>
                                <input type="checkbox" checked={insumoForm.notificarAlerta} disabled={!insumoForm.stockMinimo || String(insumoForm.stockMinimo).trim() === ''} onChange={e => setInsumoForm({ ...insumoForm, notificarAlerta: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'inherit' }} />
                                Activar Alerta de Escasez en Dashboard
                            </label>
                            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 10 }}>
                                <button type="submit" className="glass-button primary" style={{ width: '100%' }}><Save size={18} /> Guardar Insumo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Movimiento Manual Kardex */}
            {isKardexModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Registrar Movimiento Manual</h2>
                            <CloseButton onClick={() => setIsKardexModalOpen(false)} className="scale-90" />
                        </div>
                        <form onSubmit={handleSaveKardexManual} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {formError && <div style={{ color: 'white', background: 'var(--danger)', padding: 10, borderRadius: 8 }}>{formError}</div>}
                            <div>
                                <label>Insumo</label>
                                <select className="glass-input" value={kardexForm.insumoId} onChange={e => setKardexForm({ ...kardexForm, insumoId: Number(e.target.value) })} required>
                                    <option value="">Seleccione un insumo...</option>
                                    {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidadMedida}) - Disp: {i.stock}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Tipo de Movimiento</label>
                                    <select className="glass-input" value={kardexForm.tipoMovimiento} onChange={e => setKardexForm({ ...kardexForm, tipoMovimiento: e.target.value })} required>
                                        <option value="COMPRA">COMPRA (+)</option>
                                        <option value="MERMA">MERMA (-)</option>
                                        <option value="TRANSFERENCIA">TRANSFERENCIA (-)</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Cantidad Afectada</label>
                                    <input type="number" step="0.01" className="glass-input" value={Number.isNaN(kardexForm.cantidad) ? '' : kardexForm.cantidad} onChange={e => setKardexForm({ ...kardexForm, cantidad: e.target.valueAsNumber })} required />
                                </div>
                            </div>
                            <div>
                                <label>Motivo / Justificación</label>
                                <input type="text" className="glass-input" placeholder="Ej: Fugas de agua, Ingreso de factura #123" value={kardexForm.motivo} onChange={e => setKardexForm({ ...kardexForm, motivo: e.target.value })} required />
                            </div>
                            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 10 }}>
                                <button type="submit" className="glass-button primary" style={{ width: '100%' }}><Save size={18} /> Registrar en Kardex</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Resumen de Importación */}
            {importModalOpen && (
                <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content glass-panel" style={{ maxWidth: '800px', width: '95%', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Upload size={22} style={{ color: 'var(--primary)' }} />
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Resumen de Importación</h2>
                            </div>
                            <CloseButton onClick={() => setImportModalOpen(false)} className="scale-90" />
                        </div>

                        {/* Analysis / Stepper Panel */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', padding: '10px 0' }}>
                            {/* Platos nuevos */}
                            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={16} style={{ color: '#10b981' }} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                                        {importStep1Status === 'pending' ? 'Analizando nuevos platos...' : `${importStats.newCount} platos nuevos serán creados.`}
                                    </span>
                                </div>
                                <div>
                                    {importStep1Status === 'pending' && (
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--glass-border)', background: 'transparent' }} />
                                    )}
                                    {importStep1Status === 'loading' && (
                                        <div className="w-5 h-5 border-2 border-t-[#10b981] border-slate-200/20 rounded-full animate-spin" />
                                    )}
                                    {importStep1Status === 'completed' && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}>
                                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Check size={12} style={{ color: '#ffffff' }} />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Platos actualizados */}
                            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Edit size={14} style={{ color: '#10b981' }} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                                        {importStep2Status === 'pending' ? 'Buscando platos existentes para actualizar...' : `${importStats.updateCount} platos serán actualizados.`}
                                    </span>
                                </div>
                                <div>
                                    {importStep2Status === 'pending' && (
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--glass-border)', background: 'transparent' }} />
                                    )}
                                    {importStep2Status === 'loading' && (
                                        <div className="w-5 h-5 border-2 border-t-[#10b981] border-slate-200/20 rounded-full animate-spin" />
                                    )}
                                    {importStep2Status === 'completed' && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}>
                                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Check size={12} style={{ color: '#ffffff' }} />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Filas omitidas */}
                            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: importStats.warningCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <AlertTriangle size={14} style={{ color: importStats.warningCount > 0 ? '#f59e0b' : '#10b981' }} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                                        {importStep3Status === 'pending' ? 'Analizando categorías y estados...' : `${importStats.warningCount} filas contienen errores leves (serán omitidas).`}
                                    </span>
                                </div>
                                <div>
                                    {importStep3Status === 'pending' && (
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--glass-border)', background: 'transparent' }} />
                                    )}
                                    {importStep3Status === 'loading' && (
                                        <div className={`w-5 h-5 border-2 ${importStats.warningCount > 0 ? 'border-t-[#f59e0b]' : 'border-t-[#10b981]'} border-slate-200/20 rounded-full animate-spin`} />
                                    )}
                                    {importStep3Status === 'completed' && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}>
                                            {importStats.warningCount > 0 ? (
                                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <AlertTriangle size={12} style={{ color: '#ffffff' }} />
                                                </div>
                                            ) : (
                                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Check size={12} style={{ color: '#ffffff' }} />
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Errores críticos */}
                            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: importStats.errorCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <X size={16} style={{ color: importStats.errorCount > 0 ? '#ef4444' : '#10b981' }} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
                                        {importStep4Status === 'pending' ? 'Validando campos obligatorios y precios...' : `${importStats.errorCount} filas contienen errores críticos (no se importarán).`}
                                    </span>
                                </div>
                                <div>
                                    {importStep4Status === 'pending' && (
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--glass-border)', background: 'transparent' }} />
                                    )}
                                    {importStep4Status === 'loading' && (
                                        <div className={`w-5 h-5 border-2 ${importStats.errorCount > 0 ? 'border-t-[#ef4444]' : 'border-t-[#10b981]'} border-slate-200/20 rounded-full animate-spin`} />
                                    )}
                                    {importStep4Status === 'completed' && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}>
                                            {importStats.errorCount > 0 ? (
                                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <X size={12} style={{ color: '#ffffff' }} />
                                                </div>
                                            ) : (
                                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Check size={12} style={{ color: '#ffffff' }} />
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Vista previa Table */}
                        {!importAnalysisLoading && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VISTA PREVIA DE FILAS</span>
                                <div className="glass-panel table-responsive" style={{ maxHeight: '220px', overflowY: 'auto', padding: 0, border: '1px solid var(--glass-border)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--table-header-bg)', textAlign: 'left', borderBottom: '1px solid var(--table-row-border)' }}>
                                                <th style={{ padding: '10px 15px', width: 60, textAlign: 'center' }}>Fila</th>
                                                <th style={{ padding: '10px 15px', width: 80, textAlign: 'center' }}>Estado</th>
                                                <th style={{ padding: '10px 15px' }}>Nombre</th>
                                                <th style={{ padding: '10px 15px', width: 120 }}>Categoría</th>
                                                <th style={{ padding: '10px 15px', width: 100, textAlign: 'right' }}>Precio</th>
                                                <th style={{ padding: '10px 15px', width: 250 }}>Detalle de Análisis</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importRows.map((r, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid var(--table-row-border)', background: r.statusIcon === '❌' ? 'rgba(239, 68, 68, 0.05)' : r.statusIcon === '⚠️' ? 'rgba(245, 158, 11, 0.05)' : 'transparent' }}>
                                                    <td style={{ padding: '10px 15px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{r.rowNumber}</td>
                                                    <td style={{ padding: '10px 15px', textAlign: 'center', fontSize: '1.1rem' }}>{r.statusIcon}</td>
                                                    <td style={{ padding: '10px 15px', color: 'var(--text-main)', fontWeight: '500' }}>{r.nombre || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Vacío</span>}</td>
                                                    <td style={{ padding: '10px 15px', color: 'var(--text-main)' }}>{r.categoriaNombre || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Vacío</span>}</td>
                                                    <td style={{ padding: '10px 15px', textAlign: 'right', fontFamily: 'Plus Jakarta Sans', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                                        {r.precio !== undefined && r.precio !== '' ? `S/. ${parseFloat(r.precio).toFixed(2)}` : <span style={{ color: '#ef4444' }}>-</span>}
                                                    </td>
                                                    <td style={{ padding: '10px 15px', color: r.error ? '#ef4444' : r.warning ? '#f59e0b' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '500' }}>
                                                        {r.error || r.warning || (r.statusIcon === '✏️' ? 'El plato ya existe y se actualizarán sus datos.' : 'Plato nuevo listo para ser creado.')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                            <button className="glass-button" onClick={() => setImportModalOpen(false)} style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
                                Cancelar
                            </button>
                            <button
                                className="glass-button primary"
                                onClick={handleConfirmImport}
                                disabled={importAnalysisLoading || isSavingImport || (importStats.newCount + importStats.updateCount === 0)}
                                style={{ padding: '10px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', opacity: (importAnalysisLoading || isSavingImport || (importStats.newCount + importStats.updateCount === 0)) ? 0.5 : 1, cursor: (importAnalysisLoading || isSavingImport || (importStats.newCount + importStats.updateCount === 0)) ? 'not-allowed' : 'pointer' }}
                            >
                                {isSavingImport ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" /> Procesando...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} /> Confirmar Importación
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Éxito de Importación */}
            {importSuccessModalOpen && (
                <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content glass-panel" style={{ maxWidth: '420px', width: '90%', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1] }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}
                        >
                            <Check size={36} style={{ color: '#10b981', strokeWidth: 3 }} />
                        </motion.div>

                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'black', color: 'var(--text-main)' }}>Importación Completada</h2>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Proceso masivo realizado con éxito</p>
                        </div>

                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: '15px 0', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', margin: '10px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>✅ Creados:</span>
                                <span style={{ fontWeight: 'bold', color: '#10b981' }}>{importStats.newCount} platos</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>✏️ Actualizados:</span>
                                <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{importStats.updateCount} platos</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>⚠️ Omitidos:</span>
                                <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{importStats.warningCount + importStats.errorCount} filas</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingTop: 8, borderTop: '1px dashed var(--glass-border)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>⏱️ Tiempo total:</span>
                                <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontFamily: 'Plus Jakarta Sans' }}>{importTimeTaken} segundos</span>
                            </div>
                        </div>

                        <button className="glass-button primary" onClick={() => setImportSuccessModalOpen(false)} style={{ width: '100%', padding: '12px' }}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryView;

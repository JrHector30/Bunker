require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const fs = require('fs-extra');
const sharp = require('sharp');
const OpenAI = require('openai'); // Import OpenAI

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Helper: Redondear a 2 decimales para evitar errores de precisión flotante
const round2 = (num) => Math.round((parseFloat(num) + Number.EPSILON) * 100) / 100;

// GLOBAL STATE for Simulation Metrics
// (Removed statsStartTime as per new logic)

// Initialize OpenAI (fails gracefully if no key)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-key', // Use dummy key to prevent crash if missing
});

// Ensure uploads directory exists (Read-only in Vercel production)
const uploadDir = path.join(__dirname, 'public', 'uploads', 'productos');
const uploadUsersDir = path.join(__dirname, 'public', 'uploads', 'usuarios');
if (process.env.NODE_ENV !== 'production') {
    try {
        fs.ensureDirSync(uploadDir);
        fs.ensureDirSync(uploadUsersDir);
    } catch (e) {
        console.warn('Could not create upload dirs. Ignored in Serverless environment.', e.message);
    }
}

// Configure Multer for Serverless (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
});
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Placeholder dinámico para Vercel Serverless (Sin disco persistente)
app.get('/uploads/:type/:file', (req, res) => {
    const { type, file } = req.params;
    
    // 1. Check client/public/uploads folder first (active developer workspace)
    let filePath = path.join(__dirname, '..', 'client', 'public', 'uploads', type, file);
    if (require('fs').existsSync(filePath)) {
        return res.sendFile(filePath);
    }

    // 2. Fallback: Check root public/uploads folder
    filePath = path.join(__dirname, '..', 'public', 'uploads', type, file);
    if (require('fs').existsSync(filePath)) {
        return res.sendFile(filePath);
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    if (type === 'usuarios') {
        res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`);
    } else {
        res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`);
    }
});

// --- ROUTES ---

// --- PRINTERS PROXY ENDPOINTS ---
// --- PRINTERS PROXY ENDPOINTS ---
app.get('/api/impresoras', async (req, res) => {
    const estacion = req.query.estacion || 'Caja';
    try {
        // Fetch Windows printers from local station cache
        const config = await prisma.configuracion.findUnique({
            where: { clave: `impresoras_disponibles_${estacion}` }
        });
        const winPrinters = config ? JSON.parse(config.valor) : [];
        const winPrintersMapped = winPrinters.map(p => ({
            id: `usb_${p.name}`,
            nombre: p.name,
            estacion,
            tipo: 'impresora',
            transport: 'USB',
            mac: null,
            ultimaIp: null,
            ultimoEstado: p.offline ? 'OFFLINE' : 'ONLINE',
            ultimaRespuestaMs: 0
        }));

        // Fetch registered Ethernet/USB printers from DB
        const netPrinters = await prisma.dispositivoRed.findMany({
            where: { estacion }
        });

        // Merge real-time offline status for USB printers registered in DB
        const combinedNet = netPrinters.map(dev => {
            if (dev.transport === 'USB') {
                const winMatch = winPrintersMapped.find(w => w.nombre === dev.nombre);
                return {
                    ...dev,
                    ultimoEstado: winMatch ? winMatch.ultimoEstado : 'OFFLINE'
                };
            }
            return dev;
        });

        // Combine with discovered Windows printers that are not yet registered
        const netNames = new Set(netPrinters.map(n => n.nombre));
        const newWin = winPrintersMapped.filter(w => !netNames.has(w.nombre));

        const combined = [...combinedNet, ...newWin];
        res.json(combined);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/impresoras/activa', async (req, res) => {
    const estacion = req.query.estacion || 'Caja';
    try {
        const activeDevice = await prisma.dispositivoRed.findFirst({
            where: { estacion, activo: true }
        });
        if (activeDevice) {
            res.json({ nombre: activeDevice.nombre, transport: activeDevice.transport, ultimaIp: activeDevice.ultimaIp });
        } else {
            // Legacy fallback
            const config = await prisma.configuracion.findUnique({
                where: { clave: `impresora_activa_${estacion}` }
            });
            res.json({ nombre: config ? config.valor : '', transport: 'USB' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/impresoras/seleccionar', async (req, res) => {
    const { nombre, estacion, transport, ip, mac } = req.body;
    const targetEstacion = estacion || 'Caja';
    const targetTransport = transport || 'USB';
    try {
        // 1. Marcar todas las impresoras de la estación como inactivas
        await prisma.dispositivoRed.updateMany({
            where: { estacion: targetEstacion },
            data: { activo: false }
        });

        // 2. Buscar o crear la impresora seleccionada en la base de datos
        const existing = await prisma.dispositivoRed.findFirst({
            where: { nombre: nombre, estacion: targetEstacion }
        });

        if (existing) {
            await prisma.dispositivoRed.update({
                where: { id: existing.id },
                data: { activo: true }
            });
        } else {
            await prisma.dispositivoRed.create({
                data: {
                    nombre,
                    estacion: targetEstacion,
                    tipo: 'impresora',
                    transport: targetTransport,
                    mac: mac || null,
                    ultimaIp: ip || null,
                    activo: true,
                    ultimoEstado: 'ONLINE'
                }
            });
        }

        // Fallback legacy
        await prisma.configuracion.upsert({
            where: { clave: `impresora_activa_${targetEstacion}` },
            update: { valor: nombre },
            create: { clave: `impresora_activa_${targetEstacion}`, valor: nombre }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/impresoras/solicitar-actualizacion', async (req, res) => {
    const { estacion } = req.body;
    const targetEstacion = estacion || 'Caja';
    try {
        await prisma.configuracion.upsert({
            where: { clave: 'solicitar_actualizacion_impresoras' },
            update: { valor: targetEstacion },
            create: { clave: 'solicitar_actualizacion_impresoras', valor: targetEstacion }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/impresoras/medida', async (req, res) => {
    const { impresora, medida, estacion } = req.body;
    const targetEstacion = estacion || 'Caja';
    try {
        const configKey = `impresora_medidas_${targetEstacion}`;
        const currentConfig = await prisma.configuracion.findUnique({
            where: { clave: configKey }
        });
        const map = currentConfig ? JSON.parse(currentConfig.valor) : {};
        map[impresora] = medida;

        await prisma.configuracion.upsert({
            where: { clave: configKey },
            update: { valor: JSON.stringify(map) },
            create: { clave: configKey, valor: JSON.stringify(map) }
        });

        // Sincronizar con la tabla de dispositivos de red si existe
        await prisma.dispositivoRed.updateMany({
            where: { nombre: impresora, estacion: targetEstacion },
            data: { medida }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/impresoras/medidas', async (req, res) => {
    const estacion = req.query.estacion || 'Caja';
    try {
        const config = await prisma.configuracion.findUnique({
            where: { clave: `impresora_medidas_${estacion}` }
        });
        const map = config ? JSON.parse(config.valor) : {};
        res.json(map);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/impresoras/perfil', async (req, res) => {
    const { impresora, perfil, estacion } = req.body;
    const targetEstacion = estacion || 'Caja';
    try {
        const configKey = `impresora_perfiles_${targetEstacion}`;
        const currentConfig = await prisma.configuracion.findUnique({
            where: { clave: configKey }
        });
        const map = currentConfig ? JSON.parse(currentConfig.valor) : {};
        map[impresora] = perfil;

        await prisma.configuracion.upsert({
            where: { clave: configKey },
            update: { valor: JSON.stringify(map) },
            create: { clave: configKey, valor: JSON.stringify(map) }
        });

        // Sincronizar con la tabla de dispositivos de red si existe
        await prisma.dispositivoRed.updateMany({
            where: { nombre: impresora, estacion: targetEstacion },
            data: { perfil }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/impresoras/perfiles', async (req, res) => {
    const estacion = req.query.estacion || 'Caja';
    try {
        const config = await prisma.configuracion.findUnique({
            where: { clave: `impresora_perfiles_${estacion}` }
        });
        const map = config ? JSON.parse(config.valor) : {};
        res.json(map);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/impresoras/estado-solicitud', async (req, res) => {
    const estacion = req.query.estacion || 'Caja';
    try {
        const config = await prisma.configuracion.findUnique({
            where: { clave: 'solicitar_actualizacion_impresoras' }
        });
        res.json({ solicitando: config ? config.valor === estacion : false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/impresoras/estaciones', async (req, res) => {
    try {
        const config = await prisma.configuracion.findUnique({
            where: { clave: 'estaciones_impresion' }
        });
        const list = config ? JSON.parse(config.valor) : ['Caja'];
        if (!list.includes('Caja')) {
            list.unshift('Caja');
        }
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RECOVERY ENDPOINTS ---
app.get('/api/recovery/dispositivos', async (req, res) => {
    const estacion = req.query.estacion || 'Caja';
    try {
        const devices = await prisma.dispositivoRed.findMany({
            where: { estacion }
        });
        res.json(devices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/recovery/descubiertos', async (req, res) => {
    const estacion = req.query.estacion || 'Caja';
    try {
        const config = await prisma.configuracion.findUnique({
            where: { clave: `impresoras_descubiertas_${estacion}` }
        });
        const discovered = config ? JSON.parse(config.valor) : [];

        // Traer dispositivos ya vinculados
        const linked = await prisma.dispositivoRed.findMany({
            where: { estacion }
        });
        const linkedMacs = new Set(linked.map(d => d.mac).filter(Boolean));

        // Filtrar no vinculados
        const filtered = discovered.filter(d => !linkedMacs.has(d.mac));
        res.json(filtered);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recovery/vincular', async (req, res) => {
    const { nombre, estacion, ip, mac, perfil, medida } = req.body;
    try {
        const device = await prisma.dispositivoRed.create({
            data: {
                nombre,
                estacion: estacion || 'Caja',
                tipo: 'impresora',
                transport: 'TCP9100',
                mac,
                ultimaIp: ip,
                perfil: perfil || 'Generic',
                medida: medida || '80mm',
                ultimoEstado: 'ONLINE'
            }
        });
        res.json({ success: true, device });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recovery/desvincular', async (req, res) => {
    const { deviceId } = req.body;
    try {
        await prisma.dispositivoRed.delete({
            where: { id: deviceId }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recovery/solicitar', async (req, res) => {
    const { deviceId, estacion } = req.body;
    try {
        await prisma.dispositivoRed.update({
            where: { id: deviceId },
            data: { ultimoEstado: 'RECOVERING' }
        });

        const payload = {
            estacion: estacion || 'Caja',
            accion: 'reparar',
            deviceId
        };

        await prisma.configuracion.upsert({
            where: { clave: 'solicitar_recovery_estacion' },
            update: { valor: JSON.stringify(payload) },
            create: { clave: 'solicitar_recovery_estacion', valor: JSON.stringify(payload) }
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/recovery/historial', async (req, res) => {
    const estacion = req.query.estacion || 'Caja';
    try {
        const history = await prisma.historialReparacion.findMany({
            where: { estacion },
            orderBy: { creadoA: 'desc' },
            take: 10
        });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/recovery/estado-estacion', async (req, res) => {
    const estacion = req.query.estacion || 'Caja';
    try {
        const latido = await prisma.configuracion.findUnique({
            where: { clave: `estacion_latido_${estacion}` }
        });
        if (!latido) {
            return res.json({ enLinea: false });
        }
        const diff = Date.now() - parseInt(latido.valor, 10);
        res.json({ enLinea: diff < 6000 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/configuracion/:clave', async (req, res) => {
    try {
        const config = await prisma.configuracion.findUnique({
            where: { clave: req.params.clave }
        });
        res.json({ valor: config ? config.valor : null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/configuracion/:clave', async (req, res) => {
    try {
        const config = await prisma.configuracion.upsert({
            where: { clave: req.params.clave },
            update: { valor: req.body.valor },
            create: { clave: req.params.clave, valor: req.body.valor }
        });
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/impresoras/imprimir', async (req, res) => {
    const { mesaId, mozo, contenido, estacion } = req.body;
    try {
        const ticket = await prisma.ticketPendiente.create({
            data: {
                mesa_id: String(mesaId),
                mozo: mozo || 'Sistema',
                contenido: contenido,
                impreso: false,
                estacion: estacion || 'Caja'
            }
        });
        res.json({ success: true, ticketId: ticket.id });
    } catch (err) {
        console.error("Error creating ticket:", err);
        res.status(500).json({ error: err.message });
    }
});

// 1. Users (Auth placeholder)
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { nombre: 'asc' }
        });
        res.json(Array.isArray(users) ? users : []);
    } catch (error) {
        console.error('❌ Error controlado en /api/users:', error);
        res.json([]); // Retorno seguro para evitar pantalla negra
    }
});

app.post('/api/users', async (req, res) => {
    const { nombre, usuario, rol, password, foto } = req.body;
    try {
        if (!password || password.length !== 6 || !/^\d+$/.test(password)) {
            return res.status(400).json({ error: "La contraseña debe tener exactamente 6 dígitos numéricos." });
        }
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        let correo = null;
        if (rol === 'admin') {
            const existingAdmin = await prisma.user.findFirst({
                where: { rol: 'admin', correo: { not: null } }
            });
            if (existingAdmin) {
                correo = existingAdmin.correo;
            }
        }

        const user = await prisma.user.create({
            data: { nombre, usuario, rol, password: hashedPassword, foto, correo }
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, usuario, rol, password, foto } = req.body;
    try {
        const updateData = {};
        if (nombre) updateData.nombre = nombre;
        if (usuario) updateData.usuario = usuario;
        if (rol) {
            updateData.rol = rol;
            if (rol === 'admin') {
                const existingAdmin = await prisma.user.findFirst({
                    where: { rol: 'admin', correo: { not: null } }
                });
                if (existingAdmin) {
                    updateData.correo = existingAdmin.correo;
                }
            } else {
                updateData.correo = null; // Remueve correo si ya no es admin
            }
        }
        if (password) {
            if (password.length !== 6 || !/^\d+$/.test(password)) {
                return res.status(400).json({ error: "La contraseña debe tener exactamente 6 dígitos numéricos." });
            }
            updateData.password = bcrypt.hashSync(password, 10);
        }
        if (foto !== undefined) updateData.foto = foto;

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        res.json(user);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(400).json({ error: "Error updating user: " + error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ message: "User deleted" });
    } catch (error) {
        res.status(400).json({ error: "Cannot delete user" });
    }
});

app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        const user = await prisma.user.findFirst({
            where: { usuario }
        });
        if (user) {
            const isMatch = bcrypt.compareSync(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: "Contraseña incorrecta" });
            }
            res.json(user);
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 2. Tables -> Moved to line 502

app.post('/api/tables', async (req, res) => {
    const { numero, capacidad } = req.body;
    const table = await prisma.mesa.create({
        data: { numero, capacidad }
    });
    res.json(table);
});

app.put('/api/tables/:id/status', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const table = await prisma.mesa.update({
        where: { id: parseInt(id) },
        data: { estado }
    });
    res.json(table);
});

// 3. Categories (NEW)
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await prisma.categoria.findMany({
            where: { deleted: false }, // Filter Soft Deleted
            orderBy: { orden: 'asc' },
            include: {
                _count: {
                    select: {
                        platos: {
                            where: { deleted: false }
                        }
                    }
                }
            }
        });
        res.json(categories);
    } catch (error) {
        console.error('❌ Error controlado en /api/categories:', error);
        res.json([]); // Retorno seguro para evitar pantalla negra y crash del servidor
    }
});

app.post('/api/categories', async (req, res) => {
    const { nombre, color, icono, orden, activo, enviarCocina } = req.body;
    try {
        const category = await prisma.categoria.create({
            data: {
                nombre,
                color,
                icono,
                orden: parseInt(orden || 0),
                activo: activo !== undefined ? activo : true,
                enviarCocina: enviarCocina !== undefined ? enviarCocina : true
            }
        });
        res.json(category);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, color, icono, orden, activo, enviarCocina } = req.body;

    try {
        const category = await prisma.categoria.update({
            where: { id: parseInt(id) },
            data: {
                nombre,
                color,
                icono,
                orden: orden ? parseInt(orden) : 0,
                activo,
                enviarCocina
            }
        });
        res.json(category);
    } catch (e) {
        console.error("Error updating category:", e);
        res.status(400).json({ error: "Error al actualizar categoría: " + e.message });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    const catId = parseInt(id);

    try {
        // SOFT DELETE Logic
        // 1. Soft delete all products in this category
        await prisma.plato.updateMany({
            where: { categoriaId: catId },
            data: { deleted: true, activo: false }
        });

        // 2. Soft delete the category
        await prisma.categoria.update({
            where: { id: catId },
            data: { deleted: true, activo: false }
        });

        res.json({ message: "Categoría y sus productos desactivados (Soft Delete)." });
    } catch (e) {
        console.error("Delete failed:", e);
        res.status(500).json({ error: "Error interno al eliminar: " + e.message });
    }
});

// 4. Products (Modified)
app.get('/api/products', async (req, res) => {
    try {
        const { categoriaId } = req.query;
        const where = { deleted: false }; // Base filter
        if (categoriaId) where.categoriaId = parseInt(categoriaId);

        const products = await prisma.plato.findMany({
            where,
            include: { categoria: true }
        });
        res.json(products);
    } catch (e) {
        console.error("Error fetching products:", e);
        res.status(500).json([]);
    }
});

app.post('/api/sync/operations', async (req, res) => {
    const { operationId, entity, entityId, operation, payload } = req.body;

    // 1. Validar campos mínimos de sincronización
    if (!operationId || !entity || !entityId || !operation || !payload) {
        return res.status(400).json({ error: "Faltan campos obligatorios en el contrato de sincronización." });
    }

    // 2. Restricción estricta de alcance (Solo PRODUCT CREATE en Fase 5B)
    if (entity !== 'PRODUCT' || operation !== 'CREATE') {
        return res.status(400).json({ error: `La combinación de entidad "${entity}" y operación "${operation}" no está soportada en la Fase 5B.` });
    }

    // 3. Validar payload mínimo del producto (no confiar en el cliente)
    const { nombre, precio, categoriaId, descripcion, imagen } = payload;
    if (!nombre || nombre.toString().trim() === '') {
        return res.status(400).json({ error: "El nombre del plato es obligatorio." });
    }
    const parsedPrecio = parseFloat(precio);
    if (Number.isNaN(parsedPrecio) || parsedPrecio <= 0) {
        return res.status(400).json({ error: "El precio del plato debe ser un número positivo válido." });
    }
    const parsedCategoriaId = parseInt(categoriaId);
    if (Number.isNaN(parsedCategoriaId)) {
        return res.status(400).json({ error: "Debe seleccionar una categoría válida." });
    }

    try {
        // Verificar que la categoría realmente exista en el servidor
        const categoryExists = await prisma.categoria.findUnique({
            where: { id: parsedCategoriaId }
        });
        if (!categoryExists) {
            return res.status(400).json({ error: `La categoría con ID ${parsedCategoriaId} no existe.` });
        }

        // 4. Procesar dentro de una transacción interactiva de Prisma
        const syncResult = await prisma.$transaction(async (tx) => {
            // A. Intentar insertar el registro de idempotencia en estado PROCESSING
            // Lanza error Prisma P2002 si el operationId ya está tomado
            const syncOp = await tx.syncOperation.create({
                data: {
                    operationId,
                    entity,
                    entityId,
                    operation,
                    status: 'PROCESSING',
                    requestPayload: payload
                }
            });

            // B. Aplicar mutación de negocio (Crear Plato)
            const product = await tx.plato.create({
                data: {
                    nombre: nombre.toString().trim(),
                    precio: parsedPrecio,
                    categoriaId: parsedCategoriaId,
                    descripcion: descripcion || '',
                    imagen: imagen || null
                }
            });

            const businessResult = {
                localEntityId: entityId,
                remoteEntityId: product.id,
                product
            };

            // C. Actualizar estado a COMPLETED y guardar el payload de resultado
            await tx.syncOperation.update({
                where: { id: syncOp.id },
                data: {
                    status: 'COMPLETED',
                    resultPayload: businessResult,
                    completedAt: new Date()
                }
            });

            return businessResult;
        });

        return res.json({
            success: true,
            duplicate: false,
            result: syncResult
        });

    } catch (error) {
        // 5. Manejo seguro de violación de restricción UNIQUE (Prisma P2002) fuera de la transacción abortada
        if (error.code === 'P2002') {
            try {
                const existingOp = await prisma.syncOperation.findUnique({
                    where: { operationId }
                });

                if (!existingOp) {
                    return res.status(500).json({ error: "Error de consistencia en el log de idempotencia." });
                }

                // Caso A: Operación ya completada exitosamente -> retornar resultado persistido
                if (existingOp.status === 'COMPLETED') {
                    return res.json({
                        success: true,
                        duplicate: true,
                        result: existingOp.resultPayload
                    });
                }

                // Caso B: Operación en procesamiento remoto
                if (existingOp.status === 'PROCESSING') {
                    const threshold = 10 * 60 * 1000; // 10 minutos
                    const opTime = new Date(existingOp.createdAt).getTime();

                    // Política de PROCESSING remoto atascado: liberar si superó el timeout de 10 minutos
                    if (Date.now() - opTime > threshold) {
                        await prisma.syncOperation.update({
                            where: { id: existingOp.id },
                            data: {
                                status: 'FAILED',
                                errorPayload: { message: "Operación remota liberada tras expirar en PROCESSING por más de 10 minutos." }
                            }
                        });
                        return res.status(409).json({
                            error: "La operación concurrente anterior expiró. Se ha liberado el bloqueo lógico. Por favor, reintente.",
                            pendingProcessing: true
                        });
                    }

                    // En procesamiento normal concurrentemente
                    return res.status(409).json({
                        error: "La operación ya está siendo procesada de forma concurrente.",
                        pendingProcessing: true
                    });
                }

                // Caso C: Falló previamente
                return res.status(500).json({
                    error: "La operación de sincronización falló previamente en el servidor.",
                    errorPayload: existingOp.errorPayload
                });
            } catch (errDb) {
                return res.status(500).json({ error: "Fallo al consultar registro de idempotencia existente: " + errDb.message });
            }
        }

        // 6. Si es otro error inesperado de negocio, marcar la operación como FAILED para no dejarla colgada en PROCESSING
        try {
            await prisma.syncOperation.update({
                where: { operationId },
                data: {
                    status: 'FAILED',
                    errorPayload: { message: error.message }
                }
            });
        } catch (e) {
            // Ignorar si no se alcanzó a crear la fila o el fallo ocurrió antes del insert
        }

        console.error("Error en sync endpoint:", error);
        return res.status(500).json({ error: "Error interno al sincronizar operación: " + error.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { nombre, precio, categoriaId, descripcion, imagen } = req.body;
    try {
        const product = await prisma.plato.create({
            data: {
                nombre,
                precio: precio,
                categoriaId: categoriaId,
                descripcion,
                imagen
            }
        });
        res.json(product);
    } catch (e) {
        console.error("Error creating product:", e);
        res.status(400).json({ error: "Error al crear producto: " + e.message });
    }
});

app.post('/api/products/bulk', async (req, res) => {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
        return res.status(400).json({ error: "Invalid products array." });
    }

    try {
        const categories = await prisma.categoria.findMany({ where: { deleted: false } });
        const existingProducts = await prisma.plato.findMany({ where: { deleted: false } });

        const normalize = (str) => {
            if (!str) return '';
            return str.toString()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, ' ')
                .trim();
        };

        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[normalize(cat.nombre)] = cat.id;
        });

        const productMap = {};
        existingProducts.forEach(prod => {
            productMap[normalize(prod.nombre)] = prod;
        });

        let createdCount = 0;
        let updatedCount = 0;

        for (const item of products) {
            const normName = normalize(item.nombre);
            const normCatName = normalize(item.categoriaNombre);
            const catId = categoryMap[normCatName];

            if (!catId) continue; // skip invalid categories

            const isActivo = item.activo !== undefined ? item.activo : true;
            const existingProduct = productMap[normName];

            if (existingProduct) {
                await prisma.plato.update({
                    where: { id: existingProduct.id },
                    data: {
                        precio: parseFloat(item.precio),
                        descripcion: item.descripcion || '',
                        categoriaId: catId,
                        activo: isActivo
                    }
                });
                updatedCount++;
            } else {
                await prisma.plato.create({
                    data: {
                        nombre: item.nombre.toString().trim(),
                        precio: parseFloat(item.precio),
                        descripcion: item.descripcion || '',
                        categoriaId: catId,
                        activo: isActivo
                    }
                });
                createdCount++;
            }
        }

        res.json({ success: true, createdCount, updatedCount });
    } catch (e) {
        console.error("Error bulk importing products:", e);
        res.status(500).json({ error: "Error al realizar importación masiva: " + e.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        // Safe Data Construction
        const updateData = {};
        if (data.nombre) updateData.nombre = data.nombre;
        if (data.descripcion !== undefined) updateData.descripcion = data.descripcion; // Allow clearing?
        if (data.precio !== undefined) updateData.precio = data.precio;
        if (data.categoriaId !== undefined) updateData.categoriaId = data.categoriaId;
        if (data.imagen) updateData.imagen = data.imagen; // Allow new image
        if (data.activo !== undefined) updateData.activo = data.activo;

        const product = await prisma.plato.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        res.json(product);
    } catch (e) {
        console.error("Error updating product:", e);
        res.status(400).json({ error: "Error al actualizar producto: " + e.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Soft Delete
        await prisma.plato.update({
            where: { id: parseInt(id) },
            data: { deleted: true, activo: false }
        });
        res.json({ message: "Product soft deleted" });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ error: "Error deleting product: " + error.message });
    }
});

// AI Description Generator
app.post('/api/generate-description', async (req, res) => {
    const { productName, categoryName } = req.body;
    if (!productName) return res.status(400).json({ error: "Product name is required" });

    // Helper: Normalize
    const p = productName.toLowerCase();
    const c = (categoryName || '').toLowerCase(); // "bebidas", "postres", "platos de fondo"

    // Helper: Detect Type (Food, Drink, Dessert)
    let type = 'comida'; // Default
    if (c.includes('bebida') || c.includes('refresco') || c.includes('jugo') || c.includes('bar')) {
        type = 'bebida';
    } else if (c.includes('postre') || c.includes('dulce')) {
        type = 'postre';
    }

    // Heuristics for Brands (Override category if obvious)
    const knownDrinkBrands = ['coca', 'inca', 'fanta', 'sprite', 'pepsi', 'cerveza', 'agua', 'cusqueña', 'pilsen'];
    if (knownDrinkBrands.some(b => p.includes(b))) {
        type = 'bebida';
    }

    // MOCK MODE Logic
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock-key') {
        console.log(`[AI-MOCK] Generating description for: ${productName} (Type: ${type})`);

        let desc = "";

        if (type === 'bebida') {
            // Rule: Temp, Size, Pairing
            if (p.includes('coca') || p.includes('inca') || p.includes('gas')) {
                desc = "Gaseosa helada de 500ml, burbujeante y refrescante. El acompañante ideal para cortar la grasa y limpiar el paladar.";
            } else if (p.includes('jugo') || p.includes('limonada')) {
                desc = "Preparado al momento con frutas de estación. 100% natural, servido bien frío para combatir el calor.";
            } else if (p.includes('cerveza')) {
                desc = "Cerveza premium bien fría de 620ml. Notas de malta y un amargor equilibrado, perfecta para compartir.";
            } else if (p.includes('agua')) {
                desc = "Agua purificada de 600ml, disponible con o sin gas. Vital para una hidratación ligera.";
            } else {
                desc = "Refrescante bebida servida a temperatura ideal. La opción clásica para completar tu mesa.";
            }
        } else if (type === 'postre') {
            // Rule: Texture, Sweetness
            if (p.includes('torta') || p.includes('cake')) {
                desc = "Bizcocho húmedo y esponjoso, con el dulzor exacto y una textura que se deshace en la boca.";
            } else if (p.includes('helado')) {
                desc = "Cremosidad intensa y sabor puro. Servido a la temperatura perfecta para disfrutar su suavidad.";
            } else if (p.includes('flan') || p.includes('leche')) {
                desc = "Textura sedosa y caramelo líquido. Un clásico de suavidad inigualable y dulzor reconfortante.";
            } else {
                desc = "El cierre dulce perfecto. Texturas suaves y sabores equilibrados para deleitar el paladar.";
            }
        } else {
            // Food: Flavor, Cooking Method, Brief
            if (p.includes('ceviche')) {
                desc = "Pescado fresco marinado al momento en limón sutil y ají limo. Sabor vibrante y equilibrado.";
            } else if (p.includes('lomo')) {
                desc = "Trozos de carne sellados al wok a fuego alto. Sabor ahumado intenso con cebolla crujiente y tomate.";
            } else if (p.includes('arroz')) {
                desc = "Graneado perfecto y salteado al wok. Una explosión de sabores ahumados integrados con carne y verduras.";
            } else if (p.includes('pollo')) {
                desc = "Jugoso por dentro y dorado por fuera. Sazonado con especias tradicionales y cocido lentamente.";
            } else if (p.includes('hamburguesa')) {
                desc = "Carne jugosa a la parrilla con queso fundido. Sabores intensos y texturas clásicas.";
            } else if (p.includes('caldo') || p.includes('sopa')) {
                desc = "Concentrado de sabores caseros cocinado a fuego lento. Reconfortante y sustancioso.";
            } else {
                desc = "Preparación clásica con sazón tradicional. Ingredientes seleccionados para resaltar el sabor auténtico.";
            }
        }

        return res.json({
            description: desc,
            mode: 'mock_context_aware'
        });
    }

    // REAL AI MODE
    try {
        const systemPrompt = `Eres un experto redactor gastronómico (copywriter) para menús móviles.
        
        REGLAS ESTRICTAS:
        1. Contexto: El producto es de tipo "${type.toUpperCase()}". Adaptate a ello.
        2. Longitud: Máximo 2 oraciones cortas.
        3. Tono: Vendedor pero honesto. Nada de poesía barata.
        4. PROHIBIDO: No uses "Delicioso plato de", "Ingredientes frescos", "Experiencia culinaria".
        
        PAUTAS POR TIPO:
        - Si es BEBIDA: Menciona temperatura (helada/fría), volumen aprox si aplica, y sensación (refrescante/digestiva).
        - Si es COMIDA: Menciona método de cocción (wok/parrilla/horno) y perfil de sabor (ahumado/jugoso/picante).
        - Si es POSTRE: Menciona textura (cremoso/esponjoso/crujiente) y nivel de dulzor.
        
        Genera una descripción única para vender el producto: "${productName}".`;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: productName }
            ],
            model: "gpt-3.5-turbo",
            max_tokens: 60,
            temperature: 0.7
        });

        res.json({
            description: completion.choices[0].message.content,
            mode: 'ai_context_aware'
        });
    } catch (error) {
        console.error("OpenAI Error:", error);
        res.status(500).json({ error: "Error generating description" });
    }
});

// Image Upload
app.post('/api/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        // Convert to WebP and resize in memory
        const buffer = await sharp(req.file.buffer)
            .resize({ width: 300, withoutEnlargement: true })
            .webp({ quality: 60 })
            .toBuffer();

        const base64Data = `data:image/webp;base64,${buffer.toString('base64')}`;

        res.json({ url: base64Data });
    } catch (error) {
        console.error("Upload/Processing Error:", error);
        res.status(500).json({ error: "Error processing upload" });
    }
});


// 5. Orders (Comandas)
app.get('/api/orders', async (req, res) => {
    // For Kitchen: Fetch active orders
    const { status } = req.query;
    const where = status ? { estado: status } : { estado: { in: ['enviada', 'preparando', 'lista'] } };

    const orders = await prisma.comanda.findMany({
        where,
        include: {
            mesa: true,
            detalles: {
                include: {
                    plato: true,
                    cocinero: true // Include cook info
                }
            }
        },
        orderBy: { fecha: 'asc' }
    });

    // Hotfix: Manually fetch 'comensales' since Prisma Client is outdated
    for (const order of orders) {
        try {
            const raw = await prisma.$queryRawUnsafe(`SELECT comensales FROM "Comanda" WHERE id = ${order.id}`);
            if (raw[0]) order.comensales = raw[0].comensales;
        } catch (e) {
            console.error("Error fetching comensales raw:", e.message);
        }
    }

    res.json(orders);
});

// 5.1 Tables Endpoint (Modified for Comensales)
app.get('/api/tables', async (req, res) => {
    try {
        const { estado } = req.query;
        const where = {};
        if (estado) {
            where.estado = estado;
        }

        const tables = await prisma.mesa.findMany({
            where,
            orderBy: { numero: 'asc' },
            select: {
                id: true,
                numero: true,
                capacidad: true,
                estado: true,
                posX: true,
                posY: true,
                forma: true,
                mesaPadreId: true,
                mesasHijas: {
                    select: {
                        id: true,
                        numero: true,
                        capacidad: true,
                        estado: true
                    }
                },
                comandas: {
                    where: { estado: { notIn: ['cerrada', 'anulada'] } },
                    take: 1,
                    orderBy: { id: 'desc' },
                    select: {
                        id: true,
                        estado: true,
                        comensales: true,
                        fecha: true,
                        usuario: {
                            select: { id: true, nombre: true, rol: true }
                        },
                        detalles: {
                            where: { estado: { notIn: ['anulado'] } },
                            select: {
                                id: true,
                                cantidad: true,
                                estado: true,
                                observacion: true,
                                cocinero: {
                                    select: { nombre: true }
                                },
                                plato: {
                                    select: {
                                        id: true,
                                        nombre: true,
                                        precio: true,
                                        categoria: { select: { enviarCocina: true } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        res.json(tables);
    } catch (error) {
        console.error('❌ Error optimizando /api/tables:', error);
        res.json([]);
    }
});

// Collision check helper function on the server side
function checkCollisionServer(tableId, targetPosX, targetPosY, allTables) {
    const table = allTables.find(t => t.id === tableId);
    if (!table) return false;
    
    // Width and height remain 8.33% and 11.76% (100px x 100px)
    const widthPct = 8.33;
    const heightPct = 11.76;
    
    const rect1 = {
        left: targetPosX - widthPct / 2,
        right: targetPosX + widthPct / 2,
        top: targetPosY - heightPct / 2,
        bottom: targetPosY + heightPct / 2
    };

    for (const other of allTables) {
        if (other.id === tableId) continue;
        if (other.mesaPadreId === table.id || table.mesaPadreId === other.id) continue;
        
        const otherWidthPct = 8.33;
        const otherHeightPct = 11.76;
        
        const otherPosX = other.posX ?? 15;
        const otherPosY = other.posY ?? 25;
        
        const rect2 = {
            left: otherPosX - otherWidthPct / 2,
            right: otherPosX + otherWidthPct / 2,
            top: otherPosY - otherHeightPct / 2,
            bottom: otherPosY + otherHeightPct / 2
        };
        
        const overlapX = rect1.left < rect2.right && rect1.right > rect2.left;
        const overlapY = rect1.top < rect2.bottom && rect1.bottom > rect2.top;
        
        if (overlapX && overlapY) {
            return true;
        }
    }
    return false;
}

// GET /api/config/tables-edit-mode
app.get('/api/config/tables-edit-mode', async (req, res) => {
    try {
        let config = await prisma.configuracion.findUnique({ where: { clave: 'tables_edit_mode' } });
        if (!config) {
            config = await prisma.configuracion.create({ data: { clave: 'tables_edit_mode', valor: 'false' } });
        }
        res.json({ enabled: config.valor === 'true' });
    } catch (e) {
        console.error("Error reading edit mode config:", e);
        res.json({ enabled: false });
    }
});

// POST /api/config/tables-edit-mode
app.post('/api/config/tables-edit-mode', async (req, res) => {
    const { enabled } = req.body;
    try {
        const config = await prisma.configuracion.upsert({
            where: { clave: 'tables_edit_mode' },
            update: { valor: String(enabled) },
            create: { clave: 'tables_edit_mode', valor: String(enabled) }
        });
        res.json({ success: true, enabled: config.valor === 'true' });
    } catch (e) {
        console.error("Error updating edit mode config:", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/tables/positions (Batch update table positions)
app.post('/api/tables/positions', async (req, res) => {
    const { positions } = req.body;
    try {
        if (!Array.isArray(positions)) {
            return res.status(400).json({ error: "positions must be an array" });
        }

        const allTables = await prisma.mesa.findMany({
            include: { mesasHijas: true }
        });

        const tempTables = allTables.map(t => {
            const update = positions.find(p => p.id === t.id);
            if (update) {
                return { ...t, posX: parseFloat(update.posX), posY: parseFloat(update.posY) };
            }
            return t;
        });

        for (const update of positions) {
            const tableId = parseInt(update.id);
            const posX = parseFloat(update.posX);
            const posY = parseFloat(update.posY);

            const collides = checkCollisionServer(tableId, posX, posY, tempTables);
            if (collides) {
                const tbl = allTables.find(t => t.id === tableId);
                return res.status(400).json({ error: `La Mesa ${tbl ? tbl.numero : tableId} colisiona en su nueva posición.` });
            }
        }

        await prisma.$transaction(
            positions.map(p => prisma.mesa.update({
                where: { id: parseInt(p.id) },
                data: { posX: parseFloat(p.posX), posY: parseFloat(p.posY) }
            }))
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Error saving positions in bulk:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tables/merge
app.post('/api/tables/merge', async (req, res) => {
    const { mesaPadreId, mesaHijaId } = req.body;
    try {
        const padreId = parseInt(mesaPadreId);
        const hijaId = parseInt(mesaHijaId);

        if (padreId === hijaId) {
            return res.status(400).json({ error: "No se puede unir una mesa consigo misma" });
        }

        const padre = await prisma.mesa.findUnique({
            where: { id: padreId },
            include: { comandas: { where: { estado: { notIn: ['cerrada', 'anulada'] } } } }
        });
        const hija = await prisma.mesa.findUnique({ where: { id: hijaId } });

        if (!padre) return res.status(404).json({ error: "Mesa padre no encontrada" });
        if (!hija) return res.status(404).json({ error: "Mesa hija no encontrada" });

        // 1. La mesa padre debe estar 'libre' o 'ocupada' (no 'cerrada' o restringida)
        // 2. La mesa hija debe estar 'libre'
        if (hija.estado !== 'libre') {
            return res.status(400).json({ error: "La mesa hija debe estar libre" });
        }
        // 3. La mesa hija NO debe tener ya un mesaPadreId (no se permiten cadenas)
        if (hija.mesaPadreId !== null) {
            return res.status(400).json({ error: "La mesa hija ya está unida a otra mesa" });
        }
        // 4. Una mesa padre no puede ser hija de otra (mesaPadreId === null)
        if (padre.mesaPadreId !== null) {
            return res.status(400).json({ error: "Una mesa hija no puede ser padre de otra" });
        }

        // Acción: actualizar mesaHija.mesaPadreId = mesaPadreId, mesaHija.estado = padre.estado
        const updatedHija = await prisma.mesa.update({
            where: { id: hijaId },
            data: { mesaPadreId: padreId, estado: padre.estado }
        });

        res.json({ success: true, hija: updatedHija });
    } catch (error) {
        console.error("Error merging tables:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tables/unmerge
app.post('/api/tables/unmerge', async (req, res) => {
    const { mesaHijaId } = req.body;
    try {
        const hijaId = parseInt(mesaHijaId);
        const hija = await prisma.mesa.findUnique({ where: { id: hijaId } });
        if (!hija) return res.status(404).json({ error: "Mesa hija no encontrada" });
        if (!hija.mesaPadreId) return res.status(400).json({ error: "La mesa no está unida a ninguna mesa padre" });

        const padre = await prisma.mesa.findUnique({
            where: { id: hija.mesaPadreId },
            include: { comandas: { where: { estado: { notIn: ['cerrada', 'anulada'] } } } }
        });

        // Solo permitir si la mesa padre sigue con comanda activa (para no dejar inconsistencias)
        // O si ambas están libres
        if (padre && padre.estado === 'ocupada' && padre.comandas.length === 0) {
            return res.status(400).json({ error: "Solo se puede separar si la mesa padre sigue con comanda activa o ambas están libres" });
        }

        // Acción: actualizar mesaHija.mesaPadreId = null, mesaHija.estado = 'libre'
        const updatedHija = await prisma.mesa.update({
            where: { id: hijaId },
            data: { mesaPadreId: null, estado: 'libre' }
        });

        res.json({ success: true, hija: updatedHija });
    } catch (error) {
        console.error("Error unmerging tables:", error);
        res.status(500).json({ error: error.message });
    }
});

// Kitchen Queue Endpoint (Item-based)
app.get('/api/kitchen/queue', async (req, res) => {
    const queue = await prisma.detalleComanda.findMany({
        where: {
            estado: { notIn: ['entregado', 'anulado'] }, // Show everything not yet delivered or cancelled
            comanda: { estado: { notIn: ['cerrada', 'anulada'] } }, // Only active orders
            plato: {
                categoria: { enviarCocina: true } // FILTER: Only Kitchen Categories
            }
        },
        include: {
            plato: true,
            comanda: { include: { mesa: { include: { mesasHijas: true } } } },
            cocinero: true
        },
        orderBy: { id: 'asc' } // FIFO
    });
    res.json(queue);
});

app.post('/api/orders', async (req, res) => {
    // Validar estado de caja antes de permitir comandas
    const cajaActiva = await prisma.arqueo.findFirst({
        where: { estado: 'abierto' }
    });

    if (!cajaActiva) {
        return res.status(400).json({ error: "Operación denegada. Se requiere la apertura de caja para iniciar comandas." });
    }

    const { mesaId, usuarioId, detalles } = req.body;

    // Hotfix: Check if there are MULTIPLE active orders due to desyncs
    const activeOrders = await prisma.comanda.findMany({
        where: { mesaId: parseInt(mesaId), estado: { notIn: ['cerrada', 'anulada'] } },
        orderBy: { id: 'desc' } // Newest first
    });

    let order = activeOrders.length > 0 ? activeOrders[0] : null;

    // Self-heal: If there are older orphaned orders on this table, anulate them to prevent array collisions in Frontend
    if (activeOrders.length > 1) {
        for (let i = 1; i < activeOrders.length; i++) {
            await prisma.comanda.update({
                where: { id: activeOrders[i].id },
                data: { estado: 'anulada' }
            });
            console.log(`Auto-Healed: Cancelled orphaned comanda ${activeOrders[i].id} on Mesa ${mesaId}`);
        }
    }

    console.log(`Mesa ${mesaId}: Buscando orden activa... Encontrada: ${order ? order.id : 'NINGUNA. Generando NUEVO orderId.'}`);

    if (!order) {
        order = await prisma.comanda.create({
            data: {
                mesaId: parseInt(mesaId),
                usuarioId: parseInt(usuarioId),
                estado: 'enviada',
                comensales: parseInt(req.body.comensales || 1),
                detalles: {
                    create: detalles.map(d => ({
                        platoId: d.platoId,
                        cantidad: d.cantidad,
                        estado: 'pendiente',
                        observacion: d.observacion || null
                    }))
                }
            },
            include: { detalles: true }
        });
        // Update table status
        await prisma.mesa.update({
            where: { id: parseInt(mesaId) },
            data: { estado: 'ocupada' }
        });

        // Sincronizar estado de mesas hijas
        await prisma.mesa.updateMany({
            where: { mesaPadreId: parseInt(mesaId) },
            data: { estado: 'ocupada' }
        });
    } else {
        // Self-Healing: If for any reason the mesa was visually 'libre', force it back to 'ocupada'
        await prisma.mesa.update({
            where: { id: parseInt(mesaId) },
            data: { estado: 'ocupada' }
        });

        // Sincronizar estado de mesas hijas
        await prisma.mesa.updateMany({
            where: { mesaPadreId: parseInt(mesaId) },
            data: { estado: 'ocupada' }
        });

        // Append to existing order
        for (const d of detalles) {
            let existingDetail = null;
            if (!d.observacion) {
                existingDetail = await prisma.detalleComanda.findFirst({
                    where: {
                        comandaId: order.id,
                        platoId: d.platoId,
                        estado: 'pendiente',
                        observacion: null
                    }
                });
            }

            if (existingDetail) {
                await prisma.detalleComanda.update({
                    where: { id: existingDetail.id },
                    data: { cantidad: existingDetail.cantidad + d.cantidad }
                });
            } else {
                await prisma.detalleComanda.create({
                    data: {
                        comandaId: order.id,
                        platoId: d.platoId,
                        cantidad: d.cantidad,
                        estado: 'pendiente',
                        observacion: d.observacion || null
                    }
                });
            }
        }
    }

    res.json(order);
});

// Transfer Table Endpoint
app.post('/api/tables/transfer', async (req, res) => {
    const { fromTableId, toTableId } = req.body;

    try {
        const toTable = await prisma.mesa.findUnique({ where: { id: parseInt(toTableId) } });
        if (toTable.estado !== 'libre') {
            return res.status(400).json({ error: 'La mesa de destino debe estar libre.' });
        }

        // Find ALL active comandas for source table (including ghosts)
        const activeComandas = await prisma.comanda.findMany({
            where: { mesaId: parseInt(fromTableId), estado: { in: ['pendiente', 'enviada', 'preparando', 'lista', 'entregada'] } } // Any active state
        });

        if (activeComandas.length === 0) {
            return res.status(400).json({ error: 'Mesa de origen sin pedido activo.' });
        }

        // Prepare updates for all active comandas
        const updates = activeComandas.map(comanda =>
            prisma.comanda.update({
                where: { id: comanda.id },
                data: { mesaId: parseInt(toTableId) }
            })
        );

        // Transaction: Update Comandas -> Update Old Table -> Update New Table -> Unmerge old daughters
        await prisma.$transaction([
            ...updates,
            prisma.mesa.update({
                where: { id: parseInt(fromTableId) },
                data: { estado: 'libre' }
            }),
            prisma.mesa.update({
                where: { id: parseInt(toTableId) },
                data: { estado: 'ocupada' }
            }),
            prisma.mesa.updateMany({
                where: { mesaPadreId: parseInt(fromTableId) },
                data: { mesaPadreId: null, estado: 'libre' }
            })
        ]);

        res.json({ message: 'Traslado exitoso' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const order = await prisma.comanda.update({
        where: { id: parseInt(id) },
        data: { estado }
    });
    res.json(order);
});

// Update comensales count for an active order
app.put('/api/orders/:id/comensales', async (req, res) => {
    const { id } = req.params;
    const { comensales } = req.body;
    try {
        const orderId = parseInt(id);
        const updatedOrder = await prisma.comanda.update({
            where: { id: orderId },
            data: { comensales: parseInt(comensales) }
        });
        res.json({ success: true, order: updatedOrder });
    } catch (e) {
        console.error("Error updating comensales count:", e);
        res.status(500).json({ error: e.message });
    }
});

// Update specific order detail (Status or Quantity)
app.put('/api/orders/details/:id', async (req, res) => {
    const { id } = req.params;
    const { estado, cantidad, cocineroId } = req.body;

    // Prepare data object dynamically
    const data = {};
    if (estado) {
        data.estado = estado;
        // Timestamp Logic
        if (estado === 'preparando') data.fechaPreparacion = new Date();
        if (estado === 'listo') data.fechaListo = new Date();
    }
    if (cantidad) data.cantidad = parseInt(cantidad);
    if (cocineroId) data.cocineroId = parseInt(cocineroId);

    try {
        const detail = await prisma.detalleComanda.update({
            where: { id: parseInt(id) },
            data,
            include: { cocinero: true } // Return cook info
        });
        res.json(detail);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// List cashier sessions (arqueos) that started on a given date (YYYY-MM-DD local time)
app.get('/api/staff/stats/sessions', async (req, res) => {
    const { date } = req.query; // Expect YYYY-MM-DD
    if (!date) return res.status(400).json({ error: "Date is required" });

    try {
        // Convert YYYY-MM-DD to local Peru Time range (UTC-5)
        const start = new Date(`${date}T00:00:00.000-05:00`);
        const end = new Date(`${date}T23:59:59.999-05:00`);

        const arqueos = await prisma.arqueo.findMany({
            where: {
                OR: [
                    { fechaInicio: { gte: start, lte: end } },
                    { fechaFin: { gte: start, lte: end } }
                ]
            },
            orderBy: { id: 'asc' }
        });

        const arqueosWithUsers = await Promise.all(arqueos.map(async (arq) => {
            const userObj = await prisma.user.findUnique({
                where: { id: arq.usuarioId },
                select: { nombre: true }
            });
            return {
                ...arq,
                usuario: userObj ? { nombre: userObj.nombre } : { nombre: 'Hector' }
            };
        }));

        res.json(arqueosWithUsers);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error fetching cashier sessions" });
    }
});

// Staff Stats Endpoint
app.get('/api/staff/stats', async (req, res) => {
    const { date, arqueoId } = req.query;
    try {
        let arqueo = null;

        if (arqueoId) {
            // Buscar por arqueoId directo
            arqueo = await prisma.arqueo.findUnique({
                where: { id: parseInt(arqueoId) }
            });
            if (!arqueo) {
                return res.json({ arqueo: null, waiters: [], cooks: [], comandas: [], requiresSessionSelection: false });
            }
        } else if (date) {
            // Buscar arqueos que iniciaron en esa fecha (Peru Time UTC-5)
            const start = new Date(`${date}T00:00:00.000-05:00`);
            const end = new Date(`${date}T23:59:59.999-05:00`);

            const arqueos = await prisma.arqueo.findMany({
                where: {
                    OR: [
                        { fechaInicio: { gte: start, lte: end } },
                        { fechaFin: { gte: start, lte: end } }
                    ]
                },
                orderBy: { id: 'asc' }
            });

            if (arqueos.length === 0) {
                return res.json({ arqueo: null, waiters: [], cooks: [], comandas: [], requiresSessionSelection: false });
            } else if (arqueos.length === 1) {
                arqueo = arqueos[0];
            } else {
                // Múltiples sesiones en el mismo día: requiere selección
                return res.json({ arqueo: null, waiters: [], cooks: [], comandas: [], requiresSessionSelection: true });
            }
        } else {
            return res.json({ arqueo: null, waiters: [], cooks: [], comandas: [], requiresSessionSelection: false });
        }

        // Determinar límites de tiempo de la sesión seleccionada
        const startDate = arqueo.fechaInicio;
        const endDate = arqueo.fechaFin || new Date();

        // 1. Obtener todas las comandas cobradas en el rango de la sesión (excluye anulaciones)
        const comandas = await prisma.comanda.findMany({
            where: {
                estado: 'cerrada',
                fecha: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                detalles: {
                    include: {
                        plato: {
                            include: { receta: true }
                        },
                        cocinero: true
                    }
                },
                usuario: true,
                mesa: true
            },
            orderBy: { fecha: 'asc' }
        });

        // 2. Consolidar mozos
        const waiters = await prisma.user.findMany({
            where: { rol: { in: ['mozo', 'admin'] } }
        });

        const waiterStats = waiters.map(w => {
            const waiterComandas = comandas.filter(c => c.usuarioId === w.id);
            const totalTables = waiterComandas.length;
            const totalSales = waiterComandas.reduce((acc, c) => {
                const orderTotal = c.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
                return acc + orderTotal;
            }, 0);

            return {
                id: w.id,
                nombre: w.nombre,
                rol: w.rol,
                totalTables,
                totalSales
            };
        });

        // 3. Consolidar cocineros
        const details = await prisma.detalleComanda.findMany({
            where: {
                estado: { in: ['listo', 'entregado'] },
                comanda: {
                    estado: 'cerrada',
                    fecha: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            },
            include: {
                cocinero: true
            }
        });

        const cooks = await prisma.user.findMany({
            where: { rol: { in: ['cocina', 'admin'] } }
        });

        const cookStats = cooks.map(c => {
            const cookDetails = details.filter(d => d.cocineroId === c.id);
            const totalDishes = cookDetails.length;

            // Calcular tiempo promedio
            let totalTimeMs = 0;
            let countTime = 0;

            cookDetails.forEach(d => {
                if (d.fechaPreparacion && d.fechaListo) {
                    const start = new Date(d.fechaPreparacion);
                    const end = new Date(d.fechaListo);
                    const diff = end - start;
                    if (diff > 0) {
                        totalTimeMs += diff;
                        countTime++;
                    }
                }
            });

            const avgTimeMin = countTime > 0 ? (totalTimeMs / countTime / 60000) : 0;

            return {
                id: c.id,
                nombre: c.nombre,
                rol: c.rol,
                totalDishes,
                avgTimeMin
            };
        });

        // 4. Obtener todos los movimientos de insumos asociados al periodo
        const movimientosInsumo = await prisma.movimientoInsumo.findMany({
            where: {
                fecha: {
                    gte: startDate,
                    lte: endDate
                },
                tipoMovimiento: 'VENTA'
            },
            select: {
                id: true,
                insumoId: true,
                cantidad: true,
                motivo: true,
                fecha: true
            }
        });

        res.json({
            arqueo: {
                id: arqueo.id,
                fechaInicio: arqueo.fechaInicio,
                fechaFin: arqueo.fechaFin,
                estado: arqueo.estado,
                montoInicial: arqueo.montoInicial
            },
            waiters: waiterStats,
            cooks: cookStats,
            comandas: comandas.map(c => ({
                id: c.id,
                fecha: c.fecha,
                usuarioId: c.usuarioId,
                usuarioNombre: c.usuario ? c.usuario.nombre : 'Mesero',
                usuarioRol: c.usuario ? c.usuario.rol : 'mozo',
                mesaId: c.mesaId,
                mesaNum: c.mesa ? c.mesa.numero : 'Mesa',
                total: c.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0),
                detalles: c.detalles.map(d => ({
                    id: d.id,
                    platoId: d.platoId,
                    descripcion: d.plato.nombre,
                    cantidad: d.cantidad,
                    precio: d.plato.precio,
                    cocineroId: d.cocineroId,
                    cocineroNombre: d.cocinero ? d.cocinero.nombre : null,
                    estado: d.estado,
                    fechaPreparacion: d.fechaPreparacion,
                    fechaListo: d.fechaListo,
                    recetaCount: d.plato.receta ? d.plato.receta.length : 0
                }))
            })),
            movimientosInsumo,
            requiresSessionSelection: false
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error fetching staff stats" });
    }
});

// HARD DELETE DAY (For "Limpiar Jornada")
app.delete('/api/staff/stats/daily', async (req, res) => {
    const { date } = req.query; // Expect YYYY-MM-DD
    if (!date) return res.status(400).json({ error: "Date is required" });

    try {
        // UTC-5 Range for delete
        const start = new Date(`${date}T00:00:00.000-05:00`);
        const end = new Date(`${date}T23:59:59.999-05:00`);

        // 1. Delete Details first (Cascade typically handles this but explicit is safer for logic)
        // Find IDs first? Or deleteMany with relation filter?
        // SQLite/Prisma CASCADE: If configured in schema, deleting Comanda deletes Details.
        // Let's assume standard cascading or do it manually.

        // Delete Comandas in range
        const deleteComandas = await prisma.comanda.deleteMany({
            where: {
                fecha: {
                    gte: start,
                    lte: end
                }
            }
        });

        res.json({ message: `Jornada limpiada. ${deleteComandas.count} comandas eliminadas físicamente.` });

    } catch (e) {
        console.error("Error wiping day:", e);
        res.status(500).json({ error: "Error eliminando datos del día: " + e.message });
    }
});

// Delete specific order detail (with auto-liberation)
app.delete('/api/orders/details/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const detail = await prisma.detalleComanda.findUnique({
            where: { id: parseInt(id) }
        });

        if (!detail) {
            return res.status(404).json({ error: "Detalle no encontrado" });
        }

        await prisma.detalleComanda.update({
            where: { id: parseInt(id) },
            data: { estado: 'anulado' }
        });

        // AUTO-LIBERATION LOGIC
        const remainingDetails = await prisma.detalleComanda.count({
            where: { comandaId: detail.comandaId, estado: { notIn: ['anulado'] } }
        });

        if (remainingDetails === 0) {
            const comanda = await prisma.comanda.findUnique({
                where: { id: detail.comandaId }
            });
            if (comanda) {
                await prisma.comanda.update({
                    where: { id: comanda.id },
                    data: { estado: 'anulada' }
                });
                await prisma.mesa.update({
                    where: { id: comanda.mesaId },
                    data: { estado: 'libre' }
                });
            }
        }

        res.json({ success: true, remaining: remainingDetails, message: remainingDetails === 0 ? "Comanda vacía: Mesa liberada." : "Item eliminado." });
    } catch (e) {
        console.error("Error deleting item:", e);
        res.status(500).json({ error: e.message });
    }
});

// ANULAR COMANDA COMPLETAMENTE (CORREGIDO)
app.put('/api/orders/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const { usuarioResponsable, motivo, usuarioId } = req.body;

    try {
        const orderId = parseInt(id);

        // 1. Obtener la comanda actual con sus detalles e insumos
        const comanda = await prisma.comanda.findUnique({
            where: { id: orderId },
            include: {
                detalles: {
                    include: { plato: true }
                },
                mesa: true
            }
        });

        if (!comanda) return res.status(404).json({ error: "Comanda no encontrada" });
        if (comanda.estado === 'cerrada') return res.status(400).json({ error: "No se puede anular una comanda ya pagada/cerrada." });

        const totalAnulado = comanda.detalles.reduce((sum, d) => sum + (d.cantidad * d.plato.precio), 0);

        // 2. Transacción atómica para asegurar consistencia
        const result = await prisma.$transaction(async (tx) => {

            // Registro blindado en Auditoría de Cancelados sin interferir con las llaves primarias
            const log = await tx.pedidoCancelado.create({
                data: {
                    comandaId: parseInt(comanda.id),
                    mesa: String(comanda.mesa.numero),
                    usuarioResponsable: String(usuarioResponsable || "Mozo/Admin"),
                    motivo: String(motivo || "Anulación directa"),
                    totalAnulado: parseFloat(totalAnulado)
                }
            });

            // Actualizar estado de la Comanda principal a 'anulada'
            await tx.comanda.update({
                where: { id: comanda.id },
                data: { estado: 'anulada' }
            });

            // Liberar la mesa para el salón
            await tx.mesa.update({
                where: { id: comanda.mesaId },
                data: { estado: 'libre' }
            });

            // Liberar automáticamente todas las mesas hijas
            await tx.mesa.updateMany({
                where: { mesaPadreId: comanda.mesaId },
                data: { mesaPadreId: null, estado: 'libre' }
            });

            // Procesar descarte de insumos y mermas por plato
            for (const detalle of comanda.detalles) {
                let isMerma = false;

                if (detalle.estado === 'preparando' && detalle.fechaPreparacion) {
                    const diffMins = (new Date() - new Date(detalle.fechaPreparacion)) / 60000;
                    if (diffMins >= 10) isMerma = true;
                } else if (detalle.estado === 'listo' || detalle.estado === 'entregada') {
                    isMerma = true;
                }

                if (isMerma) {
                    const receta = await tx.recetaInsumo.findMany({
                        where: { platoId: detalle.platoId }
                    });

                    for (const ingrediente of receta) {
                        const cantidadConsumida = ingrediente.cantidad * detalle.cantidad;
                        const insu = await tx.insumo.findUnique({ where: { id: ingrediente.insumoId } });

                        await tx.insumo.update({
                            where: { id: ingrediente.insumoId },
                            data: { stock: Number((insu.stock - cantidadConsumida).toFixed(2)) } // Evita problemas de precisión de flotantes
                        });

                        await tx.movimientoInsumo.create({
                            data: {
                                insumoId: ingrediente.insumoId,
                                tipoMovimiento: 'MERMA',
                                cantidad: cantidadConsumida,
                                motivo: `Anulación (>10m prep o listo). Motivo Mozo: ${motivo || 'N/A'}. Mesa: ${comanda.mesa.numero}`,
                                usuarioId: usuarioId ? parseInt(usuarioId) : 1
                            }
                        });
                    }
                }

                // Actualizar estado del detalle a 'anulado' de forma lógica
                await tx.detalleComanda.update({
                    where: { id: detalle.id },
                    data: { estado: 'anulado' }
                });
            }

            return log;
        });

        return res.status(200).json({ success: true, log: result });
    } catch (e) {
        console.error("Error cancelling order:", e);
        return res.status(500).json({ error: "Error interno al procesar la anulación: " + e.message });
    }
});



// --- FACTURACION ELECTRONICA SIMULADA ---
app.get('/api/facturacion/:type/:documento', async (req, res) => {
    const { type, documento } = req.params;
    const token = process.env.APISPERU_TOKEN;

    if (!token) {
        console.error('APISPERU_TOKEN no configurado en .env');
        return res.status(500).json({ success: false, error: 'Configuración de API no disponible' });
    }

    // Validar formato según tipo
    if (type === 'dni' && documento.length !== 8) {
        return res.status(400).json({ success: false, error: 'DNI debe tener 8 dígitos' });
    }
    if (type === 'ruc' && documento.length !== 11) {
        return res.status(400).json({ success: false, error: 'RUC debe tener 11 dígitos' });
    }

    const endpoint = type === 'ruc' ? 'ruc' : 'dni';
    const url = `https://dniruc.apisperu.com/api/v1/${endpoint}/${documento}?token=${token}`;

    try {
        const apiRes = await fetch(url);
        const data = await apiRes.json();

        console.log(`[APIsPERU] ${type.toUpperCase()} ${documento} -> status ${apiRes.status}`, data);

        if (!apiRes.ok || data.success === false) {
            return res.json({
                success: false,
                error: data.message || `No se encontró el ${type.toUpperCase()}`
            });
        }

        // Normalizar respuesta al formato que espera PaymentModal.jsx
        if (type === 'dni') {
            const nombreCompleto = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`.trim();
            return res.json({
                success: true,
                razonSocial: nombreCompleto,
                direccion: '' // DNI no devuelve dirección en esta API
            });
        } else {
            return res.json({
                success: true,
                razonSocial: data.razonSocial,
                direccion: data.direccion || ''
            });
        }
    } catch (e) {
        console.error('[APIsPERU] Error de conexión:', e.message);
        return res.status(500).json({ success: false, error: 'Error al consultar APIsPERU' });
    }
});

// 6. Checkout (Updated)
app.post('/api/checkout/:mesaId', async (req, res) => {
    const { mesaId } = req.params;
    const { 
        paymentMethod, docType, totalReceived, tip, observation, email,
        tipoComprobante, documentoCliente, razonSocial, direccionFiscal 
    } = req.body;

    try {
        const activeOrders = await prisma.comanda.findMany({
            where: { mesaId: parseInt(mesaId), estado: { notIn: ['cerrada', 'anulada'] } },
            include: { detalles: { include: { plato: true } } },
            orderBy: { id: 'asc' }
        });

        if (activeOrders.length === 0)
            return res.status(404).json({ error: "No active order" });

        const order = activeOrders[0];
        const total = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);

        // Anular comandas fantasma
        if (activeOrders.length > 1) {
            await prisma.comanda.updateMany({
                where: { id: { in: activeOrders.slice(1).map(o => o.id) } },
                data: { estado: 'anulada' }
            });
        }

        // 1. Cerrar comanda
        const closedOrder = await prisma.comanda.update({
            where: { id: order.id },
            data: {
                estado: 'cerrada',
                metodoPago: paymentMethod || 'efectivo',
                tipoDocumento: docType || 'sin_comprobante',
                montoRecibido: parseFloat(totalReceived || 0),
                propina: parseFloat(tip || 0),
                observacion: observation || null,
                emailCliente: email || null,
                tipoComprobante: tipoComprobante || 'ticket',
                documentoCliente: documentoCliente || null,
                razonSocial: razonSocial || null,
                direccionFiscal: direccionFiscal || null
            }
        });

        // 2. Marcar detalles como entregados + liberar mesa (paralelo, no necesitan tx)
        await Promise.all([
            prisma.detalleComanda.updateMany({
                where: { comandaId: order.id, estado: { notIn: ['anulado'] } },
                data: { estado: 'entregado' }
            }),
            prisma.mesa.update({
                where: { id: parseInt(mesaId) },
                data: { estado: 'libre' }
            }),
            prisma.mesa.updateMany({
                where: { mesaPadreId: parseInt(mesaId) },
                data: { mesaPadreId: null, estado: 'libre' }
            })
        ]);

        // 3. Explosión de insumos (Optimized Batch & Parallel)
        const platosActivos = order.detalles.filter(d => d.estado !== 'anulado');
        const platoIds = platosActivos.map(d => d.platoId);

        if (platoIds.length > 0) {
            // Fetch all recipes and their current insumo stocks in one query
            const recetas = await prisma.recetaInsumo.findMany({
                where: { platoId: { in: platoIds } },
                include: { insumo: true }
            });

            // Aggregate stock changes in memory to avoid multiple queries for the same insumo
            const insumoUpdates = {};

            for (const detalle of platosActivos) {
                const recetaDelPlato = recetas.filter(r => r.platoId === detalle.platoId);
                for (const ingrediente of recetaDelPlato) {
                    if (!ingrediente.insumo) continue;
                    
                    const cantidadConsumida = round2(ingrediente.cantidad * detalle.cantidad);
                    const insumoId = ingrediente.insumoId;

                    if (!insumoUpdates[insumoId]) {
                        insumoUpdates[insumoId] = {
                            change: 0,
                            currentStock: ingrediente.insumo.stock,
                            name: ingrediente.insumo.nombre,
                            motivos: []
                        };
                    }
                    insumoUpdates[insumoId].change = round2(insumoUpdates[insumoId].change + cantidadConsumida);
                    insumoUpdates[insumoId].motivos.push(`Plato: ${detalle.plato.nombre} (x${detalle.cantidad})`);
                }
            }

            // Perform Insumo stock updates in parallel (without transaction)
            const updatePromises = Object.entries(insumoUpdates).map(([insumoId, data]) => {
                const newStock = round2(data.currentStock - data.change);
                return prisma.insumo.update({
                    where: { id: parseInt(insumoId) },
                    data: { stock: newStock }
                }).catch(e => {
                    console.error(`[KARDEX] Error updating stock for insumo ${insumoId}:`, e.message);
                });
            });
            await Promise.all(updatePromises);

            // Create Movement logs in batch
            const movimientosData = Object.entries(insumoUpdates).map(([insumoId, data]) => ({
                insumoId: parseInt(insumoId),
                tipoMovimiento: 'VENTA',
                cantidad: round2(-1 * data.change),
                motivo: `Venta automática Comanda ID: ${order.id} - ${data.motivos.join(', ')}`,
                usuarioId: order.usuarioId,
                fecha: order.fecha
            }));

            if (movimientosData.length > 0) {
                try {
                    await prisma.movimientoInsumo.createMany({
                        data: movimientosData
                    });
                } catch (e) {
                    console.error("[KARDEX] Error creating batch movimientos:", e.message);
                }
            }
        }

        res.json({ ...closedOrder, total, message: "Ticket generated" });

    } catch (error) {
        console.error("Error finalizing payment:", error);
        res.status(500).json({ error: "Error al registrar pago: " + error.message });
    }
});

// 7. Cashier Arqueo Routes
// 7.0 Get Arqueos within a range of dates (For PDF Consolidado)
app.get('/api/cashier/arqueo/report/range', async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate parameters are required" });
        }

        const start = new Date(`${startDate}T00:00:00-05:00`);
        const end = new Date(`${endDate}T23:59:59-05:00`);

        const arqueos = await prisma.arqueo.findMany({
            where: {
                fechaInicio: { gte: start, lte: end }
            },
            orderBy: { fechaInicio: 'asc' }
        });

        const detailedArqueos = await Promise.all(arqueos.map(async (arq) => {
            const arqStart = arq.fechaInicio;
            const arqEnd = arq.estado === 'abierto' ? new Date() : arq.fechaFin;

            const [sales, movements, pendingOrders, user] = await Promise.all([
                prisma.comanda.findMany({
                    where: {
                        estado: 'cerrada',
                        fecha: { gte: arqStart, lte: arqEnd }
                    },
                    include: { detalles: { include: { plato: true } }, usuario: true, mesa: true }
                }),
                prisma.movimientoCaja.findMany({
                    where: { arqueoId: arq.id }
                }),
                prisma.comanda.findMany({
                    where: {
                        estado: { notIn: ['cerrada', 'anulada'] }
                    },
                    include: {
                        detalles: {
                            where: { estado: { not: 'anulado' } },
                            include: { plato: true }
                        }
                    }
                }),
                prisma.user.findUnique({
                    where: { id: arq.usuarioId },
                    select: { nombre: true }
                })
            ]);

            const parsePaymentMethod = (metodoPago) => {
                const m = (metodoPago || 'efectivo').toLowerCase();
                if (m.includes('izipay') || m.includes('izi')) return 'izipay';
                if (m.includes('niubiz')) return 'niubiz';
                if (m.includes('plin')) return 'plin';
                if (m.includes('yape')) return 'yape';
                if (m.includes('tarjeta')) return 'tarjeta';
                return 'efectivo';
            };

            const manualIngresos = movements.filter(m => m.tipo === 'INGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + m.monto, 0);
            const manualEgresos = movements.filter(m => m.tipo === 'EGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + m.monto, 0);

            const manualIngresosYape = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + m.monto, 0);
            const manualEgresosYape = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + m.monto, 0);

            const manualIngresosPlin = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + m.monto, 0);
            const manualEgresosPlin = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + m.monto, 0);

            const inicio = arq.montoInicial;
            const egresos = movements.filter(m => m.tipo === 'EGRESO').reduce((sum, m) => sum + m.monto, 0);

            let totalPropinas = 0;
            let propinasPorMozo = {};

            let incomeDetails = {
                efectivo: 0,
                tarjeta: 0,
                yape: 0,
                izipay: 0,
                plin: 0,
                niubiz: 0,
                manual: manualIngresos
            };

            const salesData = sales.map(order => {
                const subtotal = order.detalles.reduce((s, d) => s + (d.cantidad * d.plato.precio), 0);
                const propina = order.propina || 0;
                totalPropinas += propina;

                if (propina > 0 && order.usuario) {
                    const mozoId = order.usuario.id;
                    if (!propinasPorMozo[mozoId]) {
                        propinasPorMozo[mozoId] = {
                            id: mozoId,
                            nombre: order.usuario.nombre,
                            propinas: 0
                        };
                    }
                    propinasPorMozo[mozoId].propinas += propina;
                }

                const cat = parsePaymentMethod(order.metodoPago);
                if (incomeDetails[cat] !== undefined) {
                    incomeDetails[cat] += subtotal;
                } else {
                    incomeDetails.efectivo += subtotal;
                }

                return {
                    id: order.id,
                    hora: order.fecha,
                    items: order.detalles.map(d => ({
                        cantidad: d.cantidad,
                        descripcion: d.plato.nombre,
                        precio: d.plato.precio,
                        total: d.cantidad * d.plato.precio
                    })),
                    total: subtotal,
                    propina: propina,
                    metodo: order.metodoPago,
                    doc: order.tipoDocumento,
                    mozo: order.usuario?.nombre || 'General',
                    mesa: order.mesa?.numero || 'Barra'
                };
            });

            // Apply manual movements safely (no negative balance)
            incomeDetails.yape = Math.max(0, incomeDetails.yape + manualIngresosYape - manualEgresosYape);
            incomeDetails.plin = Math.max(0, incomeDetails.plin + manualIngresosPlin - manualEgresosPlin);

            const totalPendiente = pendingOrders.reduce((acc, order) => {
                const hasKitchenItems = order.detalles.some(d => 
                    ['listo', 'lista', 'entregado', 'entregada'].includes(d.estado.toLowerCase())
                );
                if (hasKitchenItems) {
                    return acc + order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
                }
                return acc;
            }, 0);

            const totalCaja = arq.montoInicial + manualIngresos + incomeDetails.efectivo - manualEgresos;

            return {
                ...arq,
                usuario: user || { nombre: 'Administrador' },
                inicio,
                egresos,
                ingresos: incomeDetails,
                totalCaja,
                ventas: salesData,
                totalBruto: salesData.reduce((acc, s) => acc + s.total, 0),
                totalPropinas,
                propinasPorMozo: Object.values(propinasPorMozo),
                totalPendiente,
                movimientos: movements
            };
        }));

        res.json(detailedArqueos);

    } catch (error) {
        console.error("Error fetching range arqueo details:", error);
        res.status(500).json({ error: "Error al obtener arqueos en el rango: " + error.message });
    }
});

// 7.1 Get Specific Arqueo Details (For PDF)
app.get('/api/cashier/arqueo/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const arq = await prisma.arqueo.findUnique({ where: { id: parseInt(id) } });
        if (!arq) return res.status(404).json({ error: "Arqueo not found" });

        const startDate = arq.fechaInicio;
        const endDate = arq.estado === 'abierto' ? new Date() : arq.fechaFin;

        // Run queries in parallel
        const [sales, movements, pendingOrders] = await Promise.all([
            prisma.comanda.findMany({
                where: {
                    estado: 'cerrada',
                    fecha: { gte: startDate, lte: endDate }
                },
                include: { detalles: { include: { plato: true } }, usuario: true, mesa: true }
            }),
            prisma.movimientoCaja.findMany({
                where: { arqueoId: arq.id }
            }),
            prisma.comanda.findMany({
                where: {
                    estado: { notIn: ['cerrada', 'anulada'] }
                },
                include: {
                    detalles: {
                        where: { estado: { not: 'anulado' } },
                        include: { plato: true }
                    }
                }
            })
        ]);

        const parsePaymentMethod = (metodoPago) => {
            const m = (metodoPago || 'efectivo').toLowerCase();
            if (m.includes('izipay') || m.includes('izi')) return 'izipay';
            if (m.includes('niubiz')) return 'niubiz';
            if (m.includes('plin')) return 'plin';
            if (m.includes('yape')) return 'yape';
            if (m.includes('tarjeta')) return 'tarjeta';
            return 'efectivo';
        };

        const manualIngresos = movements.filter(m => m.tipo === 'INGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + m.monto, 0);
        const manualEgresos = movements.filter(m => m.tipo === 'EGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + m.monto, 0);

        const manualIngresosYape = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + m.monto, 0);
        const manualEgresosYape = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + m.monto, 0);

        const manualIngresosPlin = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + m.monto, 0);
        const manualEgresosPlin = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + m.monto, 0);

        const inicio = arq.montoInicial;
        const egresos = movements.filter(m => m.tipo === 'EGRESO').reduce((sum, m) => sum + m.monto, 0);

        let totalPropinas = 0;
        let propinasPorMozo = {};

        let incomeDetails = {
            efectivo: 0,
            tarjeta: 0,
            yape: 0,
            izipay: 0,
            plin: 0,
            niubiz: 0,
            manual: manualIngresos
        };

        const salesData = sales.map(order => {
            const subtotal = order.detalles.reduce((s, d) => s + (d.cantidad * d.plato.precio), 0);
            const propina = order.propina || 0;
            totalPropinas += propina;

            if (propina > 0 && order.usuario) {
                const mozoId = order.usuario.id;
                if (!propinasPorMozo[mozoId]) {
                    propinasPorMozo[mozoId] = {
                        id: mozoId,
                        nombre: order.usuario.nombre,
                        propinas: 0
                    };
                }
                propinasPorMozo[mozoId].propinas += propina;
            }

            const cat = parsePaymentMethod(order.metodoPago);
            if (incomeDetails[cat] !== undefined) {
                incomeDetails[cat] += subtotal;
            } else {
                incomeDetails.efectivo += subtotal;
            }

            return {
                id: order.id,
                hora: order.fecha,
                items: order.detalles.map(d => ({
                    cantidad: d.cantidad,
                    descripcion: d.plato.nombre,
                    precio: d.plato.precio,
                    total: d.cantidad * d.plato.precio
                })),
                total: subtotal,
                propina: propina,
                metodo: order.metodoPago,
                doc: order.tipoDocumento,
                mozo: order.usuario?.nombre || 'General',
                mesa: order.mesa?.numero || 'Barra'
            };
        });

        // Apply manual movements safely (no negative balance)
        incomeDetails.yape = Math.max(0, incomeDetails.yape + manualIngresosYape - manualEgresosYape);
        incomeDetails.plin = Math.max(0, incomeDetails.plin + manualIngresosPlin - manualEgresosPlin);

        const totalPendiente = pendingOrders.reduce((acc, order) => {
            const hasKitchenItems = order.detalles.some(d => 
                ['listo', 'lista', 'entregado', 'entregada'].includes(d.estado.toLowerCase())
            );
            if (hasKitchenItems) {
                return acc + order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
            }
            return acc;
        }, 0);

        const totalCaja = arq.montoInicial + manualIngresos + incomeDetails.efectivo - manualEgresos;

        res.json({
            ...arq,
            inicio,
            egresos,
            ingresos: incomeDetails,
            totalCaja,
            ventas: salesData,
            totalBruto: salesData.reduce((acc, s) => acc + s.total, 0),
            totalPropinas,
            propinasPorMozo: Object.values(propinasPorMozo),
            totalPendiente,
            movimientos: movements
        });

    } catch (e) {
        console.error("Error fetching arqueo details:", e);
        res.status(500).json({
            ventas: [],
            totalBruto: 0,
            totalPropinas: 0,
            propinasPorMozo: [],
            totalPendiente: 0,
            movimientos: []
        });
    }
});

// GET /api/cashier/open-accounts
app.get('/api/cashier/open-accounts', async (req, res) => {
    try {
        const comandasActivas = await prisma.comanda.findMany({
            where: { estado: { notIn: ['cerrada', 'anulada'] } },
            include: {
                mesa: { select: { id: true, numero: true, mesasHijas: { select: { numero: true } } } },
                usuario: { select: { id: true, nombre: true } },
                detalles: {
                    where: { estado: { notIn: ['anulado'] } },
                    include: {
                        plato: { select: { id: true, nombre: true, precio: true } }
                    }
                }
            },
            orderBy: { fecha: 'asc' }
        });
        res.json(comandasActivas);
    } catch (e) {
        console.error('Error en open-accounts:', e);
        res.status(500).json([]);
    }
});

// 7.2 Current Balance (REAL IMPLEMENTATION)
app.get('/api/cashier/balance', async (req, res) => {
    try {
        // Find the LATEST Arqueo
        const lastArqueo = await prisma.arqueo.findFirst({
            orderBy: { id: 'desc' }
        });

        // Default state if no history exists
        if (!lastArqueo) {
            return res.json({
                estado: 'cerrado',
                inicio: 0,
                egresos: 0,
                ingresos: { efectivo: 0, tarjeta: 0, yape: 0, izipay: 0, plin: 0, niubiz: 0, manual: 0 },
                totalCaja: 0,
                totalBruto: 0,
                totalPendiente: 0,
                ventas: [],
                movimientos: []
            });
        }

        // Determine Time Range
        const startDate = lastArqueo.fechaInicio;
        const endDate = lastArqueo.estado === 'abierto' ? new Date() : lastArqueo.fechaFin;

        // Run queries in parallel
        const [sales, movements, pendingOrders] = await Promise.all([
            prisma.comanda.findMany({
                where: {
                    estado: 'cerrada',
                    fecha: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                include: { detalles: { include: { plato: true } }, usuario: true, mesa: true }
            }),
            prisma.movimientoCaja.findMany({
                where: { arqueoId: lastArqueo.id }
            }),
            prisma.comanda.findMany({
                where: {
                    estado: { notIn: ['cerrada', 'anulada'] }
                },
                include: {
                    detalles: {
                        where: { estado: { not: 'anulado' } },
                        include: { plato: true }
                    }
                }
            })
        ]);

        const parsePaymentMethod = (metodoPago) => {
            const m = (metodoPago || 'efectivo').toLowerCase();
            if (m.includes('izipay') || m.includes('izi')) return 'izipay';
            if (m.includes('niubiz')) return 'niubiz';
            if (m.includes('plin')) return 'plin';
            if (m.includes('yape')) return 'yape';
            if (m.includes('tarjeta')) return 'tarjeta';
            return 'efectivo';
        };

        // Calculate manual incomes and egresos
        const manualIngresos = movements.filter(m => m.tipo === 'INGRESO').reduce((sum, m) => sum + m.monto, 0);
        const manualEgresos = movements.filter(m => m.tipo === 'EGRESO').reduce((sum, m) => sum + m.monto, 0);

        // Dynamic Inicio -> Fixed initial amount
        const inicio = lastArqueo.montoInicial;
        const egresos = manualEgresos;

        // Calculate Totals
        let totalBruto = 0;
        let totalPropinas = 0;
        let propinasPorMozo = {};

        let incomeDetails = {
            efectivo: 0,
            tarjeta: 0,
            yape: 0,
            izipay: 0,
            plin: 0,
            niubiz: 0,
            manual: manualIngresos
        };

        sales.forEach(order => {
            const subtotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
            const propina = order.propina || 0;

            totalBruto += subtotal;
            totalPropinas += propina;

            // Acumular propinas por mozo
            if (propina > 0 && order.usuario) {
                const mozoId = order.usuario.id;
                const mozoNombre = order.usuario.nombre;

                if (!propinasPorMozo[mozoId]) {
                    propinasPorMozo[mozoId] = {
                        id: mozoId,
                        nombre: mozoNombre,
                        propinas: 0
                    };
                }
                propinasPorMozo[mozoId].propinas += propina;
            }

            const cat = parsePaymentMethod(order.metodoPago);
            if (incomeDetails[cat] !== undefined) {
                incomeDetails[cat] += subtotal;
            } else {
                incomeDetails.efectivo += subtotal;
            }
        });

        // Convertir objeto a array para frontend
        const desglosePropinas = Object.values(propinasPorMozo);

        // Calculate total pending based on order state (lista or entregada)
        const totalPendiente = pendingOrders.reduce((acc, order) => {
            const hasKitchenItems = order.detalles.some(d => 
                ['listo', 'lista', 'entregado', 'entregada'].includes(d.estado.toLowerCase())
            );
            if (hasKitchenItems) {
                return acc + order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
            }
            return acc;
        }, 0);

        // totalCaja = Inicio + manualIngresos + cash sales - manualEgresos
        const totalCaja = lastArqueo.montoInicial + manualIngresos + incomeDetails.efectivo - manualEgresos;

        const ventasDetalladas = sales.map(order => ({
            id: order.id,
            hora: order.fecha,
            items: order.detalles.map(d => ({
                cantidad: d.cantidad,
                descripcion: d.plato.nombre,
                precio: d.plato.precio,
                total: d.cantidad * d.plato.precio
            })),
            total: order.detalles.reduce((s, d) => s + (d.cantidad * d.plato.precio), 0),
            metodo: order.metodoPago,
            doc: order.tipoDocumento,
            waiterName: order.usuario ? order.usuario.nombre : 'Mesero',
            mesaNum: order.mesa ? order.mesa.numero : order.mesaId
        }));

        res.json({
            id: lastArqueo.id,
            estado: lastArqueo.estado,
            fechaInicio: lastArqueo.fechaInicio,
            fechaFin: lastArqueo.fechaFin,
            inicio,
            egresos,
            ingresos: incomeDetails,
            totalCaja,
            totalBruto,
            totalPropinas,
            propinasPorMozo: desglosePropinas,
            totalPendiente,
            ventas: ventasDetalladas,
            movimientos: movements
        });

    } catch (e) {
        console.error("Error fetching balance:", e);
        res.status(500).json({
            estado: 'cerrado',
            inicio: 0,
            egresos: 0,
            ingresos: { efectivo: 0, tarjeta: 0, yape: 0, izipay: 0, plin: 0, niubiz: 0, manual: 0 },
            totalCaja: 0,
            totalBruto: 0,
            totalPropinas: 0,
            propinasPorMozo: [],
            totalPendiente: 0,
            ventas: [],
            movimientos: []
        });
    }
});

// 8. Critical Reset (Simulation Mode)
app.delete('/api/admin/reset-simulation', async (req, res) => {
    try {
        console.log("EXECUTING HARD RESET...");

        // 1. Wipe Transactional Data
        await prisma.detalleComanda.deleteMany({});
        await prisma.comanda.deleteMany({});
        await prisma.arqueo.deleteMany({});

        // 2. Wipe Ghost Items (Physical Delete of Soft Deleted or specific categories)
        // Delete Products first
        await prisma.plato.deleteMany({
            where: {
                OR: [
                    { deleted: true },
                    { categoria: { nombre: { in: ['Desayunos', 'Desayuno'] } } }
                ]
            }
        });
        // Delete Categories
        await prisma.categoria.deleteMany({
            where: {
                OR: [
                    { deleted: true },
                    { nombre: { in: ['Desayunos', 'Desayuno'] } }
                ]
            }
        });

        // 3. Reset PostgreSQL Sequences (IDs) for Supabase
        await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Arqueo_id_seq" RESTART WITH 1;`).catch(() => { });
        await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Comanda_id_seq" RESTART WITH 1;`).catch(() => { });
        await prisma.$executeRawUnsafe(`ALTER SEQUENCE "DetalleComanda_id_seq" RESTART WITH 1;`).catch(() => { });

        // 4. Reset Tables Status
        await prisma.mesa.updateMany({ data: { estado: 'libre' } });

        console.log("HARD RESET COMPLETE.");
        res.json({ message: "Historial eliminado y contadores reiniciados." });
    } catch (e) {
        console.error("Reset Failed:", e);
        res.status(500).json({ error: "Error en el reseteo: " + e.message });
    }
});

// Register Cash Movement (Manual Ingreso / Egreso)
app.post('/api/cashier/movimientos', async (req, res) => {
    try {
        const { tipo, tipoComprobante, concepto, observacion, monto } = req.body;

        // 1. Validation
        if (!tipo || !['INGRESO', 'EGRESO'].includes(tipo.toUpperCase())) {
            return res.status(400).json({ error: "Tipo de movimiento inválido. Debe ser INGRESO o EGRESO." });
        }
        if (!tipoComprobante || !['boleta', 'factura', 'recibo'].includes(tipoComprobante.toLowerCase())) {
            return res.status(400).json({ error: "Tipo de comprobante inválido. Debe ser boleta, factura o recibo." });
        }
        if (!concepto || concepto.trim() === '') {
            return res.status(400).json({ error: "El concepto es obligatorio." });
        }
        const numericMonto = parseFloat(monto);
        if (isNaN(numericMonto) || numericMonto <= 0) {
            return res.status(400).json({ error: "El monto debe ser un número positivo." });
        }

        // 2. Find active Arqueo
        const lastArqueo = await prisma.arqueo.findFirst({ orderBy: { id: 'desc' } });
        if (!lastArqueo || lastArqueo.estado !== 'abierto') {
            return res.status(400).json({ error: "No hay una caja abierta para registrar movimientos." });
        }

        // 3. For EGRESO, check limit
        if (tipo.toUpperCase() === 'EGRESO') {
            const selectedMetodo = (req.body.metodoPago || 'efectivo').toLowerCase();
            
            // Fetch existing movements
            const movements = await prisma.movimientoCaja.findMany({
                where: { arqueoId: lastArqueo.id }
            });

            // Fetch sales
            const startDate = lastArqueo.fechaInicio;
            const endDate = new Date();
            const sales = await prisma.comanda.findMany({
                where: {
                    estado: 'cerrada',
                    fecha: { gte: startDate, lte: endDate }
                },
                include: { detalles: { include: { plato: true } } }
            });

            const parsePaymentMethod = (metodoPago) => {
                const m = (metodoPago || 'efectivo').toLowerCase();
                if (m.includes('izipay') || m.includes('izi')) return 'izipay';
                if (m.includes('niubiz')) return 'niubiz';
                if (m.includes('plin')) return 'plin';
                if (m.includes('yape')) return 'yape';
                if (m.includes('tarjeta')) return 'tarjeta';
                return 'efectivo';
            };

            let availableLimit = 0;
            if (selectedMetodo === 'efectivo') {
                const manualIngresos = movements.filter(m => m.tipo === 'INGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + m.monto, 0);
                const manualEgresos = movements.filter(m => m.tipo === 'EGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + m.monto, 0);
                
                let gananciasEfectivo = 0;
                sales.forEach(order => {
                    const cat = parsePaymentMethod(order.metodoPago);
                    if (cat === 'efectivo') {
                        const subtotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
                        gananciasEfectivo += subtotal;
                    }
                });
                availableLimit = lastArqueo.montoInicial + manualIngresos + gananciasEfectivo - manualEgresos;
            } else if (selectedMetodo === 'yape') {
                const manualIngresosYape = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + m.monto, 0);
                const manualEgresosYape = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + m.monto, 0);
                
                let gananciasYape = 0;
                sales.forEach(order => {
                    const cat = parsePaymentMethod(order.metodoPago);
                    if (cat === 'yape') {
                        const subtotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
                        gananciasYape += subtotal;
                    }
                });
                availableLimit = Math.max(0, gananciasYape + manualIngresosYape - manualEgresosYape);
            } else if (selectedMetodo === 'plin') {
                const manualIngresosPlin = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + m.monto, 0);
                const manualEgresosPlin = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + m.monto, 0);
                
                let gananciasPlin = 0;
                sales.forEach(order => {
                    const cat = parsePaymentMethod(order.metodoPago);
                    if (cat === 'plin') {
                        const subtotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
                        gananciasPlin += subtotal;
                    }
                });
                availableLimit = Math.max(0, gananciasPlin + manualIngresosPlin - manualEgresosPlin);
            }

            if (numericMonto > availableLimit) {
                return res.status(400).json({ 
                    error: `Monto de egreso supera el límite disponible para el método seleccionado (${selectedMetodo})`
                });
            }
        }

        // 4. Create Movement
        const nuevoMovimiento = await prisma.movimientoCaja.create({
            data: {
                arqueoId: lastArqueo.id,
                tipo: tipo.toUpperCase(),
                tipoComprobante: tipoComprobante.toLowerCase(),
                concepto: concepto.trim(),
                observacion: observacion ? observacion.trim() : null,
                monto: numericMonto,
                metodoPago: tipo.toUpperCase() === 'EGRESO' ? (req.body.metodoPago || 'efectivo').toLowerCase() : 'efectivo'
            }
        });

        res.json({ message: "Movimiento registrado con éxito", movimiento: nuevoMovimiento });
    } catch (e) {
        console.error("Error registering movimiento:", e);
        res.status(500).json({ error: e.message });
    }
});

// Toggle Shift (Open/Close)
app.post('/api/cashier/toggle', async (req, res) => {
    try {
        const lastArqueo = await prisma.arqueo.findFirst({ orderBy: { id: 'desc' } });
        const currentState = lastArqueo?.estado || 'cerrado';

        if (currentState === 'cerrado') {
            // OPEN NEW SHIFT
            const newArqueo = await prisma.arqueo.create({
                data: {
                    montoInicial: req.body.montoInicial || 0, // Allow passing start amount
                    usuarioId: req.body.usuarioId || 1, // Get from body or default to 1
                    estado: 'abierto',
                    fechaInicio: new Date()
                }
            });
            return res.json({ message: "Caja Abierta", arqueo: newArqueo });
        } else {
            // CLOSE EXISTING SHIFT
            // 1. Validate Pending Orders
            // Find all active orders
            const activeOrders = await prisma.comanda.findMany({
                where: { estado: { notIn: ['cerrada', 'anulada'] } },
                include: { detalles: { where: { estado: { notIn: ['anulado'] } } } }
            });

            // Check if any of these active orders actually have active items
            const ordersWithItemsCount = activeOrders.filter(order => order.detalles.length > 0).length;

            if (ordersWithItemsCount > 0) {
                return res.status(400).json({
                    error: "No se puede cerrar caja: Hay mesas con pagos o pedidos pendientes.",
                    pendingCount: ordersWithItemsCount
                });
            }

            // 2. Close it
            const closedArqueo = await prisma.arqueo.update({
                where: { id: lastArqueo.id },
                data: {
                    estado: 'cerrado',
                    fechaFin: new Date(),
                    // We could update final amounts here too if we want to freeze them
                }
            });
            return res.json({ message: "Caja Cerrada", arqueo: closedArqueo });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// History Endpoint (Paginated & Filtered)
app.get('/api/cashier/history', async (req, res) => {
    try {
        const { date, startDate, endDate, search, page = 1, limit = 5 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let where = {};
        if (startDate && endDate) {
            const start = new Date(`${startDate}T00:00:00-05:00`);
            const end = new Date(`${endDate}T23:59:59-05:00`);
            where.fechaInicio = { gte: start, lte: end };
        } else if (date) {
            const start = new Date(`${date}T00:00:00-05:00`);
            const end = new Date(`${date}T23:59:59-05:00`);
            where.fechaInicio = { gte: start, lte: end };
        }

        if (search) {
            const orConditions = [];

            // 1. Numeric ID
            if (/^\d+$/.test(search)) {
                orConditions.push({ id: parseInt(search, 10) });
            }

            // 2. Date format dd/mm (e.g. 26/02)
            const dateMatch = search.match(/^(\d{1,2})[\/\- ](\d{1,2})(?:[\/\- ](\d{2,4}))?$/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1], 10);
                const month = parseInt(dateMatch[2], 10);
                const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : null;

                const pad = (n) => String(n).padStart(2, '0');
                const dateRanges = [];
                if (year) {
                    const fullYear = year < 100 ? 2000 + year : year;
                    const start = new Date(`${fullYear}-${pad(month)}-${pad(day)}T00:00:00-05:00`);
                    const end = new Date(`${fullYear}-${pad(month)}-${pad(day)}T23:59:59-05:00`);
                    if (!isNaN(start.getTime())) {
                        dateRanges.push({ start, end });
                    }
                } else {
                    const currentYear = new Date().getFullYear();
                    for (let y = currentYear - 5; y <= currentYear + 2; y++) {
                        const start = new Date(`${y}-${pad(month)}-${pad(day)}T00:00:00-05:00`);
                        const end = new Date(`${y}-${pad(month)}-${pad(day)}T23:59:59-05:00`);
                        if (!isNaN(start.getTime())) {
                            dateRanges.push({ start, end });
                        }
                    }
                }

                dateRanges.forEach(range => {
                    orConditions.push({ fechaInicio: { gte: range.start, lte: range.end } });
                    orConditions.push({ fechaFin: { gte: range.start, lte: range.end } });
                });
            }

            // 3. State
            orConditions.push({
                estado: {
                    contains: search,
                    mode: 'insensitive'
                }
            });

            // 4. Match users whose name matches search
            const matchingUsers = await prisma.user.findMany({
                where: {
                    nombre: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                select: { id: true }
            });
            if (matchingUsers.length > 0) {
                const userIds = matchingUsers.map(u => u.id);
                orConditions.push({
                    usuarioId: {
                        in: userIds
                    }
                });
            }

            if (orConditions.length > 0) {
                if (where.fechaInicio) {
                    where = {
                        AND: [
                            { fechaInicio: where.fechaInicio },
                            { OR: orConditions }
                        ]
                    };
                } else {
                    where.OR = orConditions;
                }
            }
        }

        const [totalCount, arqueos] = await Promise.all([
            prisma.arqueo.count({ where }),
            prisma.arqueo.findMany({
                where,
                orderBy: { id: 'desc' },
                skip,
                take
            })
        ]);

        const historyData = await Promise.all(arqueos.map(async (arq) => {
            const startDate = arq.fechaInicio;
            const endDate = arq.estado === 'abierto' ? new Date() : arq.fechaFin;
            const isAbierto = arq.estado === 'abierto';

            // Parallelized sub-queries
            const [comandasCerradas, movements, pendingOrders, userObj] = await Promise.all([
                prisma.comanda.findMany({
                    where: {
                        estado: 'cerrada',
                        fecha: { gte: startDate, lte: endDate }
                    },
                    select: {
                        metodoPago: true,
                        propina: true,
                        detalles: {
                            select: {
                                cantidad: true,
                                plato: { select: { precio: true } }
                            }
                        }
                    }
                }),
                prisma.movimientoCaja.findMany({
                    where: { arqueoId: arq.id }
                }),
                isAbierto
                    ? prisma.comanda.findMany({
                        where: { estado: { notIn: ['cerrada', 'anulada'] } },
                        include: { detalles: { where: { estado: { not: 'anulado' } }, include: { plato: true } } }
                      })
                    : Promise.resolve([]),
                prisma.user.findUnique({
                    where: { id: arq.usuarioId },
                    select: { nombre: true }
                })
            ]);

            const parsePaymentMethod = (metodoPago) => {
                const m = (metodoPago || 'efectivo').toLowerCase();
                if (m.includes('izipay') || m.includes('izi')) return 'izipay';
                if (m.includes('niubiz')) return 'niubiz';
                if (m.includes('plin')) return 'plin';
                if (m.includes('yape')) return 'yape';
                if (m.includes('tarjeta')) return 'tarjeta';
                return 'efectivo';
            };

            const manualIngresos = movements.filter(m => m.tipo === 'INGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + m.monto, 0);
            const manualEgresos = movements.filter(m => m.tipo === 'EGRESO' && (m.metodoPago === 'efectivo' || !m.metodoPago)).reduce((sum, m) => sum + m.monto, 0);

            const manualIngresosYape = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + m.monto, 0);
            const manualEgresosYape = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'yape').reduce((sum, m) => sum + m.monto, 0);

            const manualIngresosPlin = movements.filter(m => m.tipo === 'INGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + m.monto, 0);
            const manualEgresosPlin = movements.filter(m => m.tipo === 'EGRESO' && m.metodoPago === 'plin').reduce((sum, m) => sum + m.monto, 0);

            const inicio = arq.montoInicial;
            const egresos = movements.filter(m => m.tipo === 'EGRESO').reduce((sum, m) => sum + m.monto, 0);

            let totalBruto = 0;
            let totalPropinas = 0;
            let incomeDetails = {
                efectivo: 0,
                tarjeta: 0,
                yape: 0,
                izipay: 0,
                plin: 0,
                niubiz: 0,
                manual: manualIngresos
            };

            comandasCerradas.forEach(order => {
                const subtotal = order.detalles.reduce((sum, d) => sum + ((d.plato?.precio ?? 0) * d.cantidad), 0);
                totalBruto += subtotal;
                totalPropinas += order.propina || 0;

                const cat = parsePaymentMethod(order.metodoPago);
                if (incomeDetails[cat] !== undefined) {
                    incomeDetails[cat] += subtotal;
                } else {
                    incomeDetails.efectivo += subtotal;
                }
            });

            // Apply manual movements safely (no negative balance)
            incomeDetails.yape = Math.max(0, incomeDetails.yape + manualIngresosYape - manualEgresosYape);
            incomeDetails.plin = Math.max(0, incomeDetails.plin + manualIngresosPlin - manualEgresosPlin);

            const totalPendiente = pendingOrders.reduce((acc, order) => {
                const hasKitchenItems = order.detalles.some(d => 
                    ['listo', 'lista', 'entregado', 'entregada'].includes(d.estado.toLowerCase())
                );
                if (hasKitchenItems) {
                    return acc + order.detalles.reduce((sum, d) => sum + ((d.plato?.precio ?? 0) * d.cantidad), 0);
                }
                return acc;
            }, 0);

            return {
                id: arq.id,
                fechaInicio: arq.fechaInicio,
                fechaFin: arq.fechaFin,
                estado: arq.estado,
                inicio,
                egresos,
                ingresos: incomeDetails,
                totalCaja: arq.montoInicial + manualIngresos + incomeDetails.efectivo - manualEgresos,
                totalBruto,
                totalPropinas,
                totalPendiente,
                usuario: userObj ? { nombre: userObj.nombre } : { nombre: 'Hector' }
            };
        }));

        res.json({
            data: historyData,
            meta: {
                total: totalCount,
                page: parseInt(page),
                totalPages: Math.ceil(totalCount / take)
            }
        });
    } catch (error) {
        console.error('❌ Error en /api/cashier/history:', error);
        res.json({ data: [], meta: { total: 0, page: 1, totalPages: 1 } });
    }
});



// 9. Staff Stats & Reset (Strict Daily Logic + Destructive Reset)
app.delete('/api/staff/reset-metrics', async (req, res) => {
    try {
        const { fecha } = req.query;
        let queryStart, queryEnd;

        if (fecha) {
            queryStart = new Date(fecha + "T00:00:00");
            queryEnd = new Date(fecha + "T23:59:59.999");
        } else {
            const x = new Date();
            queryStart = new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 0, 0);
            queryEnd = new Date(x.getFullYear(), x.getMonth(), x.getDate(), 23, 59, 59, 999);
        }

        console.log("DESTRUCTIVE RESET FOR:", queryStart.toDateString());

        const deleted = await prisma.comanda.deleteMany({
            where: {
                fecha: { gte: queryStart, lte: queryEnd }
            }
        });

        res.json({ message: `Registros de ${fecha || 'Hoy'} eliminados (${deleted.count} comandas).` });

    } catch (e) {
        console.error("Reset Error:", e);
        res.status(500).json({ error: "Error resetting metrics" });
    }
});

app.get('/api/staff/stats', async (req, res) => {
    try {
        const { fecha } = req.query;
        let startDate, endDate;

        if (fecha) {
            startDate = new Date(fecha + "T00:00:00");
            endDate = new Date(fecha + "T23:59:59.999");
        } else {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }

        const waiters = await prisma.user.findMany({
            where: { rol: { in: ['mozo', 'admin'] } },
            include: {
                comandas: {
                    where: {
                        fecha: { gte: startDate, lte: endDate },
                        estado: 'cerrada'
                    },
                    include: { detalles: { include: { plato: true } } }
                }
            }
        });

        const waitersStats = waiters.map(w => {
            const totalTables = w.comandas.length;
            const totalSales = w.comandas.reduce((acc, order) => {
                return acc + order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
            }, 0);

            return {
                id: w.id,
                nombre: w.nombre,
                totalTables,
                totalSales
            };
        });

        const cooks = await prisma.user.findMany({
            where: { rol: { in: ['cocina', 'admin'] } },
            include: {
                detallesCocina: {
                    where: {
                        fechaPreparacion: { gte: startDate, lte: endDate },
                        estado: 'listo'
                    },
                    include: { plato: true }
                }
            }
        });

        const cooksStats = cooks.map(c => {
            const totalDishes = c.detallesCocina.length;
            let totalMinutes = 0;
            let countWithTime = 0;

            c.detallesCocina.forEach(d => {
                if (d.fechaPreparacion && d.fechaListo) {
                    const diffMs = new Date(d.fechaListo) - new Date(d.fechaPreparacion);
                    const mins = diffMs / 60000;
                    if (mins > 0 && mins < 240) {
                        totalMinutes += mins;
                        countWithTime++;
                    }
                }
            });

            const avgTimeMin = countWithTime > 0 ? (totalMinutes / countWithTime) : 0;

            return {
                id: c.id,
                nombre: c.nombre,
                totalDishes,
                avgTimeMin
            };
        });

        res.json({ waiters: waitersStats, cooks: cooksStats });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error fetching staff stats" });
    }
});

// New statistics endpoints for HomeView (Optimized read-only queries with index range filters)
app.get('/api/stats/weekly-earnings', async (req, res) => {
    try {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(now.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        const comandas = await prisma.comanda.findMany({
            where: {
                estado: 'cerrada',
                fecha: { gte: startOfWeek, lte: endOfWeek }
            },
            select: {
                detalles: {
                    where: { estado: { not: 'anulado' } },
                    select: {
                        cantidad: true,
                        plato: { select: { precio: true } }
                    }
                }
            }
        });
        
        const total = comandas.reduce((acc, c) => {
            return acc + c.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
        }, 0);
        
        res.json({ total });
    } catch (err) {
        console.error("Error en /api/stats/weekly-earnings:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats/transactions', async (req, res) => {
    try {
        const { fecha } = req.query;
        let startDate, endDate;
        if (fecha) {
            startDate = new Date(fecha + "T00:00:00");
            endDate = new Date(fecha + "T23:59:59.999");
        } else {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        
        const comandas = await prisma.comanda.findMany({
            where: {
                estado: 'cerrada',
                fecha: { gte: startDate, lte: endDate }
            },
            select: {
                id: true,
                fecha: true,
                metodoPago: true,
                mesa: { select: { numero: true } },
                usuario: { select: { nombre: true } },
                detalles: {
                    where: { estado: { not: 'anulado' } },
                    select: {
                        cantidad: true,
                        plato: { select: { precio: true } }
                    }
                }
            },
            orderBy: { fecha: 'desc' }
        });
        
        const transactions = comandas.map(v => {
            const total = v.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
            return {
                id: v.id,
                tableName: v.mesa ? `Mesa ${v.mesa.numero}` : 'Mesa',
                closedAt: new Date(v.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
                waiterName: v.usuario ? v.usuario.nombre : 'Mesero',
                total: total,
                metodo: v.metodoPago || 'Efectivo'
            };
        });
        
        res.json(transactions);
    } catch (err) {
        console.error("Error en /api/stats/transactions:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats/fund-flow', async (req, res) => {
    try {
        const { range } = req.query; // 'week' or 'month'
        const now = new Date();
        let startDate = new Date();
        
        if (range === 'month') {
            startDate.setDate(now.getDate() - 29); // 30 days total
        } else {
            startDate.setDate(now.getDate() - 6); // 7 days total (week)
        }
        startDate.setHours(0, 0, 0, 0);
        
        const comandas = await prisma.comanda.findMany({
            where: {
                estado: 'cerrada',
                fecha: { gte: startDate }
            },
            select: {
                fecha: true,
                detalles: {
                    where: { estado: { not: 'anulado' } },
                    select: {
                        cantidad: true,
                        plato: { select: { precio: true } }
                    }
                }
            }
        });
        
        const dailySum = {};
        comandas.forEach(c => {
            const dateStr = new Date(c.fecha).toISOString().split('T')[0];
            const total = c.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
            dailySum[dateStr] = (dailySum[dateStr] || 0) + total;
        });
        
        const result = [];
        let current = new Date(startDate);
        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        
        while (current <= now) {
            const dateStr = current.toISOString().split('T')[0];
            const dayName = daysOfWeek[current.getDay()];
            const label = `${dayName} ${current.getDate()}`;
            
            result.push({
                date: dateStr,
                label,
                amount: dailySum[dateStr] || 0
            });
            
            current.setDate(current.getDate() + 1);
        }
        
        res.json(result);
    } catch (err) {
        console.error("Error en /api/stats/fund-flow:", err);
        res.status(500).json({ error: err.message });
    }
});

// 10. Logistics & Recipes (NEW)
app.get('/api/insumos', async (req, res) => {
    try {
        const insumos = await prisma.insumo.findMany({ where: { deleted: false } });
        res.json(insumos);
    } catch (e) {
        console.error("Error fetching insumos:", e);
        res.status(500).json([]);
    }
});

app.get('/api/insumos/alertas', async (req, res) => {
    try {
        const insumos = await prisma.insumo.findMany({
            where: {
                deleted: false,
                notificarAlerta: true,
                stock: { lte: prisma.insumo.fields.stockMinimo } // Valid Prisma 5+ comparison
            },
            select: { id: true, nombre: true, stock: true, stockMinimo: true, unidadMedida: true }
        });
        res.json(insumos);
    } catch (e) {
        // Fallback for earlier Prisma versions if needed
        try {
            const allAlerta = await prisma.insumo.findMany({ where: { deleted: false, notificarAlerta: true } });
            const filtered = allAlerta.filter(i => i.stock <= i.stockMinimo);
            res.json(filtered.map(i => ({ id: i.id, nombre: i.nombre, stock: i.stock, stockMinimo: i.stockMinimo, unidadMedida: i.unidadMedida })));
        } catch (err) {
            console.error('❌ Error en /api/insumos/alertas:', err);
            res.json([]);
        }
    }
});

app.post('/api/insumos', async (req, res) => {
    const { nombre, precioCompra, unidadMedida, stock, stockMinimo, notificarAlerta } = req.body;
    try {
        const insumo = await prisma.insumo.create({
            data: {
                nombre,
                precioCompra: precioCompra,
                unidadMedida,
                stock: stock || 0,
                stockMinimo: stockMinimo ? stockMinimo : null,
                notificarAlerta: notificarAlerta || false
            }
        });
        res.json(insumo);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/insumos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, precioCompra, unidadMedida, stock, stockMinimo, notificarAlerta, activo } = req.body;
    try {
        const updateData = {};
        if (nombre) updateData.nombre = nombre;
        if (precioCompra !== undefined) updateData.precioCompra = precioCompra || 0;
        if (unidadMedida) updateData.unidadMedida = unidadMedida;
        if (stock !== undefined) updateData.stock = stock || 0;
        if (stockMinimo !== undefined) updateData.stockMinimo = stockMinimo ? stockMinimo : null;
        if (notificarAlerta !== undefined) updateData.notificarAlerta = notificarAlerta;
        if (activo !== undefined) updateData.activo = activo;

        const insumo = await prisma.insumo.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        res.json(insumo);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.delete('/api/insumos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.insumo.update({
            where: { id: parseInt(id) },
            data: { deleted: true, activo: false }
        });
        res.json({ message: "Insumo eliminado." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Obtener receta de un plato
app.get('/api/recetas/:platoId', async (req, res) => {
    const { platoId } = req.params;
    try {
        const receta = await prisma.recetaInsumo.findMany({
            where: { platoId: parseInt(platoId) },
            include: { insumo: true }
        });
        res.json(receta);
    } catch (e) {
        console.error("Error fetching receta:", e);
        res.status(500).json([]);
    }
});

// Actualizar receta de un plato (Reemplazo completo)
app.post('/api/recetas/:platoId', async (req, res) => {
    const { platoId } = req.params;
    const { ingredientes } = req.body; // Array de { insumoId, cantidad }

    try {
        // Ejecutar en transacción
        const result = await prisma.$transaction(async (tx) => {
            // 1. Eliminar receta anterior
            await tx.recetaInsumo.deleteMany({
                where: { platoId: parseInt(platoId) }
            });

            // 2. Insertar nuevos ingredientes si los hay
            if (ingredientes && ingredientes.length > 0) {
                const data = ingredientes.map(ing => ({
                    platoId: parseInt(platoId),
                    insumoId: parseInt(ing.insumoId),
                    cantidad: ing.cantidad
                }));
                await tx.recetaInsumo.createMany({ data });
            }

            // 3. Recalcular costo de producción
            const nuevaReceta = await tx.recetaInsumo.findMany({
                where: { platoId: parseInt(platoId) },
                include: { insumo: true }
            });

            let costoProduccion = 0;
            nuevaReceta.forEach(item => {
                costoProduccion += (item.insumo.precioCompra * item.cantidad);
            });

            // 4. Actualizar costo y margen en el Plato
            const plato = await tx.plato.findUnique({ where: { id: parseInt(platoId) } });

            // Calculamos el margen bruto de ganancia: (Precio Venta - Costo Producción)
            // Podríamos guardarlo como valor o porcentaje. Aquí lo guardamos como número absoluto.
            const margenGanancia = plato.precio - costoProduccion;

            const platoActualizado = await tx.plato.update({
                where: { id: parseInt(platoId) },
                data: {
                    costoProduccion: costoProduccion,
                    margenGanancia: margenGanancia
                }
            });

            return { receta: nuevaReceta, costoProduccion, margenGanancia };
        });

        res.json(result);
    } catch (e) {
        console.error("Error updating recipe:", e);
        res.status(500).json({ error: "Error al actualizar la receta: " + e.message });
    }
});

// Start server

// ==========================================
// 10. Kardex (Movimiento Insumos)
// ==========================================

// Obtener historial del Kardex (opcionalmente filtrado por insumo)
app.get('/api/kardex', async (req, res) => {
    try {
        const { insumoId } = req.query;
        let whereClause = {};
        if (insumoId) {
            whereClause.insumoId = parseInt(insumoId);
        }

        const movimientos = await prisma.movimientoInsumo.findMany({
            where: whereClause,
            include: {
                insumo: true,
                usuario: true
            },
            orderBy: {
                fecha: 'desc'
            }
        });

        res.json(movimientos);
    } catch (e) {
        console.error("Error fetching kardex:", e);
        res.status(500).json({ error: "Error fetching kardex: " + e.message });
    }
});

// Registrar nuevo movimiento manual en el Kardex (COMPRA, MERMA, TRANSFERENCIA, AJUSTE)
app.post('/api/kardex', async (req, res) => {
    // Desestructurar y excluir el 'id' si viniera heredado del frontend
    const { id, insumoId, tipoMovimiento, cantidad, motivo, usuarioId, ...rest } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Asegurar la persistencia de decimales en Insumos Manuales
            const qtyRaw = Number(parseFloat(cantidad).toFixed(2));
            const incrementEvents = ['COMPRA', 'AJUSTE_POSITIVO'];
            const decrementEvents = ['VENTA', 'MERMA', 'TRANSFERENCIA', 'AJUSTE_NEGATIVO'];

            // Determinar el valor exacto a registrar en Kardex (negativo para salidas)
            let qtyKardex = qtyRaw;
            if (decrementEvents.includes(tipoMovimiento)) {
                qtyKardex = Number((-1 * qtyRaw).toFixed(2));
            }

            // Payload estricto sin ID para evitar P2002 Unique Constraint
            const safePayload = {
                insumoId: parseInt(insumoId),
                tipoMovimiento,
                cantidad: qtyKardex, // Guardar con el signo correcto
                motivo,
                usuarioId: parseInt(usuarioId)
            };

            // 1. Crear el registro del movimiento directamente
            const movimiento = await tx.movimientoInsumo.create({
                data: safePayload
            });

            // 2. Afectar el stock real del insumo correspondiente
            const insumoActual = await tx.insumo.findUnique({ where: { id: parseInt(insumoId) } });

            let nuevoStock = insumoActual.stock;
            if (incrementEvents.includes(tipoMovimiento)) {
                nuevoStock = Number((insumoActual.stock + qtyRaw).toFixed(2));
            } else if (decrementEvents.includes(tipoMovimiento)) {
                nuevoStock = Number((insumoActual.stock - qtyRaw).toFixed(2));
            } else {
                nuevoStock = Number((insumoActual.stock + qtyRaw).toFixed(2));
            }

            const inusmoModificado = await tx.insumo.update({
                where: { id: parseInt(insumoId) },
                data: { stock: nuevoStock }
            });

            return { movimiento, nuevoStock: inusmoModificado.stock };
        });

        res.json(result);
    } catch (e) {
        console.error("Error creating kardex entry:", e);
        res.status(500).json({ error: "Error creating kardex entry: " + e.message });
    }
});

app.get('/api/ping', (req, res) => res.json({ status: 'OK_UPDATED' }));

// GET /api/permisos - Obtener todos los permisos
app.get('/api/permisos', async (req, res) => {
    try {
        const permisos = await prisma.permisoModulo.findMany({
            orderBy: [{ rol: 'asc' }, { modulo: 'asc' }]
        });
        res.json(permisos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/permisos/:rol - Obtener permisos de un rol específico
app.get('/api/permisos/:rol', async (req, res) => {
    try {
        const { rol } = req.params;
        const permisos = await prisma.permisoModulo.findMany({
            where: { rol }
        });
        res.json(permisos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/permisos/:rol/:modulo - Actualizar permiso específico
app.put('/api/permisos/:rol/:modulo', async (req, res) => {
    try {
        const { rol, modulo } = req.params;
        const { habilitado } = req.body;

        const permiso = await prisma.permisoModulo.upsert({
            where: { rol_modulo: { rol, modulo } },
            update: { habilitado },
            create: { rol, modulo, habilitado }
        });

        res.json(permiso);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- HELPER: ENVÍO DE CORREO MEDIANTE RESEND ---
const sendVerificationEmail = async (to, code) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    // Los códigos solo pueden aparecer en consola durante desarrollo, nunca en producción
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log(`[EMAIL SIMULATOR] Código de verificación para ${to}: ${code}`);
    }

    if (!apiKey) {
        console.warn('RESEND_API_KEY no está configurada en .env. Saltando envío real de correo.');
        return { success: true, simulated: true };
    }

    try {
        const response = await axios.post('https://api.resend.com/emails', {
            from: from,
            to: to,
            subject: 'Código de verificación de Bunker',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #d9534f; text-align: center;">Bunker - Sistema de Recuperación</h2>
                    <p>Hola,</p>
                    <p>Has recibido este correo para verificar tu cuenta en Bunker.</p>
                    <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #d9534f;">
                        ${code}
                    </div>
                    <p>Este código es válido por 10 minutos.</p>
                    <p>Si no has solicitado este código, puedes ignorar este correo.</p>
                    <hr style="border: 0; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #888; text-align: center;">Bunker Restaurant OS &copy; 2026</p>
                </div>
            `
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return { success: true, id: response.data.id };
    } catch (err) {
        console.error('Error enviando correo con Resend:', err.response ? err.response.data : err.message);
        throw new Error('No se pudo enviar el correo de verificación.');
    }
};

const crypto = require('crypto');

// --- ENDPOINTS: ASIGNACIÓN DE CORREO (PROTEGIDOS) ---

app.post('/api/users/:id/assign-email/request', async (req, res) => {
    const { id } = req.params;
    const { correo } = req.body;
    const adminId = req.headers['x-admin-id'];

    try {
        if (!adminId) {
            return res.status(401).json({ error: "No autorizado. Falta identificación de administrador." });
        }
        const requester = await prisma.user.findUnique({ where: { id: parseInt(adminId) } });
        if (!requester || requester.rol !== 'admin') {
            return res.status(403).json({ error: "Acción no permitida. Solo administradores pueden realizar esta acción." });
        }

        const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!targetUser || targetUser.rol !== 'admin') {
            return res.status(400).json({ error: "El usuario objetivo no es administrador." });
        }

        if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            return res.status(400).json({ error: "El formato de correo no es válido." });
        }

        const userId = targetUser.id;
        const now = new Date();

        let recovery = await prisma.passwordRecovery.findUnique({ where: { userId } });
        if (!recovery) {
            recovery = await prisma.passwordRecovery.create({
                data: {
                    userId,
                    codeHash: '',
                    expiresAt: new Date(0)
                }
            });
        }

        if (recovery.blockedUntil && recovery.blockedUntil > now) {
            const waitTime = Math.ceil((recovery.blockedUntil - now) / (1000 * 60));
            return res.status(429).json({ error: `Has alcanzado el límite de solicitudes. Podrás solicitar un nuevo código en ${waitTime} minutos.` });
        }

        const nextSendCount = recovery.sendCount + 1;
        let blockedUntil = recovery.blockedUntil;

        if (nextSendCount >= 3) {
            blockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = bcrypt.genSaltSync(10);
        const codeHash = bcrypt.hashSync(code, salt);
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

        await prisma.passwordRecovery.update({
            where: { userId },
            data: {
                codeHash,
                expiresAt,
                sendCount: nextSendCount >= 3 ? 3 : nextSendCount,
                blockedUntil
            }
        });

        await sendVerificationEmail(correo, code);

        res.json({ success: true, message: "Código enviado correctamente." });
    } catch (err) {
        console.error("Error en assign-email/request:", err);
        res.status(500).json({ error: "No se pudo enviar el código de verificación." });
    }
});

app.post('/api/users/:id/assign-email/verify', async (req, res) => {
    const { id } = req.params;
    const { correo, code } = req.body;
    const adminId = req.headers['x-admin-id'];

    try {
        if (!adminId) {
            return res.status(401).json({ error: "No autorizado. Falta identificación de administrador." });
        }
        const requester = await prisma.user.findUnique({ where: { id: parseInt(adminId) } });
        if (!requester || requester.rol !== 'admin') {
            return res.status(403).json({ error: "Acción no permitida. Solo administradores pueden realizar esta acción." });
        }

        const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!targetUser || targetUser.rol !== 'admin') {
            return res.status(400).json({ error: "El usuario objetivo no es administrador." });
        }

        const userId = targetUser.id;
        const now = new Date();

        const recovery = await prisma.passwordRecovery.findUnique({ where: { userId } });
        if (!recovery || !recovery.codeHash) {
            return res.status(400).json({ error: "No se ha solicitado ningún código para este usuario." });
        }

        if (recovery.expiresAt < now) {
            return res.status(400).json({ error: "El código ha expirado." });
        }

        const isMatch = bcrypt.compareSync(code, recovery.codeHash);
        if (!isMatch) {
            return res.status(400).json({ error: "El código ingresado no es correcto." });
        }

        await prisma.user.updateMany({
            where: { rol: 'admin' },
            data: { correo }
        });

        await prisma.passwordRecovery.update({
            where: { userId },
            data: {
                codeHash: '',
                expiresAt: new Date(0),
                sendCount: 0,
                blockedUntil: null,
                resetTokenHash: null,
                resetTokenExpiresAt: null
            }
        });

        res.json({ success: true, message: "Correo asociado correctamente." });
    } catch (err) {
        console.error("Error en assign-email/verify:", err);
        res.status(500).json({ error: "Error en el servidor al verificar el código." });
    }
});

// --- ENDPOINTS: RECUPERACIÓN DE CONTRASEÑA ---

app.post('/api/auth/recover-password/request', async (req, res) => {
    const { usuario } = req.body;

    try {
        if (!usuario) {
            return res.status(400).json({ error: "Usuario es requerido." });
        }

        const user = await prisma.user.findUnique({ where: { usuario } });
        if (!user || user.rol !== 'admin') {
            return res.status(403).json({ error: "Acción no permitida. Este flujo está limitado a administradores." });
        }

        if (!user.correo) {
            return res.status(400).json({ error: "El usuario no tiene un correo electrónico asociado." });
        }

        const userId = user.id;
        const now = new Date();

        let recovery = await prisma.passwordRecovery.findUnique({ where: { userId } });
        if (!recovery) {
            recovery = await prisma.passwordRecovery.create({
                data: {
                    userId,
                    codeHash: '',
                    expiresAt: new Date(0)
                }
            });
        }

        if (recovery.blockedUntil && recovery.blockedUntil > now) {
            const waitTime = Math.ceil((recovery.blockedUntil - now) / (1000 * 60));
            return res.status(429).json({ error: `Has alcanzado el límite de solicitudes. Podrás solicitar un nuevo código en ${waitTime} minutos.` });
        }

        const nextSendCount = recovery.sendCount + 1;
        let blockedUntil = recovery.blockedUntil;

        if (nextSendCount >= 3) {
            blockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = bcrypt.genSaltSync(10);
        const codeHash = bcrypt.hashSync(code, salt);
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

        await prisma.passwordRecovery.update({
            where: { userId },
            data: {
                codeHash,
                expiresAt,
                sendCount: nextSendCount >= 3 ? 3 : nextSendCount,
                blockedUntil
            }
        });

        await sendVerificationEmail(user.correo, code);

        res.json({ success: true, message: "Código enviado correctamente." });
    } catch (err) {
        console.error("Error en recover-password/request:", err);
        res.status(500).json({ error: "Error en el servidor al enviar el código de recuperación." });
    }
});

app.post('/api/auth/recover-password/verify', async (req, res) => {
    const { usuario, code } = req.body;

    try {
        if (!usuario || !code) {
            return res.status(400).json({ error: "Usuario y código son requeridos." });
        }

        const user = await prisma.user.findUnique({ where: { usuario } });
        if (!user || user.rol !== 'admin') {
            return res.status(403).json({ error: "Acción no permitida." });
        }

        const userId = user.id;
        const now = new Date();

        const recovery = await prisma.passwordRecovery.findUnique({ where: { userId } });
        if (!recovery || !recovery.codeHash) {
            return res.status(400).json({ error: "No se ha solicitado ningún código de recuperación." });
        }

        if (recovery.expiresAt < now) {
            return res.status(400).json({ error: "El código ha expirado." });
        }

        const isMatch = bcrypt.compareSync(code, recovery.codeHash);
        if (!isMatch) {
            return res.status(400).json({ error: "El código ingresado no es correcto." });
        }

        const resetToken = crypto.randomUUID();
        const resetTokenHash = bcrypt.hashSync(resetToken, 10);
        const resetTokenExpiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min

        await prisma.passwordRecovery.update({
            where: { userId },
            data: {
                codeHash: '',
                expiresAt: new Date(0),
                resetTokenHash,
                resetTokenExpiresAt
            }
        });

        res.json({ success: true, resetToken, userId: user.id });
    } catch (err) {
        console.error("Error en recover-password/verify:", err);
        res.status(500).json({ error: "Error en el servidor al verificar el código." });
    }
});

app.post('/api/auth/recover-password/reset', async (req, res) => {
    const { userId, resetToken, newPassword } = req.body;

    try {
        if (!userId || !resetToken || !newPassword) {
            return res.status(400).json({ error: "Todos los campos son requeridos." });
        }

        if (newPassword.length !== 6 || !/^\d+$/.test(newPassword)) {
            return res.status(400).json({ error: "La contraseña debe tener exactamente 6 dígitos numéricos." });
        }

        const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
        if (!user || user.rol !== 'admin') {
            return res.status(403).json({ error: "Acción no permitida." });
        }

        const now = new Date();
        const recovery = await prisma.passwordRecovery.findUnique({ where: { userId: user.id } });

        if (!recovery || !recovery.resetTokenHash || !recovery.resetTokenExpiresAt) {
            return res.status(400).json({ error: "No hay una sesión de recuperación activa." });
        }

        if (recovery.resetTokenExpiresAt < now) {
            return res.status(400).json({ error: "El token de recuperación ha expirado." });
        }

        const isTokenMatch = bcrypt.compareSync(resetToken, recovery.resetTokenHash);
        if (!isTokenMatch) {
            return res.status(400).json({ error: "Token de recuperación inválido." });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        await prisma.passwordRecovery.update({
            where: { userId: user.id },
            data: {
                codeHash: '',
                expiresAt: new Date(0),
                sendCount: 0,
                blockedUntil: null,
                resetTokenHash: null,
                resetTokenExpiresAt: null
            }
        });

        res.json({ success: true, message: "Contraseña actualizada exitosamente." });
    } catch (err) {
        console.error("Error en recover-password/reset:", err);
        res.status(500).json({ error: "Error en el servidor al restablecer la contraseña." });
    }
});

// --- SERVER START & BOOT CLEANUP ---
const runBootCleanup = async () => {
    try {
        console.log("=== RUNNING BOOT CLEANUP ===");
        // 1. Find tables that are 'libre' but might have hanging non-archived comandas
        const libres = await prisma.mesa.findMany({ where: { estado: 'libre' } });
        for (const mesa of libres) {
            // Find open comandas for this 'libre' table
            const hanging = await prisma.comanda.findMany({
                where: { mesaId: mesa.id, estado: { notIn: ['anulada', 'cerrada'] } }
            });
            for (const com of hanging) {
                console.log(`[CLEANUP] Anulando comanda fantasma ID ${com.id} en Mesa ${mesa.numero} (está libre)`);
                await prisma.comanda.update({ where: { id: com.id }, data: { estado: 'anulada' } });

                // Anular detalles vivos
                await prisma.detalleComanda.updateMany({
                    where: { comandaId: com.id, estado: { notIn: ['anulado', 'entregado'] } },
                    data: { estado: 'anulado' }
                });
            }
        }
        console.log("=== BOOT CLEANUP COMPLETE ===");
    } catch (e) {
        console.error("Boot Cleanup Error:", e);
    }
};

// Condicionar el app.listen para que SOLO se ejecute en desarrollo local
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
        
        // --- RECICLAR E INICIAR SERVIDOR DE IMPRESIÓN EN SEGUNDO PLANO ---
        const spawnPrinterServer = () => {
            try {
                const { spawn } = require('child_process');
                const printerScript = path.join(__dirname, '..', 'printer-server', 'server.js');
                const fs = require('fs');
                
                if (fs.existsSync(printerScript)) {
                    console.log("⚙️  Iniciando servidor de impresión local en segundo plano...");
                    const child = spawn('node', [printerScript], {
                        detached: true,
                        stdio: 'ignore',
                        env: { ...process.env, STATION_ID: process.env.STATION_ID || 'Caja' }
                    });
                    child.unref();
                    console.log(`✅ Servidor de impresión local iniciado en segundo plano (Estación: ${process.env.STATION_ID || 'Caja'}).`);
                }
            } catch (e) {
                console.error("❌ Error al iniciar el servidor de impresión en segundo plano:", e);
            }
        };

        const { exec } = require('child_process');
        exec('netstat -ano | findstr :19999', (err, stdout, stderr) => {
            if (stdout) {
                const lines = stdout.split('\n').filter(line => line.trim().length > 0);
                let killed = false;
                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && pid !== '0' && !killed) {
                        killed = true; // matar solo una vez
                        console.log(`⚙️  Cerrando instancia fantasma anterior del servidor de impresión (PID: ${pid})...`);
                        exec(`taskkill /f /pid ${pid}`, () => {
                            // Esperar un instante y levantar la nueva
                            setTimeout(spawnPrinterServer, 500);
                        });
                    }
                });
                if (!killed) {
                    spawnPrinterServer();
                }
            } else {
                spawnPrinterServer();
            }
        });
    });
}

// EXPORTACIÓN CRÍTICA PARA EL ENTORNO SERVERLESS DE VERCEL
module.exports = app;

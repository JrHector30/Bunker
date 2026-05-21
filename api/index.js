const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const multer = require('multer');
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
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Placeholder dinámico para Vercel Serverless (Sin disco persistente)
app.get('/uploads/:type/:file', (req, res) => {
    const { type, file } = req.params;
    const filePath = path.join(__dirname, '..', 'public', 'uploads', type, file);
    
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
        const user = await prisma.user.create({
            data: { nombre, usuario, rol, password, foto }
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
        if (rol) updateData.rol = rol;
        if (password) updateData.password = password;
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
    const user = await prisma.user.findFirst({
        where: { usuario, password } // In prod, verify hash
    });
    if (user) {
        res.json(user);
    } else {
        res.status(401).json({ error: "Invalid credentials" });
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

app.post('/api/products', async (req, res) => {
    const { nombre, precio, categoriaId, descripcion, imagen } = req.body;
    try {
        const product = await prisma.plato.create({
            data: {
                nombre,
                precio: parseFloat(precio),
                categoriaId: parseInt(categoriaId),
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

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        // Safe Data Construction
        const updateData = {};
        if (data.nombre) updateData.nombre = data.nombre;
        if (data.descripcion !== undefined) updateData.descripcion = data.descripcion; // Allow clearing?
        if (data.precio) updateData.precio = parseFloat(data.precio);
        if (data.categoriaId) updateData.categoriaId = parseInt(data.categoriaId);
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
            .resize({ width: 800, withoutEnlargement: true })
            .webp({ quality: 80 })
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
            const raw = await prisma.$queryRawUnsafe(`SELECT comensales FROM Comanda WHERE id = ${order.id}`);
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
    const tables = await prisma.mesa.findMany({
      orderBy: { numero: 'asc' },
      include: {
        comandas: {
          where: { estado: { notIn: ['cerrada', 'anulada'] } },
          take: 1,
          orderBy: { id: 'desc' },
          select: {
            id: true,
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
                plato: {
                  select: { id: true, nombre: true, precio: true }
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
            comanda: { include: { mesa: true } },
            cocinero: true
        },
        orderBy: { id: 'asc' } // FIFO
    });
    res.json(queue);
});

app.post('/api/orders', async (req, res) => {
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
                // comensales: parseInt(req.body.comensales || 1), // Temporarily disabled until server restart
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
    } else {
        // Self-Healing: If for any reason the mesa was visually 'libre', force it back to 'ocupada'
        await prisma.mesa.update({
            where: { id: parseInt(mesaId) },
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

    // HOTFIX: Manually save comensales using Raw Query (Bypasses outdated Prisma Client)
    if (req.body.comensales) {
        try {
            await prisma.$executeRawUnsafe(`UPDATE Comanda SET comensales = ${parseInt(req.body.comensales)} WHERE id = ${order.id}`);
            order.comensales = parseInt(req.body.comensales); // Update response object
        } catch (e) {
            console.error("Error saving comensales raw:", e.message);
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

        // Transaction: Update Comandas -> Update Old Table -> Update New Table
        await prisma.$transaction([
            ...updates,
            prisma.mesa.update({
                where: { id: parseInt(fromTableId) },
                data: { estado: 'libre' }
            }),
            prisma.mesa.update({
                where: { id: parseInt(toTableId) },
                data: { estado: 'ocupada' }
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

// Staff Stats Endpoint
app.get('/api/staff/stats', async (req, res) => {
    const { date } = req.query; // Expect YYYY-MM-DD
    try {
        // Date Logic (Fixed for Peru Time UTC-5)
        let dateFilter = {};
        if (date) {
            // Convert YYYY-MM-DD to ISO range in UTC-5
            // 00:00:00 Peru = 05:00:00 UTC
            const start = new Date(`${date}T00:00:00.000-05:00`);
            const end = new Date(`${date}T23:59:59.999-05:00`);

            dateFilter = {
                fecha: {
                    gte: start,
                    lte: end
                }
            };
        }

        // 1. Waiters Stats (Users with 'comandas')
        // We group by usuarioId in Comanda
        const waiters = await prisma.user.findMany({
            where: { rol: 'mozo' },
            include: {
                comandas: {
                    where: {
                        estado: 'cerrada', // Only paid orders
                        ...dateFilter      // Filter by date
                    },
                    include: { detalles: { include: { plato: true } } }
                }
            }
        });

        const waiterStats = waiters.map(w => {
            const totalTables = w.comandas.length;
            const totalSales = w.comandas.reduce((acc, order) => {
                const orderTotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
                return acc + orderTotal;
            }, 0);

            return {
                id: w.id,
                nombre: w.nombre,
                rol: w.rol,
                totalTables, // Orders count
                totalSales
            };
        });

        // 2. Kitchen Stats (Users with 'detallesCocina')
        const cooks = await prisma.user.findMany({
            where: { rol: 'cocina' },
            include: {
                detallesCocina: {
                    where: {
                        estado: { in: ['listo', 'entregado'] },
                        // Note: detallesCocina doesn't have a direct date field usually, 
                        // but we can try to filter by fechaPreparacion or link to Comanda date.
                        // Ideally we check if the LINKED COMANDA is from that date if detalle doesn't have it.
                        // checking schema... DetalleComanda usually relies on Comanda's date or has its own timestamps.
                        // For MVP, if we assume cleanup happens daily, we might just look at all active.
                        // But let's try to be precise if schema allows.
                        // If 'fechaPreparacion' exists:
                        ...(date ? {
                            fechaPreparacion: {
                                gte: new Date(`${date}T00:00:00.000-05:00`),
                                lte: new Date(`${date}T23:59:59.999-05:00`)
                            }
                        } : {})
                    }
                }
            }
        });

        const cookStats = cooks.map(c => {
            const totalDishes = c.detallesCocina.length;

            // Calculate Avg Time (min)
            let totalTimeMs = 0;
            let countTime = 0;

            c.detallesCocina.forEach(d => {
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

        res.json({ waiters: waiterStats, cooks: cookStats });

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

// ANULAR COMANDA COMPLETAMENTE
app.put('/api/orders/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const { usuarioResponsable, motivo, usuarioId } = req.body;

    try {
        const orderId = parseInt(id);

        // 1. Get current order & details to calculate total
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

        // 2. Transacción para asegurar la anulación completa
        const result = await prisma.$transaction(async (tx) => {
            // Log en auditoría
            const log = await tx.pedidoCancelado.create({
                data: {
                    comandaId: comanda.id,
                    mesa: comanda.mesa.numero,
                    usuarioResponsable: usuarioResponsable || "Sistema",
                    motivo: motivo || "Anulación directa",
                    totalAnulado: totalAnulado
                }
            });

            // Actualizar Comanda a 'anulada'
            await tx.comanda.update({
                where: { id: comanda.id },
                data: { estado: 'anulada' }
            });

            // Liberar Mesa
            await tx.mesa.update({
                where: { id: comanda.mesaId },
                data: { estado: 'libre' }
            });

            // Eliminar detalles para no dejar rastro en estadísticas
            for (const detalle of comanda.detalles) {
                let isMerma = false;

                if (detalle.estado === 'preparando' && detalle.fechaPreparacion) {
                    const diffMins = (new Date() - new Date(detalle.fechaPreparacion)) / 60000;
                    if (diffMins >= 10) isMerma = true;
                } else if (detalle.estado === 'listo' || detalle.estado === 'entregada') {
                    isMerma = true;
                }

                if (isMerma) {
                    // Generar Merma en Kardex y descontar stock
                    const receta = await tx.recetaInsumo.findMany({
                        where: { platoId: detalle.platoId }
                    });

                    for (const ingrediente of receta) {
                        const cantidadConsumida = ingrediente.cantidad * detalle.cantidad;

                        const insu = await tx.insumo.findUnique({ where: { id: ingrediente.insumoId } });
                        await tx.insumo.update({
                            where: { id: ingrediente.insumoId },
                            data: { stock: round2(insu.stock - cantidadConsumida) }
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

                // FIX: Borrar el detalle LÓGICAMENTE para que no queden rastros en Kitchen KDS ni Stats pero se preserve en BD
                await tx.detalleComanda.update({
                    where: { id: detalle.id },
                    data: { estado: 'anulado' }
                });
            }

            return log;
        });

        res.json({ success: true, log: result });
    } catch (e) {
        console.error("Error cancelling order:", e);
        res.status(500).json({ error: "Error al anular pedido: " + e.message });
    }
});

// Deprecated specific route, keeping for backward compat if needed (aliasing to generic PUT)
app.put('/api/orders/details/:id/status', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const detail = await prisma.detalleComanda.update({
        where: { id: parseInt(id) },
        data: { estado }
    });
    res.json(detail);
});

// 6. Checkout (Updated)
// 6. Checkout (Updated)
app.post('/api/checkout/:mesaId', async (req, res) => {
    const { mesaId } = req.params;
    const { paymentMethod, docType, totalReceived, tip, observation, email } = req.body;

    try {
        // Find ALL active orders for this table
        const activeOrders = await prisma.comanda.findMany({
            where: { mesaId: parseInt(mesaId), estado: { notIn: ['cerrada', 'anulada'] } },
            include: { detalles: { include: { plato: true } } },
            orderBy: { id: 'asc' } // The oldest is usually the valid one, but we'll take the first one found with items if any, or just the first.
        });

        if (activeOrders.length === 0) return res.status(404).json({ error: "No active order" });

        // Let's assume the principal order is the first one or the one with the most items.
        // Usually, the one we want to close is the first one in the list.
        const order = activeOrders[0];

        // If there are ghost orders (more than 1 active order), anulate the others immediately
        if (activeOrders.length > 1) {
            for (let i = 1; i < activeOrders.length; i++) {
                await prisma.comanda.update({
                    where: { id: activeOrders[i].id },
                    data: { estado: 'anulada' }
                });
                console.log(`Auto-Healed during Checkout: Cancelled ghost comanda ${activeOrders[i].id} on Mesa ${mesaId}`);
            }
        }

        // Calculate total
        const total = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);

        // Close order with payment details
        const closedOrder = await prisma.comanda.update({
            where: { id: order.id },
            data: {
                estado: 'cerrada',
                metodoPago: paymentMethod || 'efectivo',
                tipoDocumento: docType || 'sin_comprobante',
                montoRecibido: parseFloat(totalReceived || 0),
                propina: parseFloat(tip || 0),
                observacion: observation || null,
                emailCliente: email || null
            }
        });

        // Set all active details to 'entregado' so they clear from the Kitchen KDS natively
        await prisma.detalleComanda.updateMany({
            where: { comandaId: order.id, estado: { notIn: ['anulado'] } },
            data: { estado: 'entregado' }
        });

        // Free table
        await prisma.mesa.update({
            where: { id: parseInt(mesaId) },
            data: { estado: 'libre' }
        });

        // 3. EXPLOSIÓN DE INSUMOS (Deducción de Stock)
        const platosVendidos = order.detalles;
        for (const detalle of platosVendidos) {
            // Obtener receta de cada plato vendido
            const receta = await prisma.recetaInsumo.findMany({
                where: { platoId: detalle.platoId }
            });

            // Descontar cada insumo consumido
            for (const ingrediente of receta) {
                const cantidadConsumida = ingrediente.cantidad * detalle.cantidad;

                // Actualizar stock del insumo garantizando 2 decimales
                const insumo = await prisma.insumo.findUnique({ where: { id: ingrediente.insumoId } });
                await prisma.insumo.update({
                    where: { id: ingrediente.insumoId },
                    data: {
                        stock: round2(insumo.stock - cantidadConsumida)
                    }
                });

                // Registrar en Kardex (MovimientoInsumo)
                await prisma.movimientoInsumo.create({
                    data: {
                        insumoId: ingrediente.insumoId,
                        tipoMovimiento: 'VENTA',
                        cantidad: cantidadConsumida, // se guarda como valor absoluto
                        motivo: `Descuento automático por Venta de Plato ID: ${detalle.platoId} (Comanda ID: ${order.id})`,
                        usuarioId: order.usuarioId // Registramos el mozo/usuario que cerró/creó la comanda
                    }
                });
            }
        }

        res.json({ ...closedOrder, total, message: "Ticket generated" });
    } catch (error) {
        console.error("Error finalizing payment:", error);
        res.status(500).json({ error: "Error al registrar pago: " + error.message });
    }
});

// 7. Cashier Arqueo Routes
// 7.1 Get Specific Arqueo Details (For PDF)
app.get('/api/cashier/arqueo/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const arq = await prisma.arqueo.findUnique({ where: { id: parseInt(id) } });
        if (!arq) return res.status(404).json({ error: "Arqueo not found" });

        // Logic similar to balance but for specific ID range
        const startDate = arq.fechaInicio;
        const endDate = arq.estado === 'abierto' ? new Date() : arq.fechaFin;

        const sales = await prisma.comanda.findMany({
            where: {
                estado: 'cerrada',
                fecha: { gte: startDate, lte: endDate }
            },
            include: { detalles: { include: { plato: true } }, usuario: true, mesa: true } // Include Waiter and Mesa info
        });

        let totalPropinas = 0;
        let propinasPorMozo = {};

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
                mozo: order.usuario?.nombre || 'General', // Waiter Name
                mesa: order.mesa?.numero || 'Barra'
            };
        });

        res.json({
            ...arq,
            ventas: salesData,
            totalBruto: salesData.reduce((acc, s) => acc + s.total, 0) + totalPropinas,
            totalPropinas,
            propinasPorMozo: Object.values(propinasPorMozo)
        });

    } catch (e) {
        console.error("Error fetching arqueo details:", e);
        res.status(500).json({
            ventas: [],
            totalBruto: 0,
            totalPropinas: 0,
            propinasPorMozo: []
        });
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
        let currentArqueo = lastArqueo;
        if (!currentArqueo) {
            // If absolutely no history, we can return a "Closed" state ready to open
            return res.json({
                estado: 'cerrado',
                inicio: 0,
                egresos: 0,
                ingresos: { efectivo: 0, tarjeta: 0, yape: 0, izipay: 0 },
                totalCaja: 0,
                totalBruto: 0,
                totalPendiente: 0,
                ventas: []
            });
        }

        // Determine Time Range
        // If OPEN: From fechaInicio to NOW
        // If CLOSED: From fechaInicio to fechaFin
        const startDate = currentArqueo.fechaInicio;
        const endDate = currentArqueo.estado === 'abierto' ? new Date() : currentArqueo.fechaFin;

        // Fetch Sales within this range
        const sales = await prisma.comanda.findMany({
            where: {
                estado: 'cerrada',
                fecha: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: { detalles: { include: { plato: true } }, usuario: true }
        });

        // Calculate Totals
        let totalBruto = 0;
        let totalPropinas = 0;
        let propinasPorMozo = {};

        let incomeDetails = {
            efectivo: 0,
            tarjeta: 0,
            yape: 0,
            izipay: 0
        };

        sales.forEach(order => {
            const subtotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
            const propina = order.propina || 0;
            const orderTotal = subtotal + propina;

            totalBruto += orderTotal;
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

            const method = order.metodoPago?.toLowerCase() || 'efectivo';

            if (method.includes('izipay')) incomeDetails.izipay += subtotal;
            else if (method.includes('yape') || method.includes('plin')) incomeDetails.yape += subtotal;
            else if (method.includes('tarjeta')) incomeDetails.tarjeta += subtotal;
            else if (incomeDetails[method] !== undefined) incomeDetails[method] += subtotal;
            else incomeDetails.efectivo += subtotal;
        });

        // Convertir objeto a array para frontend
        const desglosePropinas = Object.values(propinasPorMozo);

        // Calculate Locked/Pending Amounts (Only relevant if Open, but let's calculate anyway for info)
        const openOrders = await prisma.comanda.findMany({
            where: { estado: { not: 'cerrada' } },
            include: { detalles: { include: { plato: true } } }
        });

        const totalPendiente = openOrders.reduce((acc, order) => {
            return acc + order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
        }, 0);

        const inicio = currentArqueo.montoInicial;
        const egresos = 0.00; // Future feature
        const totalCaja = inicio + incomeDetails.efectivo - egresos;

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
            doc: order.tipoDocumento
        }));

        res.json({
            id: currentArqueo.id,
            estado: currentArqueo.estado,
            fechaInicio: currentArqueo.fechaInicio,
            fechaFin: currentArqueo.fechaFin,
            inicio,
            egresos,
            ingresos: incomeDetails,
            totalCaja,
            totalBruto,
            totalPropinas,
            propinasPorMozo: desglosePropinas,
            totalPendiente,
            ventas: ventasDetalladas
        });

    } catch (e) {
        console.error("Error fetching balance:", e);
        res.status(500).json({
            estado: 'cerrado',
            inicio: 0,
            egresos: 0,
            ingresos: { efectivo: 0, tarjeta: 0, yape: 0, izipay: 0 },
            totalCaja: 0,
            totalBruto: 0,
            totalPropinas: 0,
            propinasPorMozo: [],
            totalPendiente: 0,
            ventas: []
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

        // 3. Reset SQLite Sequences (IDs)
        // Note: For SQLite, we delete from sqlite_sequence
        await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name IN ('DetalleComanda', 'Comanda', 'Arqueo');`);

        // 4. Reset Tables Status
        await prisma.mesa.updateMany({ data: { estado: 'libre' } });

        console.log("HARD RESET COMPLETE.");
        res.json({ message: "Historial eliminado y contadores reiniciados." });
    } catch (e) {
        console.error("Reset Failed:", e);
        res.status(500).json({ error: "Error en el reseteo: " + e.message });
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
                    usuarioId: 1, // Placeholder
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
    const { date, page = 1, limit = 5 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let where = {};
    if (date) {
      const start = new Date(`${date}T00:00:00-05:00`);
      const end = new Date(`${date}T23:59:59-05:00`);
      where.fechaInicio = { gte: start, lte: end };
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

      // Agregación veloz directo en PostgreSQL
      const comandasCerradas = await prisma.comanda.findMany({
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
      });

      let totalBruto = 0;
      let totalPropinas = 0;
      let incomeDetails = { efectivo: 0, tarjeta: 0, yape: 0, izipay: 0 };

      comandasCerradas.forEach(order => {
        const subtotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
        totalBruto += subtotal;
        totalPropinas += order.propina || 0;

        const method = (order.metodoPago || 'efectivo').toLowerCase();
        if (method.includes('izipay')) incomeDetails.izipay += subtotal;
        else if (method.includes('yape')) incomeDetails.yape += subtotal;
        else if (method.includes('tarjeta')) incomeDetails.tarjeta += subtotal;
        else incomeDetails.efectivo += subtotal;
      });

      return {
        id: arq.id,
        fechaInicio: arq.fechaInicio,
        fechaFin: arq.fechaFin,
        estado: arq.estado,
        inicio: arq.montoInicial,
        ingresos: incomeDetails,
        totalCaja: arq.montoInicial + incomeDetails.efectivo,
        totalBruto,
        totalPropinas
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
            where: { rol: 'mozo' },
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
            where: { rol: 'cocina' },
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

        res.json({ waiters: waitersStats, cooks: cooksStats });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error fetching staff stats" });
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
                precioCompra: round2(precioCompra),
                unidadMedida,
                stock: round2(stock || 0),
                stockMinimo: stockMinimo ? round2(stockMinimo) : null,
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
        if (precioCompra !== undefined) updateData.precioCompra = round2(precioCompra || 0);
        if (unidadMedida) updateData.unidadMedida = unidadMedida;
        if (stock !== undefined) updateData.stock = round2(stock || 0);
        if (stockMinimo !== undefined) updateData.stockMinimo = stockMinimo ? round2(stockMinimo) : null;
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
                    cantidad: parseFloat(ing.cantidad)
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
    const { insumoId, tipoMovimiento, cantidad, motivo, usuarioId } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const qtyStr = parseFloat(cantidad);

            // 1. Crear el registro del movimiento
            const movimiento = await tx.movimientoInsumo.create({
                data: {
                    insumoId: parseInt(insumoId),
                    tipoMovimiento,
                    cantidad: qtyStr,
                    motivo,
                    usuarioId: parseInt(usuarioId)
                }
            });

            // 2. Afectar el stock real del insumo correspondiente
            const insumoActual = await tx.insumo.findUnique({ where: { id: parseInt(insumoId) } });
            const incrementEvents = ['COMPRA', 'AJUSTE_POSITIVO'];
            const decrementEvents = ['VENTA', 'MERMA', 'TRANSFERENCIA', 'AJUSTE_NEGATIVO'];

            let nuevoStock = insumoActual.stock;
            if (incrementEvents.includes(tipoMovimiento)) {
                nuevoStock = round2(insumoActual.stock + qtyStr);
            } else if (decrementEvents.includes(tipoMovimiento)) {
                nuevoStock = round2(insumoActual.stock - qtyStr);
            } else {
                nuevoStock = round2(insumoActual.stock + qtyStr); // Default o Ajuste neto
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
    });
}

// EXPORTACIÓN CRÍTICA PARA EL ENTORNO SERVERLESS DE VERCEL
module.exports = app;

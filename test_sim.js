const http = require('http');

async function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const req = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try { parsed = JSON.parse(data); } catch (e) { }
                resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on('error', reject);
        if (body) req.write(payload);
        req.end();
    });
}

async function simulate() {
    console.log("=== SIMULACION FLUJO DE USUARIO VIA HTTP ===");

    // 1. Crear nuevo pedido (mesa 2)
    console.log("1. Mozo abre mesa 2 y envía 1 plato (ID 1)");
    const res1 = await request('POST', '/api/orders', {
        mesaId: 2,
        usuarioId: 1,
        detalles: [{ platoId: 1, cantidad: 1, estado: 'pendiente' }]
    });
    console.log("  Status:", res1.status, res1.data);

    // Buscar la comanda ID para la mesa 2
    console.log("2. Leyendo GET /api/tables para sacar el comandaId");
    const res2 = await request('GET', '/api/tables');
    const t2 = res2.data.find(t => t.id === 2);
    const comandaId = t2.comandas?.[0]?.id;
    console.log("  Mesa 2 -> Ocupada:", t2.estado, "| Comanda ID Activa:", comandaId);

    // 2. Anular pedido
    console.log(`3. Anular Pedido Total (Comanda ${comandaId})`);
    const res3 = await request('PUT', `/api/orders/${comandaId}/cancel`, {
        motivo: "Test HTTP Sim",
        usuarioResponsable: "Sim",
        usuarioId: 1
    });
    console.log("  Status de Anulacion:", res3.status, res3.data);

    // 3. Reabrir mesa y crear nuevo pedido
    console.log("4. Mozo reabre mesa 2 y envía 1 plato nuevo (ID 2)");
    const res4 = await request('POST', '/api/orders', {
        mesaId: 2,
        usuarioId: 1,
        detalles: [{ platoId: 2, cantidad: 1, estado: 'pendiente' }]
    });
    console.log("  Status:", res4.status, res4.data);

    // 4. Leer de nuevo tables
    console.log("5. Leyendo GET /api/tables de nuevo para Ver/Pre-Cuenta");
    const res5 = await request('GET', '/api/tables');
    const t2_nueva = res5.data.find(t => t.id === 2);
    console.log("  Mesa 2 -> Ocupada:", t2_nueva.estado);
    console.log("  Comandas Activas:", t2_nueva.comandas?.length);
    if (t2_nueva.comandas?.length > 0) {
        console.log("  Detalles en comanda activa:", t2_nueva.comandas[0].detalles?.length);
    } else {
        console.log("  BUG REPRODUCIDO: 0 comandas activas al leer vía API.");
    }
}

simulate().catch(console.error);

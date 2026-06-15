const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPhantomFix() {
    console.log("=== INICIANDO TEST DE COMANDAS FANTASMA Y TRASLADO ===");

    try {
        // 1. Crear un escenario con una mesa (Mesa 100) y DOS comandas (una real, una fantasma)
        let mesa = await prisma.mesa.findUnique({ where: { id: 100 } });
        if (!mesa) {
            mesa = await prisma.mesa.create({ data: { id: 100, numero: '100', capacidad: 4, estado: 'libre' } });
        }

        let mesaDestino = await prisma.mesa.findUnique({ where: { id: 101 } });
        if (!mesaDestino) {
            mesaDestino = await prisma.mesa.create({ data: { id: 101, numero: '101', capacidad: 4, estado: 'libre' } });
        }

        // Limpieza previa
        await prisma.detalleComanda.deleteMany({
            where: { comanda: { mesaId: { in: [100, 101] } } }
        });
        await prisma.comanda.deleteMany({ where: { mesaId: { in: [100, 101] } } });
        await prisma.mesa.update({ where: { id: 100 }, data: { estado: 'ocupada' } });
        await prisma.mesa.update({ where: { id: 101 }, data: { estado: 'libre' } });

        // Crear Comanda Real
        const comandaReal = await prisma.comanda.create({
            data: {
                mesaId: 100,
                usuarioId: 1,
                estado: 'enviada',
                detalles: { create: [{ platoId: 1, cantidad: 1, estado: 'pendiente' }] }
            }
        });

        // Crear Comanda Fantasma (sin detalles, pero activa)
        const comandaFantasma = await prisma.comanda.create({
            data: {
                mesaId: 100,
                usuarioId: 1,
                estado: 'enviada',
            }
        });

        console.log(`Creadas comandas en Mesa 100. Real: ${comandaReal.id}, Fantasma: ${comandaFantasma.id}`);

        // 2. Probar Traslado (Mesa 100 -> Mesa 101)
        console.log("Ejecutando Traslado de Mesa 100 a Mesa 101...");
        const API_URL = 'http://localhost:3000';

        const resTransfer = await fetch(`${API_URL}/api/tables/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromTableId: 100, toTableId: 101 })
        });

        const transferResult = await resTransfer.json();
        console.log("Resultado Traslado:", transferResult);

        // Verificar DB post-traslado
        const m100 = await prisma.mesa.findUnique({ where: { id: 100 } });
        const m101 = await prisma.mesa.findUnique({ where: { id: 101 } });
        const comandas101 = await prisma.comanda.findMany({ where: { mesaId: 101, estado: 'enviada' } });
        const comandas100 = await prisma.comanda.findMany({ where: { mesaId: 100, estado: 'enviada' } });

        console.log(`Estado Mesa 100 (Origen): ${m100.estado} (Deberia ser libre)`);
        console.log(`Comandas activas en Mesa 100 (Deberia ser 0): ${comandas100.length}`);
        console.log(`Comandas activas en Mesa 101 (Deberia ser 2): ${comandas101.length}`);

        // 3. Probar Checkout en Mesa 101
        console.log("Ejecutando Checkout en Mesa 101...");
        const resCheckout = await fetch(`${API_URL}/api/checkout/101`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMethod: 'efectivo', docType: 'boleta' })
        });

        const checkoutResult = await resCheckout.json();
        console.log(`Checkout cerrado: Comanda principal ${checkoutResult.id} cobrada por ${checkoutResult.total}`);

        // Verificamos estado final de la Base de Datos para Mesa 101
        const finalM101 = await prisma.mesa.findUnique({ where: { id: 101 } });
        console.log(`Estado Final Mesa 101: ${finalM101.estado} (Deberia ser libre)`);

        const cerradasM101 = await prisma.comanda.findMany({ where: { mesaId: 101, estado: 'cerrada' } });
        const anuladasM101 = await prisma.comanda.findMany({ where: { mesaId: 101, estado: 'anulada' } });

        console.log(`Comandas cerradas en Mesa 101 (Deberia ser 1): ${cerradasM101.length}`);
        console.log(`Comandas anuladas (fantasmas matadas) en Mesa 101 (Deberia ser 1): ${anuladasM101.length}`);

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testPhantomFix();

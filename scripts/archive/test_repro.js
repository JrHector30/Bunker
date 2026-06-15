const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

async function reproduce() {
    console.log("--- PASO 1: CREAR PEDIDO INICIAL (Mesa 10) ---");
    let comanda1 = await prisma.comanda.create({
        data: {
            mesaId: 10,
            usuarioId: 1,
            estado: 'enviada',
            detalles: {
                create: [{ platoId: 1, cantidad: 1, estado: 'pendiente' }]
            }
        },
        include: { detalles: true }
    });
    await prisma.mesa.update({ where: { id: 10 }, data: { estado: 'ocupada' } });
    console.log(`Comanda Inicial Creada: ID ${comanda1.id}, Estado: ${comanda1.estado}`);

    await delay(1000);

    console.log("\n--- PASO 2: ANULAR PEDIDO TOTAL ---");
    // Emula la logica exacta de PUT /api/orders/:id/cancel
    const cToAnular = await prisma.comanda.findUnique({
        where: { id: comanda1.id },
        include: { detalles: { include: { plato: true } }, mesa: true }
    });

    await prisma.$transaction(async (tx) => {
        await tx.pedidoCancelado.create({
            data: {
                comandaId: cToAnular.id,
                mesa: cToAnular.mesa.numero,
                usuarioResponsable: "Test",
                totalAnulado: 0
            }
        });
        await tx.comanda.update({ where: { id: cToAnular.id }, data: { estado: 'anulada' } });
        await tx.mesa.update({ where: { id: cToAnular.mesaId }, data: { estado: 'libre' } });
        for (const detalle of cToAnular.detalles) {
            await tx.detalleComanda.delete({ where: { id: detalle.id } }); // DELETE PHYSICALLY
        }
    });

    const verif1 = await prisma.comanda.findUnique({ where: { id: comanda1.id } });
    console.log(`Verificacion post-anulacion: Comanda ID ${verif1.id}, Estado: ${verif1.estado}`);
    const checkKDS1 = await prisma.detalleComanda.findMany({ where: { comandaId: comanda1.id } });
    console.log(`Detalles KDS atascados (deberia ser 0): ${checkKDS1.length}`);

    await delay(1000);

    console.log("\n--- PASO 3: REABRIR MESA Y CREAR NUEVO PEDIDO ---");
    // Emula POST /api/orders
    let openOrder = await prisma.comanda.findFirst({
        where: { mesaId: 10, estado: { notIn: ['cerrada', 'anulada'] } }
    });
    if (!openOrder) {
        console.log("No open order found, creating NEW comanda.");
        openOrder = await prisma.comanda.create({
            data: {
                mesaId: 10,
                usuarioId: 1,
                estado: 'enviada',
                detalles: {
                    create: [{ platoId: 2, cantidad: 1, estado: 'pendiente' }]
                }
            }
        });
        await prisma.mesa.update({ where: { id: 10 }, data: { estado: 'ocupada' } });
        console.log(`Nueva comanda creada: ID ${openOrder.id}`);
    } else {
        console.log("BUG: Found existing order that wasn't annulled! ID:", openOrder.id);
        await prisma.detalleComanda.create({
            data: {
                comandaId: openOrder.id,
                platoId: 2,
                cantidad: 1,
                estado: 'pendiente'
            }
        });
        await prisma.mesa.update({ where: { id: 10 }, data: { estado: 'ocupada' } });
        console.log("Added detail to existing comanda.");
    }

    console.log("\n--- PASO 4: FETCH GET /api/tables (MODAL VER/PRE-CUENTA) ---");
    const testTables = await prisma.mesa.findMany({
        where: { id: 10 },
        include: {
            comandas: {
                where: { estado: { notIn: ['cerrada', 'anulada'] } },
                include: {
                    usuario: true,
                    detalles: true
                }
            }
        }
    });

    console.log("Resultado de GET /api/tables para Mesa 10:");
    const theTable = testTables[0];
    console.log(`Mesa ID: ${theTable.id}, Estado: ${theTable.estado}`);
    console.log(`Comandas activas encontradas: ${theTable.comandas.length}`);
    if (theTable.comandas.length > 0) {
        console.log(`Detalles en la comanda [0]: ${theTable.comandas[0].detalles.length}`);
    } else {
        console.log("BUG REPRODUCIDO: 0 comandas activas, por lo que GetGroupedItems devolverá vacío.");
    }
}

reproduce().catch(console.error).finally(() => prisma.$disconnect());

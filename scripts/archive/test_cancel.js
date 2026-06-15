const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cancelOrder(orderId, usuarioResponsable = "Sistema", motivo = "Test Anulacion", usuarioId = 1) {
    try {
        const comanda = await prisma.comanda.findUnique({
            where: { id: orderId },
            include: { detalles: { include: { plato: true } }, mesa: true }
        });

        if (!comanda) {
            console.log("Comanda not found.");
            return;
        }

        const totalAnulado = comanda.detalles.reduce((sum, d) => sum + (d.cantidad * d.plato.precio), 0);

        const result = await prisma.$transaction(async (tx) => {
            const log = await tx.pedidoCancelado.create({
                data: {
                    comandaId: comanda.id,
                    mesa: comanda.mesa.numero,
                    usuarioResponsable,
                    motivo,
                    totalAnulado
                }
            });

            await tx.comanda.update({
                where: { id: comanda.id },
                data: { estado: 'anulada' }
            });

            await tx.mesa.update({
                where: { id: comanda.mesaId },
                data: { estado: 'libre' }
            });

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

                        await tx.insumo.update({
                            where: { id: ingrediente.insumoId },
                            data: { stock: { decrement: cantidadConsumida } }
                        });

                        await tx.movimientoInsumo.create({
                            data: {
                                insumoId: ingrediente.insumoId,
                                tipoMovimiento: 'MERMA',
                                cantidad: cantidadConsumida,
                                motivo: `Anulación (>10m prep o listo). Motivo Mozo: ${motivo}. Mesa: ${comanda.mesa.numero}`,
                                usuarioId: usuarioId ? parseInt(usuarioId) : 1
                            }
                        });
                    }
                }

                // Borrar detalle
                await tx.detalleComanda.delete({ where: { id: detalle.id } });
            }

            return log;
        });

        console.log("Cancellation successful:", result);
    } catch (e) {
        console.error("Cancellation Failed:", e);
    }
}

// Emulate a new order to test
async function test() {
    console.log("Creating dummy order...");
    const comanda = await prisma.comanda.create({
        data: {
            mesaId: 1, // Assume mesa 1 exists
            usuarioId: 1,
            estado: 'enviada',
            detalles: {
                create: [
                    { platoId: 1, cantidad: 1, estado: 'pendiente' }
                ]
            }
        },
        include: { detalles: true }
    });

    console.log("Created comanda ID:", comanda.id);
    await cancelOrder(comanda.id);
}

test().catch(console.error).finally(() => prisma.$disconnect());

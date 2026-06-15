const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function emulateApi() {
    try {
        const tables = await prisma.mesa.findMany({
            include: {
                comandas: {
                    where: { estado: { notIn: ['cerrada', 'anulada'] } },
                    include: {
                        usuario: true,
                        detalles: {
                            include: {
                                plato: { include: { categoria: true } }
                            }
                        }
                    }
                }
            }
        });

        const ocupada = tables.find(t => t.estado === 'ocupada');
        if (ocupada) {
            console.log("Mesa ocupada tiene comandas.length =", ocupada.comandas.length);
            ocupada.comandas.forEach((c, idx) => {
                console.log(`Comanda [${idx}] ID: ${c.id}, Detalles length: ${c.detalles?.length}`);
            });
        } else {
            console.log("No ocupadas.");
        }
    } catch (e) {
        console.error("API CRASHED:", e);
    }
}

emulateApi().catch(console.error).finally(() => prisma.$disconnect());

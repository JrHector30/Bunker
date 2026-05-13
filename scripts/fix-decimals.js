const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDecimals() {
    const insumos = await prisma.insumo.findMany();
    
    for (const insumo of insumos) {
        await prisma.insumo.update({
            where: { id: insumo.id },
            data: {
                precioCompra: Math.round((parseFloat(insumo.precioCompra) + Number.EPSILON) * 100) / 100,
                stock: Math.round((parseFloat(insumo.stock) + Number.EPSILON) * 100) / 100,
                stockMinimo: insumo.stockMinimo ? Math.round((parseFloat(insumo.stockMinimo) + Number.EPSILON) * 100) / 100 : 0
            }
        });
    }
    
    console.log('✅ Decimales corregidos en todos los insumos');
}

fixDecimals()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

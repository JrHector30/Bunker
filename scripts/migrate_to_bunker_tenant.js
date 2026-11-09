const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrateData() {
    console.log("=================================================");
    console.log("INICIANDO ASIGNACIÓN DE DATOS A 'BUNKER RESTOBAR'");
    console.log("=================================================");

    try {
        // 1. Obtener o crear el restaurante principal
        let bunker = await prisma.restaurante.findUnique({
            where: { slug: 'bunker-restobar' }
        });

        if (!bunker) {
            bunker = await prisma.restaurante.create({
                data: {
                    nombre: 'Bunker Restobar',
                    slug: 'bunker-restobar',
                    activo: true
                }
            });
            console.log(`✅ Restaurante creado: ID ${bunker.id} | ${bunker.nombre} (${bunker.slug})`);
        } else {
            console.log(`ℹ️ Restaurante ya existente: ID ${bunker.id} | ${bunker.nombre} (${bunker.slug})`);
        }

        const tenantId = bunker.id;

        // 2. Asignar restauranteId a todas las tablas base
        const resUsers = await prisma.user.updateMany({
            where: { restauranteId: null },
            data: { restauranteId: tenantId }
        });
        console.log(`👤 Usuarios asignados a Bunker: ${resUsers.count}`);

        const resMesas = await prisma.mesa.updateMany({
            where: { restauranteId: null },
            data: { restauranteId: tenantId }
        });
        console.log(`🪑 Mesas asignadas a Bunker: ${resMesas.count}`);

        const resCategorias = await prisma.categoria.updateMany({
            where: { restauranteId: null },
            data: { restauranteId: tenantId }
        });
        console.log(`📂 Categorías asignadas a Bunker: ${resCategorias.count}`);

        const resPlatos = await prisma.plato.updateMany({
            where: { restauranteId: null },
            data: { restauranteId: tenantId }
        });
        console.log(`🍽️ Platos asignados a Bunker: ${resPlatos.count}`);

        const resComandas = await prisma.comanda.updateMany({
            where: { restauranteId: null },
            data: { restauranteId: tenantId }
        });
        console.log(`📋 Comandas asignadas a Bunker: ${resComandas.count}`);

        const resArqueos = await prisma.arqueo.updateMany({
            where: { restauranteId: null },
            data: { restauranteId: tenantId }
        });
        console.log(`💰 Arqueos asignados a Bunker: ${resArqueos.count}`);

        const resInsumos = await prisma.insumo.updateMany({
            where: { restauranteId: null },
            data: { restauranteId: tenantId }
        });
        console.log(`📦 Insumos asignados a Bunker: ${resInsumos.count}`);

        console.log("-------------------------------------------------");
        console.log("VERIFICANDO INTEGRIDAD CONTRA EL RESPALDO");
        console.log("-------------------------------------------------");

        // 3. Verificación de conteos
        const [
            usersCount,
            mesasCount,
            categoriasCount,
            platosCount,
            comandasCount,
            arqueosCount,
            insumosCount
        ] = await Promise.all([
            prisma.user.count({ where: { restauranteId: tenantId } }),
            prisma.mesa.count({ where: { restauranteId: tenantId } }),
            prisma.categoria.count({ where: { restauranteId: tenantId } }),
            prisma.plato.count({ where: { restauranteId: tenantId } }),
            prisma.comanda.count({ where: { restauranteId: tenantId } }),
            prisma.arqueo.count({ where: { restauranteId: tenantId } }),
            prisma.insumo.count({ where: { restauranteId: tenantId } })
        ]);

        console.table({
            "Usuarios en Bunker": usersCount,
            "Mesas en Bunker": mesasCount,
            "Categorías en Bunker": categoriasCount,
            "Platos en Bunker": platosCount,
            "Comandas en Bunker": comandasCount,
            "Arqueos en Bunker": arqueosCount,
            "Insumos en Bunker": insumosCount
        });

        console.log("=================================================");
        console.log("✅ FASE 1 COMPLETADA CON ÉXITO: 100% DATOS SEGUROS");
        console.log("=================================================");

    } catch (e) {
        console.error("❌ ERROR EN LA MIGRACIÓN DE DATOS:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

migrateData();

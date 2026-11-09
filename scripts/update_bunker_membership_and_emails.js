const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBunker() {
    console.log("==================================================");
    console.log("ACTUALIZANDO DATOS DE BUNKER RESTOBAR Y CORREOS");
    console.log("==================================================");

    try {
        // 1. Actualizar el local Bunker Restobar
        const restaurante = await prisma.restaurante.update({
            where: { slug: 'bunker-restobar' },
            data: {
                tipoMembresia: 'Corporativo',
                limiteMesas: 100
            }
        });
        console.log(`✅ Local actualizado: ${restaurante.nombre} (${restaurante.slug})`);
        console.log(`📋 Membresía: ${restaurante.tipoMembresia}`);

        // 2. Actualizar correos de los administradores de Bunker Restobar a jrhector300@gmail.com
        const updateAdmins = await prisma.user.updateMany({
            where: {
                restauranteId: restaurante.id,
                rol: 'admin'
            },
            data: {
                correo: 'jrhector300@gmail.com',
                primerAcceso: false
            }
        });
        console.log(`👤 Administradores de Bunker actualizados a jrhector300@gmail.com: ${updateAdmins.count}`);

        // Asegurar que ningún usuario existente tenga primerAcceso en true
        await prisma.user.updateMany({
            where: { restauranteId: restaurante.id },
            data: { primerAcceso: false }
        });

        // 3. Mostrar auditoría final
        const users = await prisma.user.findMany({
            where: { restauranteId: restaurante.id },
            select: { id: true, nombre: true, usuario: true, rol: true, correo: true, primerAcceso: true }
        });

        console.log("\n📊 Estado final de los usuarios de Bunker Restobar:");
        console.table(users);

        console.log("==================================================");
        console.log("✅ ACTUALIZACIÓN COMPLETADA CON ÉXITO");
        console.log("==================================================");

    } catch (e) {
        console.error("❌ ERROR AL ACTUALIZAR:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

updateBunker();

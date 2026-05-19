const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:71367006Hq.2026@db.iyskqnlikuwatulyotcb.supabase.co:5432/postgres"
        }
    }
});

// 🌟 ¡AQUÍ ESTÁ EL CAMBIO REAL! Reemplazado con tu ID de Supabase exclusivo
const SUPABASE_URL = 'https://iyskqnlikuwatulyotcb.supabase.co';

async function updateURLs() {
    console.log('🔄 Iniciando actualización de URLs de imágenes en Supabase...');
    try {
        const platos = await prisma.plato.findMany();
        let contador = 0;

        for (const plato of platos) {
            if (plato.imagen && plato.imagen.startsWith('/uploads')) {
                const filename = plato.imagen.split('/').pop();
                const newURL = `${SUPABASE_URL}/storage/v1/object/public/productos/${filename}`;

                await prisma.plato.update({
                    where: { id: plato.id },
                    data: { imagen: newURL }
                });

                console.log(`✅ Actualizado: ${plato.nombre}`);
                contador++;
            }
        }
        console.log(`\n🎉 Proceso terminado. Se actualizaron ${contador} platos con sus nuevas URLs de la nube.`);
    } catch (error) {
        console.error('❌ Error al actualizar las URLs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateURLs();
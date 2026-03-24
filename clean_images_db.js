const { PrismaClient } = require('@prisma/client');
const fs = require('fs-extra');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Limpiando rutas de imágenes en la Base de Datos...");
        const result = await prisma.plato.updateMany({
            where: { imagen: { not: null } },
            data: { imagen: null }
        });
        console.log(`Se han limpiado ${result.count} platos en la Base de Datos.`);

        const uploadDir = path.join(__dirname, 'public', 'uploads', 'productos');
        console.log("Limpiando directorio físico:", uploadDir);
        // Ensure the directory exists to empty it instead of totally deleting it
        await fs.ensureDir(uploadDir); 
        await fs.emptyDir(uploadDir);
        console.log("Directorio físico de imágenes limpio y listo para nuevas subidas.");
    } catch (e) {
        console.error("Error al limpiar:", e);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });

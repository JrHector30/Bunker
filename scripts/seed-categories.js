const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCategoriesPermisos() {
    const roles = ['mozo', 'cocina', 'caja', 'admin'];
    
    for (const rol of roles) {
        // Por defecto, solo admin y caja tendrán habilitado Categorías
        const habilitado = rol === 'admin' || rol === 'caja';
        
        await prisma.permisoModulo.upsert({
            where: { rol_modulo: { rol, modulo: 'categories' } },
            update: {}, // No actualizar si ya existe
            create: { rol, modulo: 'categories', habilitado }
        });
    }
    console.log('✅ Permisos de Categorías creados en la base de datos.');
}

seedCategoriesPermisos()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

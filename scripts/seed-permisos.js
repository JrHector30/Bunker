const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPermisos() {
    const permisosPorDefecto = [
        // MOZO
        { rol: 'mozo', modulo: 'mesas', habilitado: true },
        { rol: 'mozo', modulo: 'cocina', habilitado: false },
        { rol: 'mozo', modulo: 'caja', habilitado: false },
        { rol: 'mozo', modulo: 'logistica', habilitado: false },
        { rol: 'mozo', modulo: 'reportes', habilitado: false },
        { rol: 'mozo', modulo: 'usuarios', habilitado: false },
        
        // COCINA
        { rol: 'cocina', modulo: 'mesas', habilitado: false },
        { rol: 'cocina', modulo: 'cocina', habilitado: true },
        { rol: 'cocina', modulo: 'caja', habilitado: false },
        { rol: 'cocina', modulo: 'logistica', habilitado: false },
        { rol: 'cocina', modulo: 'reportes', habilitado: false },
        { rol: 'cocina', modulo: 'usuarios', habilitado: false },
        
        // CAJA
        { rol: 'caja', modulo: 'mesas', habilitado: false },
        { rol: 'caja', modulo: 'cocina', habilitado: false },
        { rol: 'caja', modulo: 'caja', habilitado: true },
        { rol: 'caja', modulo: 'logistica', habilitado: true },
        { rol: 'caja', modulo: 'reportes', habilitado: true },
        { rol: 'caja', modulo: 'usuarios', habilitado: false },
        
        // ADMIN (todos habilitados por defecto, pero igual se registra)
        { rol: 'admin', modulo: 'mesas', habilitado: true },
        { rol: 'admin', modulo: 'cocina', habilitado: true },
        { rol: 'admin', modulo: 'caja', habilitado: true },
        { rol: 'admin', modulo: 'logistica', habilitado: true },
        { rol: 'admin', modulo: 'reportes', habilitado: true },
        { rol: 'admin', modulo: 'usuarios', habilitado: true },
    ];
    
    for (const permiso of permisosPorDefecto) {
        await prisma.permisoModulo.upsert({
            where: { rol_modulo: { rol: permiso.rol, modulo: permiso.modulo } },
            update: {},
            create: permiso
        });
    }
    
    console.log('✅ Permisos por defecto creados');
}

seedPermisos()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

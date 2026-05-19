const sqlite3 = require('sqlite3').verbose();
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// 1. Inicializamos Prisma apuntando a Supabase (PostgreSQL)
const prismaTarget = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:71367006Hq.2026@db.iyskqnlikuwatulyotcb.supabase.co:5432/postgres"
    }
  }
});

// 2. Conectamos directamente al archivo local dev.db
const dbPath = path.join(__dirname, '../prisma/dev.db');
const sourceDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('💥 Error al abrir dev.db local:', err.message);
    process.exit(1);
  }
});

// Helper para convertir las consultas de SQLite a promesas de JS
const dbAll = (query) => {
  return new Promise((resolve, reject) => {
    sourceDb.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function migrateData() {
  console.log('🚀 Iniciando migración de datos nativa (SQLite -> Supabase)...');
  try {
    // 🧹 LIMPIEZA AUTOMÁTICA EN SUPABASE (Para evitar errores de duplicados)
    console.log('🧹 Limpiando datos previos en Supabase...');
    // Borramos en orden inverso por las llaves foráneas
    await prismaTarget.permisoModulo.deleteMany().catch(() => { });
    await prismaTarget.pedidoCancelado.deleteMany().catch(() => { });
    await prismaTarget.movimientoInsumo.deleteMany().catch(() => { });
    await prismaTarget.arqueo.deleteMany().catch(() => { });
    await prismaTarget.detalleComanda.deleteMany().catch(() => { });
    await prismaTarget.comanda.deleteMany().catch(() => { });
    await prismaTarget.recetaInsumo.deleteMany().catch(() => { });
    await prismaTarget.insumo.deleteMany().catch(() => { });
    await prismaTarget.plato.deleteMany().catch(() => { });
    await prismaTarget.categoria.deleteMany().catch(() => { });
    await prismaTarget.mesa.deleteMany().catch(() => { });
    await prismaTarget.user.deleteMany().catch(() => { });
    console.log('✅ Base de datos de Supabase lista y limpia.');
    // 1. Usuarios
    console.log('📋 Migrando usuarios...');
    const users = await dbAll('SELECT * FROM User');
    for (const u of users) {
      await prismaTarget.user.create({
        data: {
          id: u.id,
          nombre: u.nombre,
          usuario: u.usuario,
          rol: u.rol,
          password: u.password,
          foto: u.foto
        }
      });
    }
    console.log(`✅ ${users.length} usuarios migrados`);

    // 2. Mesas
    console.log('📋 Migrando mesas...');
    const mesas = await dbAll('SELECT * FROM Mesa');
    for (const m of mesas) {
      await prismaTarget.mesa.create({
        data: {
          id: m.id,
          numero: m.numero,
          capacidad: m.capacidad,
          estado: m.estado
        }
      });
    }
    console.log(`✅ ${mesas.length} mesas migradas`);

    // 3. Categorías
    console.log('📋 Migrando categorías...');
    const categorias = await dbAll('SELECT * FROM Categoria');
    for (const c of categorias) {
      await prismaTarget.categoria.create({
        data: {
          id: c.id,
          nombre: c.nombre,
          icono: c.icono,
          color: c.color,
          orden: c.orden,
          activo: c.activo === 1,
          deleted: c.deleted === 1,
          enviarCocina: c.enviarCocina === 1
        }
      });
    }
    console.log(`✅ ${categorias.length} categorías migradas`);

    // 4. Platos
    console.log('📋 Migrando platos...');
    const platos = await dbAll('SELECT * FROM Plato');
    for (const p of platos) {
      await prismaTarget.plato.create({
        data: {
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          precio: parseFloat(p.precio),
          categoriaId: p.categoriaId,
          imagen: p.imagen,
          activo: p.activo === 1,
          deleted: p.deleted === 1,
          costoProduccion: parseFloat(p.costoProduccion || 0),
          margenGanancia: parseFloat(p.marginGanancia || p.margenGanancia || 0), // ¡Corregido aquí con 'e'!
          fechaCreacion: new Date(p.fechaCreacion),
          ultimaModificacion: new Date(p.ultimaModificacion)
        }
      });
    }
    console.log(`✅ ${platos.length} platos migrados`);

    // 5. Insumos
    console.log('📋 Migrando insumos...');
    const insumos = await dbAll('SELECT * FROM Insumo');
    for (const i of insumos) {
      await prismaTarget.insumo.create({
        data: {
          id: i.id,
          nombre: i.nombre,
          precioCompra: parseFloat(i.precioCompra),
          unidadMedida: i.unidadMedida,
          stock: parseFloat(i.stock || 0),
          stockMinimo: parseFloat(i.stockMinimo || 0),
          notificarAlerta: i.notificarAlerta === 1,
          activo: i.activo === 1,
          deleted: i.deleted === 1
        }
      });
    }
    console.log(`✅ ${insumos.length} insumos migrados`);

    // 6. Recetas
    console.log('📋 Migrando recetas...');
    const recetas = await dbAll('SELECT * FROM RecetaInsumo');
    for (const r of recetas) {
      await prismaTarget.recetaInsumo.create({
        data: {
          id: r.id,
          platoId: r.platoId,
          insumoId: r.insumoId,
          cantidad: parseFloat(r.cantidad)
        }
      });
    }
    console.log(`✅ ${recetas.length} recetas migradas`);

    // 7. Comandas
    console.log('📋 Migrando comandas...');
    const comandas = await dbAll('SELECT * FROM Comanda');
    for (const c of comandas) {
      await prismaTarget.comanda.create({
        data: {
          id: c.id,
          mesaId: c.mesaId,
          usuarioId: c.usuarioId,
          fecha: new Date(c.fecha),
          estado: c.estado,
          comensales: c.comensales,
          metodoPago: c.metodoPago,
          tipoDocumento: c.tipoDocumento,
          montoRecibido: c.montoRecibido ? parseFloat(c.montoRecibido) : null,
          propina: parseFloat(c.propina || 0),
          observacion: c.observacion,
          emailCliente: c.emailCliente
        }
      });
    }
    console.log(`✅ ${comandas.length} comandas migradas`);

    // 8. Detalles de Comanda
    console.log('📋 Migrando detalles de comandas...');
    const detalles = await dbAll('SELECT * FROM DetalleComanda');
    for (const d of detalles) {
      await prismaTarget.detalleComanda.create({
        data: {
          id: d.id,
          comandaId: d.comandaId,
          platoId: d.platoId,
          cantidad: d.cantidad,
          estado: d.estado,
          observacion: d.observacion,
          cocineroId: d.cocineroId,
          fechaCreacion: new Date(d.fechaCreacion),
          fechaPreparacion: d.fechaPreparacion ? new Date(d.fechaPreparacion) : null,
          fechaListo: d.fechaListo ? new Date(d.fechaListo) : null
        }
      });
    }
    console.log(`✅ ${detalles.length} detalles migrados`);

    // 9. Arqueos
    console.log('📋 Migrando arqueos...');
    const arqueos = await dbAll('SELECT * FROM Arqueo');
    for (const a of arqueos) {
      await prismaTarget.arqueo.create({
        data: {
          id: a.id,
          fechaInicio: new Date(a.fechaInicio),
          fechaFin: a.fechaFin ? new Date(a.fechaFin) : null,
          montoInicial: parseFloat(a.montoInicial),
          montoFinal: a.montoFinal ? parseFloat(a.montoFinal) : null,
          estado: a.estado,
          usuarioId: a.usuarioId
        }
      });
    }
    console.log(`✅ ${arqueos.length} arqueos migrados`);

    // 10. Movimientos de Insumos (Kardex)
    console.log('📋 Migrando kardex...');
    const movimientos = await dbAll('SELECT * FROM MovimientoInsumo');
    for (const m of movimientos) {
      await prismaTarget.movimientoInsumo.create({
        data: {
          id: m.id,
          insumoId: m.insumoId,
          tipoMovimiento: m.tipoMovimiento,
          cantidad: parseFloat(m.cantidad),
          motivo: m.motivo,
          usuarioId: m.usuarioId,
          fecha: new Date(m.fecha)
        }
      });
    }
    console.log(`✅ ${movimientos.length} movimientos migrados`);

    // 11. Pedidos Cancelados
    console.log('📋 Migrando pedidos cancelados...');
    const cancelados = await dbAll('SELECT * FROM PedidoCancelado');
    for (const pc of cancelados) {
      await prismaTarget.pedidoCancelado.create({
        data: {
          id: pc.id,
          comandaId: pc.comandaId,
          mesa: pc.mesa,
          usuarioResponsable: pc.usuarioResponsable,
          motivo: pc.motivo,
          totalAnulado: parseFloat(pc.totalAnulado),
          fecha: new Date(pc.fecha)
        }
      });
    }
    console.log(`✅ ${cancelados.length} cancelaciones migradas`);

    // 12. Permisos de Módulos
    console.log('📋 Migrando permisos...');
    // Cambiado de 'PermisoModulo' a 'permisos_modulos' que es el nombre real en SQLite
    const permisos = await dbAll('SELECT * FROM permisos_modulos');
    for (const perm of permisos) {
      await prismaTarget.permisoModulo.create({
        data: {
          id: perm.id,
          rol: perm.rol,
          modulo: perm.modulo,
          habilitado: perm.habilitado === 1
        }
      });
    }
    console.log(`✅ ${permisos.length} permisos migrados`);

    console.log('\n🎉 ¡MIGRACIÓN COMPLETA! Todo está en Supabase.');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    sourceDb.close();
    await prismaTarget.$disconnect();
  }
}

migrateData();
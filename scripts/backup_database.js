const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runBackup() {
    console.log("==========================================");
    console.log("INICIANDO RESPALDO COMPLETO DE BASE DE DATOS");
    console.log("==========================================");

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups');

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `backup_pre_multitenant_${timestamp}.json`);

    try {
        const [
            users,
            passwordRecoveries,
            mesas,
            categorias,
            platos,
            comandas,
            detallesComanda,
            arqueos,
            movimientosCaja,
            insumos,
            recetasInsumo,
            movimientosInsumo,
            pedidosCancelados,
            permisosModulos,
            configuraciones,
            ticketsPendientes,
            dispositivosRed,
            historialReparaciones,
            syncOperations
        ] = await Promise.all([
            prisma.user.findMany(),
            prisma.passwordRecovery.findMany(),
            prisma.mesa.findMany(),
            prisma.categoria.findMany(),
            prisma.plato.findMany(),
            prisma.comanda.findMany(),
            prisma.detalleComanda.findMany(),
            prisma.arqueo.findMany(),
            prisma.movimientoCaja.findMany(),
            prisma.insumo.findMany(),
            prisma.recetaInsumo.findMany(),
            prisma.movimientoInsumo.findMany(),
            prisma.pedidoCancelado.findMany(),
            prisma.permisoModulo.findMany(),
            prisma.configuracion.findMany(),
            prisma.ticketPendiente.findMany(),
            prisma.dispositivoRed.findMany(),
            prisma.historialReparacion.findMany(),
            prisma.syncOperation.findMany()
        ]);

        const summary = {
            User: users.length,
            PasswordRecovery: passwordRecoveries.length,
            Mesa: mesas.length,
            Categoria: categorias.length,
            Plato: platos.length,
            Comanda: comandas.length,
            DetalleComanda: detallesComanda.length,
            Arqueo: arqueos.length,
            MovimientoCaja: movimientosCaja.length,
            Insumo: insumos.length,
            RecetaInsumo: recetasInsumo.length,
            MovimientoInsumo: movimientosInsumo.length,
            PedidoCancelado: pedidosCancelados.length,
            PermisoModulo: permisosModulos.length,
            Configuracion: configuraciones.length,
            TicketPendiente: ticketsPendientes.length,
            DispositivoRed: dispositivosRed.length,
            HistorialReparacion: historialReparaciones.length,
            SyncOperation: syncOperations.length
        };

        const backupData = {
            metadata: {
                createdAt: new Date().toISOString(),
                summary
            },
            data: {
                users,
                passwordRecoveries,
                mesas,
                categorias,
                platos,
                comandas,
                detallesComanda,
                arqueos,
                movimientosCaja,
                insumos,
                recetasInsumo,
                movimientosInsumo,
                pedidosCancelados,
                permisosModulos,
                configuraciones,
                ticketsPendientes,
                dispositivosRed,
                historialReparaciones,
                syncOperations
            }
        };

        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');

        console.log(`✅ RESPALDO GENERADO CON ÉXITO:`);
        console.log(`📁 Archivo: ${backupFile}`);
        console.log(`📊 Resumen de registros salvaguardados:`);
        console.table(summary);
        console.log("==========================================");

    } catch (error) {
        console.error("❌ ERROR AL GENERAR EL RESPALDO:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runBackup();

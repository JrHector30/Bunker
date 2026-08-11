const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== INICIANDO PRUEBAS DE RECUPERACIÓN DE CONTRASEÑA ===');

  try {
    // 1. Obtener al usuario admin principal
    const adminUser = await prisma.user.findUnique({
      where: { usuario: 'admin' }
    });

    if (!adminUser) {
      throw new Error('No se encontró al usuario "admin" en la base de datos.');
    }
    console.log(`✅ Usuario admin encontrado: ID ${adminUser.id}, Rol: ${adminUser.rol}`);

    // Limpiar cualquier estado anterior de prueba
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { correo: null }
    });
    await prisma.passwordRecovery.deleteMany({
      where: { userId: adminUser.id }
    });

    // 2. Proteger endpoints de asignación: prueba de 401 si no hay cabecera
    try {
      await axios.post(`${API_URL}/api/users/${adminUser.id}/assign-email/request`, {
        correo: 'admin_test@bunker.com'
      });
      console.error('❌ ERROR: El endpoint de asignación debió rechazar sin cabecera X-Admin-Id');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('✅ OK: Rechazó asignación sin cabecera X-Admin-Id (401)');
      } else {
        console.error('❌ ERROR inesperado sin cabecera:', err.message);
      }
    }

    // 3. Proteger endpoints de asignación: prueba de 403 si el ID no es admin
    try {
      await axios.post(`${API_URL}/api/users/${adminUser.id}/assign-email/request`, {
        correo: 'admin_test@bunker.com'
      }, {
        headers: { 'X-Admin-Id': '1' } // ID de un usuario mozo (Juan Paretto)
      });
      console.error('❌ ERROR: El endpoint debió rechazar la solicitud si el X-Admin-Id no es admin (403)');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ OK: Rechazó asignación con ID no administrador (403)');
      } else {
        console.error('❌ ERROR inesperado con ID mozo:', err.message);
      }
    }

    // 4. Solicitar asignación de correo válida
    const emailToAssign = 'admin_test@bunker.com';
    let res = await axios.post(`${API_URL}/api/users/${adminUser.id}/assign-email/request`, {
      correo: emailToAssign
    }, {
      headers: { 'X-Admin-Id': String(adminUser.id) }
    });
    console.log('✅ OK: Solicitud de asignación de correo enviada:', res.data.message);

    // 5. Interceptar en Base de Datos y simular código '123456'
    const codeToVerify = '123456';
    const fakeCodeHash = bcrypt.hashSync(codeToVerify, 10);
    await prisma.passwordRecovery.update({
      where: { userId: adminUser.id },
      data: { codeHash: fakeCodeHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000) }
    });
    console.log('🔧 Simulación de código inyectada en base de datos.');

    // 6. Verificar código de asignación
    res = await axios.post(`${API_URL}/api/users/${adminUser.id}/assign-email/verify`, {
      correo: emailToAssign,
      code: codeToVerify
    }, {
      headers: { 'X-Admin-Id': String(adminUser.id) }
    });
    console.log('✅ OK: Código de asignación verificado:', res.data.message);

    // Confirmar que el correo se guardó en el usuario
    const updatedAdmin = await prisma.user.findUnique({ where: { id: adminUser.id } });
    if (updatedAdmin.correo === emailToAssign) {
      console.log(`✅ OK: Correo asociado correctamente en User: ${updatedAdmin.correo}`);
    } else {
      console.error('❌ ERROR: El correo no se guardó correctamente');
    }

    // 7. PRUEBA DE LÍMITE DE ENVÍOS (Recuperación)
    console.log('--- Probando límite de envíos de recuperación (bloqueo al 3er envío) ---');
    // Reiniciar contadores para la prueba
    await prisma.passwordRecovery.deleteMany({ where: { userId: adminUser.id } });

    // Intento 1
    res = await axios.post(`${API_URL}/api/auth/recover-password/request`, { usuario: 'admin' });
    console.log('✅ Solicitud 1 enviada.');

    // Intento 2
    res = await axios.post(`${API_URL}/api/auth/recover-password/request`, { usuario: 'admin' });
    console.log('✅ Solicitud 2 enviada.');

    // Intento 3 (Debe retornar éxito pero activar el bloqueo inmediato de 30 minutos)
    res = await axios.post(`${API_URL}/api/auth/recover-password/request`, { usuario: 'admin' });
    console.log('✅ Solicitud 3 enviada (debe activar bloqueo).');

    // Verificar en BD que blockedUntil esté configurado
    const recoveryRecord = await prisma.passwordRecovery.findUnique({ where: { userId: adminUser.id } });
    if (recoveryRecord && recoveryRecord.blockedUntil && recoveryRecord.blockedUntil > new Date()) {
      console.log(`✅ OK: blockedUntil registrado en base de datos: ${recoveryRecord.blockedUntil}`);
    } else {
      console.error('❌ ERROR: blockedUntil no se registró o no es válido');
    }

    // Intento 4 (Debe retornar 429)
    try {
      await axios.post(`${API_URL}/api/auth/recover-password/request`, { usuario: 'admin' });
      console.error('❌ ERROR: El cuarto intento debió ser rechazado por rate limit');
    } catch (err) {
      if (err.response && err.response.status === 429) {
        console.log('✅ OK: Solicitud rechazada por rate limit (429):', err.response.data.error);
      } else {
        console.error('❌ ERROR inesperado en rate limit:', err.message);
      }
    }

    // 8. SIMULAR CÓDIGO DE RECUPERACIÓN Y VERIFICACIÓN
    await prisma.passwordRecovery.update({
      where: { userId: adminUser.id },
      data: {
        codeHash: fakeCodeHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        blockedUntil: null // desbloquear temporalmente para continuar pruebas
      }
    });

    res = await axios.post(`${API_URL}/api/auth/recover-password/verify`, {
      usuario: 'admin',
      code: codeToVerify
    });
    const { resetToken, userId } = res.data;
    console.log('✅ OK: Código de recuperación verificado.');
    console.log(`   resetToken recibido: ${resetToken}`);
    console.log(`   userId recibido: ${userId}`);

    // Verificar en BD que el resetTokenHash se haya persistido
    const checkTokenPersisted = await prisma.passwordRecovery.findUnique({ where: { userId: adminUser.id } });
    if (checkTokenPersisted && checkTokenPersisted.resetTokenHash) {
      console.log('✅ OK: resetTokenHash persistido correctamente en la base de datos.');
    } else {
      console.error('❌ ERROR: resetTokenHash no se persistió en base de datos');
    }

    // 9. RESTABLECER CONTRASEÑA
    const newPassword = '111111';
    res = await axios.post(`${API_URL}/api/auth/recover-password/reset`, {
      userId,
      resetToken,
      newPassword
    });
    console.log('✅ OK: Contraseña restablecida exitosamente:', res.data.message);

    // 10. PROBAR INICIO DE SESIÓN CON LA NUEVA CONTRASEÑA
    res = await axios.post(`${API_URL}/api/login`, {
      usuario: 'admin',
      password: newPassword
    });
    console.log(`✅ OK: Login exitoso con nueva contraseña. Usuario retornado: ${res.data.nombre}`);

    // 11. RESTAURAR DATOS Y LIMPIEZA
    console.log('--- Restaurando contraseña original del administrador ---');
    const originalPasswordHash = bcrypt.hashSync('555555', 10);
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: originalPasswordHash, correo: null }
    });
    await prisma.passwordRecovery.deleteMany({ where: { userId: adminUser.id } });
    console.log('✅ Datos restaurados y limpieza completada.');

    console.log('\n=== ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE! ===');
  } catch (err) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', err.response ? err.response.data : err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();

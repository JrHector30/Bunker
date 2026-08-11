const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000';

async function testRoleEmail() {
  console.log('=== PRUEBA DE PROPAGACIÓN DE CORREO POR ROL (ADMIN) ===');
  try {
    // 1. Obtener admins (Hector y Mel)
    const admin1 = await prisma.user.findUnique({ where: { usuario: 'admin' } }); // Hector
    const admin2 = await prisma.user.findUnique({ where: { usuario: 'mel' } }); // Mel

    if (!admin1 || !admin2) {
      throw new Error('No se encontraron los admins Hector o Mel.');
    }
    console.log(`Admins iniciales: ${admin1.usuario} (ID ${admin1.id}), ${admin2.usuario} (ID ${admin2.id})`);

    // Limpieza inicial
    await prisma.user.updateMany({
      where: { rol: 'admin' },
      data: { correo: null }
    });
    await prisma.passwordRecovery.deleteMany({
      where: { userId: { in: [admin1.id, admin2.id] } }
    });

    // 2. Solicitar asignación para Hector (ID admin1)
    const testEmail = 'jrhector30@gmail.com';
    await axios.post(`${API_URL}/api/users/${admin1.id}/assign-email/request`, {
      correo: testEmail
    }, {
      headers: { 'X-Admin-Id': String(admin1.id) }
    });
    console.log('✅ Solicitud de asignación enviada.');

    // Simular código
    const code = '123456';
    const fakeHash = bcrypt.hashSync(code, 10);
    await prisma.passwordRecovery.update({
      where: { userId: admin1.id },
      data: { codeHash: fakeHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000) }
    });

    // 3. Verificar código para Hector
    await axios.post(`${API_URL}/api/users/${admin1.id}/assign-email/verify`, {
      correo: testEmail,
      code: code
    }, {
      headers: { 'X-Admin-Id': String(admin1.id) }
    });
    console.log('✅ Código verificado.');

    // 4. Comprobar que Hector y Mel tienen el mismo correo
    const check1 = await prisma.user.findUnique({ where: { id: admin1.id } });
    const check2 = await prisma.user.findUnique({ where: { id: admin2.id } });

    console.log(`   Correo de Hector (admin1): ${check1.correo}`);
    console.log(`   Correo de Mel (admin2): ${check2.correo}`);

    if (check1.correo === testEmail && check2.correo === testEmail) {
      console.log('✅ OK: Propagación de correo por ROL exitosa en la asignación.');
    } else {
      console.error('❌ ERROR: Uno de los administradores no tiene el correo compartido.');
    }

    // 5. Crear un nuevo administrador y comprobar si hereda el correo
    console.log('--- Probando herencia de correo al crear nuevo admin ---');
    // Eliminar por si existe de pruebas anteriores
    try {
      await prisma.user.delete({ where: { usuario: 'temp_admin' } });
    } catch(e){}

    const newAdmin = await axios.post(`${API_URL}/api/users`, {
      nombre: 'Admin Temporal',
      usuario: 'temp_admin',
      rol: 'admin',
      password: '111111',
      foto: ''
    });
    console.log('✅ Nuevo admin "temp_admin" creado.');

    const checkNew = await prisma.user.findUnique({ where: { id: newAdmin.data.id } });
    console.log(`   Correo de temp_admin: ${checkNew.correo}`);

    if (checkNew.correo === testEmail) {
      console.log('✅ OK: El nuevo administrador heredó el correo compartido de forma automática.');
    } else {
      console.error('❌ ERROR: El nuevo admin no heredó el correo.');
    }

    // Limpieza final
    await prisma.user.delete({ where: { id: newAdmin.data.id } });
    await prisma.user.updateMany({
      where: { rol: 'admin' },
      data: { correo: null }
    });
    console.log('✅ Limpieza de pruebas completada.');

  } catch (error) {
    console.error('❌ ERROR en la prueba:', error.response ? error.response.data : error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRoleEmail();

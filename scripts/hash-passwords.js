const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando script de hashing de contraseñas con bcryptjs ---');
  try {
    const users = await prisma.user.findMany();
    console.log(`Se encontraron ${users.length} usuarios en total.`);

    let hashedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Un hash de bcrypt típicamente empieza con $2a$, $2b$ o $2y$ y tiene 60 caracteres
      const isAlreadyHashed = user.password && user.password.startsWith('$2') && user.password.length === 60;

      if (isAlreadyHashed) {
        console.log(`Usuario: ${user.usuario} (Rol: ${user.rol}) - OMITIDO (Ya tiene hash de bcrypt)`);
        skippedCount++;
      } else {
        // Hacemos el hash de la contraseña en texto plano (por ejemplo: '555555')
        const plainPassword = user.password || '555555';
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(plainPassword, salt);

        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });

        console.log(`Usuario: ${user.usuario} (Rol: ${user.rol}) - HASHEADO EXITOSAMENTE`);
        hashedCount++;
      }
    }

    console.log('\n--- Resumen del Proceso ---');
    console.log(`Usuarios modificados/hasheados: ${hashedCount}`);
    console.log(`Usuarios omitidos (ya hasheados): ${skippedCount}`);
    console.log('---------------------------');
  } catch (error) {
    console.error('❌ Error durante el proceso de hashing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

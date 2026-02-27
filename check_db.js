const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$connect()
  .then(() => { console.log('DB Connection OK'); process.exit(0); })
  .catch((e) => { console.error('DB Error:', e.message); process.exit(1); });

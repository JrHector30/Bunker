const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Establecer la impresora HP como activa en Configuracion
    await client.query(`
      INSERT INTO "Configuracion" (clave, valor)
      VALUES ('impresora_activa', 'HP DeskJet 1110 series')
      ON CONFLICT (clave) DO UPDATE SET valor = 'HP DeskJet 1110 series'
    `);
    console.log("✅ Impresora activa establecida en 'HP DeskJet 1110 series'");

    // 2. Encolar un ticket de cocina de prueba
    const content = [
      { cantidad: 2, nombre: 'Ceviche de Pescado Súper Especial', observacion: 'Sin picante' },
      { cantidad: 1, nombre: 'Chicha Morada Jarra', observacion: 'Bien helada' }
    ];

    await client.query(`
      INSERT INTO tickets_pendientes (mesa_id, mozo, contenido, impreso, creado_a)
      VALUES ($1, $2, $3, false, NOW())
    `, ['8', 'Administrador Hector', JSON.stringify(content)]);

    console.log("✅ Ticket de cocina de prueba encolado con éxito.");
  } catch (err) {
    console.error("❌ Error en prueba:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();

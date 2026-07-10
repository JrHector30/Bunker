import Dexie from 'dexie';
import { dbSchemaV1, dbSchemaV2, dbSchemaV3, dbSchemaV4 } from './tables';

const db = new Dexie('BunkerOfflineDB');

// Definición de versiones y esquemas para la migración local no destructiva
db.version(1).stores(dbSchemaV1);
db.version(2).stores(dbSchemaV2);
db.version(3)
  .stores(dbSchemaV3)
  .upgrade(async (tx) => {
    // Migración no destructiva: Mapea 'recordingSource' desde el payload interno
    // hacia la propiedad de primer nivel de la tabla syncQueue.
    await tx.syncQueue.toCollection().modify(op => {
      if (op.payload && op.payload.recordingSource) {
        op.recordingSource = op.payload.recordingSource;
      } else {
        op.recordingSource = 'unknown';
      }
    });
  });

db.version(4).stores(dbSchemaV4);

/**
 * Inicializa la base de datos de manera segura y no bloqueante.
 * Si IndexedDB falla, se registra el error en consola y la carga de la aplicación continúa.
 * @returns {Promise<boolean>} Resolves to true if opened successfully, false otherwise.
 */
export const initDatabase = async () => {
  try {
    await db.open();
    console.log('BunkerOfflineDB: Base de datos abierta con éxito (Versión: ' + db.verno + ').');
    return true;
  } catch (error) {
    console.error('BunkerOfflineDB: Error al abrir la base de datos local:', error);
    return false;
  }
};

export default db;

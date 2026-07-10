import db from './database';
import { cleanObjectForStorage } from './offlineUtils';

/**
 * Validates if the table exists in Dexie db.
 * @param {string} tableName 
 * @throws {Error} If table does not exist
 */
const validateTable = (tableName) => {
  if (!db[tableName]) {
    throw new Error(`Table "${tableName}" does not exist in BunkerOfflineDB`);
  }
};

export const offlineService = {
  /**
   * Saves a record (inserts or updates via put).
   * @param {string} tableName 
   * @param {Object} item 
   * @returns {Promise<any>} The primary key of the saved item
   */
  async save(tableName, item) {
    try {
      validateTable(tableName);
      if (!item) {
        throw new Error('Item to save cannot be null or undefined');
      }
      const cleaned = cleanObjectForStorage(item);
      return await db[tableName].put(cleaned);
    } catch (error) {
      console.error(`offlineService.save error on table "${tableName}":`, error);
      throw error;
    }
  },

  /**
   * Updates an existing record.
   * @param {string} tableName 
   * @param {any} id 
   * @param {Object} modifications 
   * @returns {Promise<number>} Number of updated rows (1 or 0)
   */
  async update(tableName, id, modifications) {
    try {
      validateTable(tableName);
      if (id === undefined || id === null) {
        throw new Error('ID is required to update a record');
      }
      const cleaned = cleanObjectForStorage(modifications);
      return await db[tableName].update(id, cleaned);
    } catch (error) {
      console.error(`offlineService.update error on table "${tableName}" with id "${id}":`, error);
      throw error;
    }
  },

  /**
   * Removes a record by ID.
   * @param {string} tableName 
   * @param {any} id 
   * @returns {Promise<void>}
   */
  async remove(tableName, id) {
    try {
      validateTable(tableName);
      if (id === undefined || id === null) {
        throw new Error('ID is required to remove a record');
      }
      return await db[tableName].delete(id);
    } catch (error) {
      console.error(`offlineService.remove error on table "${tableName}" with id "${id}":`, error);
      throw error;
    }
  },

  /**
   * Finds a record by ID.
   * @param {string} tableName 
   * @param {any} id 
   * @returns {Promise<any|undefined>} The record or undefined
   */
  async findById(tableName, id) {
    try {
      validateTable(tableName);
      if (id === undefined || id === null) {
        throw new Error('ID is required to find a record');
      }
      return await db[tableName].get(id);
    } catch (error) {
      console.error(`offlineService.findById error on table "${tableName}" with id "${id}":`, error);
      throw error;
    }
  },

  /**
   * Finds all records in a table, optionally matching a filter function.
   * @param {string} tableName 
   * @param {Function} [filterFn] Optional filter callback 
   * @returns {Promise<any[]>} Array of records
   */
  async findAll(tableName, filterFn) {
    try {
      validateTable(tableName);
      if (filterFn) {
        return await db[tableName].filter(filterFn).toArray();
      }
      return await db[tableName].toArray();
    } catch (error) {
      console.error(`offlineService.findAll error on table "${tableName}":`, error);
      throw error;
    }
  },

  /**
   * Clears a table (or all tables if no tableName is passed).
   * @param {string} [tableName] Optional table name.
   * @returns {Promise<void|void[]>}
   */
  async clear(tableName) {
    try {
      if (tableName) {
        validateTable(tableName);
        return await db[tableName].clear();
      } else {
        const promises = db.tables.map(table => table.clear());
        return await Promise.all(promises);
      }
    } catch (error) {
      console.error(`offlineService.clear error on table "${tableName || 'ALL'}":`, error);
      throw error;
    }
  },

  /**
   * Counts the number of records in a table.
   * @param {string} tableName 
   * @returns {Promise<number>} Number of records
   */
  async count(tableName) {
    try {
      validateTable(tableName);
      return await db[tableName].count();
    } catch (error) {
      console.error(`offlineService.count error on table "${tableName}":`, error);
      throw error;
    }
  }
};

const path = require('path');
const fs = require('fs');

// Load environment variables: check local printer-server/.env first, fall back to parent project's .env
const localEnv = path.join(__dirname, '.env');
const parentEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv });
} else {
  require('dotenv').config({ path: parentEnv });
}

const { Pool } = require('pg');
const { exec } = require('child_process');
const net = require('net');
const os = require('os');

const STATION_ID = process.env.STATION_ID || 'Caja';

// Prevenir múltiples instancias de la misma estación en segundo plano utilizando un puerto de bloqueo dinámico
const getLockPort = (station) => {
  let hash = 0;
  for (let i = 0; i < station.length; i++) {
    hash += station.charCodeAt(i);
  }
  return 19900 + (hash % 99);
};
const LOCK_PORT = getLockPort(STATION_ID);
const lockServer = net.createServer();
lockServer.listen(LOCK_PORT, '127.0.0.1');
lockServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    process.exit(0); // Ya está corriendo una instancia de esta estación, salir silenciosamente
  }
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ Error: DATABASE_URL no está definido en el archivo .env del proyecto principal.");
  process.exit(1);
}

// Inicializar Pool de conexiones a PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false // Requerido para conexiones externas de Supabase
  }
});

// --- Auto-Registro de la Estación de Impresión ---
async function registerStation() {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(`SELECT valor FROM "Configuracion" WHERE clave = 'estaciones_impresion'`);
    let list = [];
    if (res.rows.length > 0) {
      list = JSON.parse(res.rows[0].valor);
    }
    if (!list.includes(STATION_ID)) {
      list.push(STATION_ID);
      const jsonList = JSON.stringify(list);
      await client.query(`
        INSERT INTO "Configuracion" (clave, valor)
        VALUES ('estaciones_impresion', $1)
        ON CONFLICT (clave) DO UPDATE SET valor = $1
      `, [jsonList]);
      console.log(`📡 Estación "${STATION_ID}" registrada automáticamente en la base de datos.`);
    }
  } catch (err) {
    console.error("❌ Error de conexión al auto-registrar la estación (verifique su conexión a internet):", err.message);
  } finally {
    if (client) client.release();
  }
}
registerStation();

const processedTickets = new Set();
let isProcessing = false;
let scanInProgress = false;
let recoveryInProgress = false;

// Helper to manage concurrency locks with automatic 15-second timeout release
const acquireLockWithTimeout = (lockName, duration = 15000) => {
  if (lockName === 'scan') {
    if (scanInProgress) return false;
    scanInProgress = true;
    setTimeout(() => {
      if (scanInProgress) {
        console.warn("⚠️  [LockTimeout] Smart Scan superó los 15s. Liberando bloqueo automáticamente.");
        scanInProgress = false;
      }
    }, duration);
    return true;
  }
  if (lockName === 'recovery') {
    if (recoveryInProgress) return false;
    recoveryInProgress = true;
    setTimeout(() => {
      if (recoveryInProgress) {
        console.warn("⚠️  [LockTimeout] Auto Recovery superó los 15s. Liberando bloqueo automáticamente.");
        recoveryInProgress = false;
      }
    }, duration);
    return true;
  }
  return false;
};

console.log("=================================================");
console.log("🚀 Servidor de Impresión Local de Búnker Iniciado");
console.log(`🖥️  Estación Activa: "${STATION_ID}"`);
console.log(`📡 Base de Datos: Conexión Exitosa`);
console.log("=================================================\n");

// --- 1. Utilidad: Escanear Impresoras de Windows con PowerShell ---
function getWindowsPrinters() {
  return new Promise((resolve) => {
    const command = 'powershell -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object Name, WorkOffline | ConvertTo-Json -Compress"';
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Error al escanear impresoras con PowerShell:", error);
        return resolve([]);
      }

      try {
        const raw = stdout.trim();
        if (!raw) return resolve([]);

        let parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          parsed = [parsed];
        }

        const list = parsed.map(item => ({
          name: item.Name || '',
          offline: item.WorkOffline === true
        }));

        resolve(list);
      } catch (err) {
        console.error("❌ Error al parsear JSON de impresoras:", err);
        resolve([]);
      }
    });
  });
}

// --- 2. Rutina: Procesar Escaneo Remoto solicitado desde el Móvil/Web ---
async function handlePrinterScanRequests() {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(`SELECT valor FROM "Configuracion" WHERE clave = 'solicitar_actualizacion_impresoras'`);
    const shouldScan = res.rows[0]?.valor === STATION_ID;

    if (shouldScan) {
      // Intentar adquirir el bloqueo
      const acquired = acquireLockWithTimeout('scan');
      if (!acquired) {
        console.log("⚠️  [SmartScan] Diagnóstico ya en progreso. Ignorando solicitud duplicada.");
        // Apagar la bandera de solicitud de inmediato para no quedar en bucle
        await client.query(`
          INSERT INTO "Configuracion" (clave, valor)
          VALUES ('solicitar_actualizacion_impresoras', 'false')
          ON CONFLICT (clave) DO UPDATE SET valor = 'false'
        `);
        return;
      }

      try {
        console.log(`🔍 Solicitud de escaneo de impresoras detectada para esta estación (${STATION_ID}).`);
        
        // Escaneo concurrente de Windows y Smart Scan de Red
        const [printersList, ethernetList] = await Promise.all([
          getWindowsPrinters(),
          smartScanNetwork()
        ]);

        console.log(`🖨️  Impresoras Windows encontradas: [${printersList.map(p => `${p.name} (${p.offline ? 'Sin conexión' : 'En línea'})`).join(', ')}]`);
        console.log(`📡 Dispositivos Ethernet descubiertos en la subred: [${ethernetList.map(d => `${d.ip} (${d.mac})`).join(', ')}]`);

        const jsonList = JSON.stringify(printersList);
        const jsonEthernet = JSON.stringify(ethernetList);

        // Guardar impresoras disponibles para ESTA estación
        await client.query(`
          INSERT INTO "Configuracion" (clave, valor)
          VALUES ($1, $2)
          ON CONFLICT (clave) DO UPDATE SET valor = $2
        `, [`impresoras_disponibles_${STATION_ID}`, jsonList]);

        // Guardar dispositivos de red descubiertos
        await client.query(`
          INSERT INTO "Configuracion" (clave, valor)
          VALUES ($1, $2)
          ON CONFLICT (clave) DO UPDATE SET valor = $2
        `, [`impresoras_descubiertas_${STATION_ID}`, jsonEthernet]);

        // Actualizar dinámicamente el estado y la IP de impresoras vinculadas con los resultados del smart scan
        const dbDevsRes = await client.query(
          `SELECT * FROM dispositivos_red WHERE estacion = $1`,
          [STATION_ID]
        );
        const dbDevices = dbDevsRes.rows;

        for (const dev of dbDevices) {
          if (dev.transport === 'TCP9100') {
            // No interrumpir si está en proceso de recuperación activa
            if (dev.ultimo_estado === 'RECOVERING') continue;

            const matchByMac = dev.mac ? ethernetList.find(e => e.mac === dev.mac) : null;
            if (matchByMac) {
              await client.query(
                `UPDATE dispositivos_red 
                 SET ultimo_estado = 'ONLINE', ultima_ip = $1, ultima_respuesta_ms = $2, ultimo_diag = NOW() 
                 WHERE id = $3`,
                [matchByMac.ip, matchByMac.latency, dev.id]
              );
            } else {
              const isAlive = await checkPort9100(dev.ultima_ip);
              const nextState = isAlive ? 'ONLINE' : 'OFFLINE';
              await client.query(
                `UPDATE dispositivos_red 
                 SET ultimo_estado = $1, ultimo_diag = NOW() 
                 WHERE id = $2`,
                [nextState, dev.id]
              );
            }
          }
        }

        // Apagar la bandera de solicitud
        await client.query(`
          INSERT INTO "Configuracion" (clave, valor)
          VALUES ('solicitar_actualizacion_impresoras', 'false')
          ON CONFLICT (clave) DO UPDATE SET valor = 'false'
        `);

        console.log(`✅ Lista de impresoras y dispositivos Ethernet de la estación "${STATION_ID}" sincronizada.`);
      } finally {
        // Liberar el bloqueo bajo cualquier circunstancia
        scanInProgress = false;
      }
    }
  } catch (err) {
    console.error("❌ Error al procesar solicitud de escaneo de impresoras:", err.message);
  } finally {
    if (client) client.release();
  }
}

// --- 3. Formateadores de Tickets (Texto Plano Monoespacio) ---
function formatTicket(ticket, lineWidth) {
  const type = ticket.contenido?.type;
  if (type === 'arqueo') {
    return formatArqueo(ticket, lineWidth);
  } else if (type === 'precuenta') {
    return formatPrecuenta(ticket, lineWidth);
  } else {
    return formatComanda(ticket, lineWidth);
  }
}

function formatComanda(ticket, lineWidth) {
  const dateStr = new Date(ticket.creado_a).toLocaleString('es-PE');
  const separatorDouble = "=".repeat(lineWidth) + "\n";
  const separatorSingle = "-".repeat(lineWidth) + "\n";
  const center = (str) => {
    const pad = Math.max(0, Math.floor((lineWidth - str.length) / 2));
    return " ".repeat(pad) + str + "\n";
  };

  let text = "";
  text += separatorDouble;
  text += center("BUNKER RESTOBAR");
  text += center("TICKET DE COCINA");
  text += separatorDouble;
  text += `FECHA: ${dateStr}\n`;
  text += `MESA:  MESA ${ticket.mesa_id}\n`;
  text += `MOZO:  ${ticket.mozo.toUpperCase()}\n`;
  text += separatorSingle;
  text += "CAN  PRODUCTO / OBSERVACIONES\n";
  text += separatorSingle;

  const items = Array.isArray(ticket.contenido) ? ticket.contenido : (ticket.contenido.items || []);
  items.forEach(item => {
    const qty = String(item.cantidad).padEnd(4, ' ');
    text += `${qty}${item.nombre.toUpperCase()}\n`;
    if (item.observacion && item.observacion.trim() !== '') {
      text += `    * OBS: ${item.observacion.toUpperCase()}\n`;
    }
  });

  text += separatorSingle;
  text += "\n\n\n\n\n\n\n\n"; // Avance de papel
  return text;
}

function formatPrecuenta(ticket, lineWidth) {
  const dateStr = new Date(ticket.creado_a).toLocaleString('es-PE');
  const separatorDouble = "=".repeat(lineWidth) + "\n";
  const separatorSingle = "-".repeat(lineWidth) + "\n";
  const center = (str) => {
    const pad = Math.max(0, Math.floor((lineWidth - str.length) / 2));
    return " ".repeat(pad) + str + "\n";
  };
  const alignLR = (left, right) => {
    const pad = lineWidth - left.length - right.length;
    return left + " ".repeat(Math.max(1, pad)) + right + "\n";
  };

  let text = "";
  text += separatorDouble;
  text += center("BUNKER RESTOBAR");
  text += center("PRECUENTA");
  text += separatorDouble;
  text += `FECHA: ${dateStr}\n`;
  text += `MESA:  MESA ${ticket.mesa_id}\n`;
  text += `MOZO:  ${ticket.mozo.toUpperCase()}\n`;
  text += separatorSingle;
  text += alignLR("CAN  PRODUCTO", "TOTAL");
  text += separatorSingle;

  const items = ticket.contenido.items || [];
  items.forEach(item => {
    const qty = String(item.cantidad).padEnd(4, ' ');
    const totalVal = `S/ ${(item.precio * item.cantidad).toFixed(2)}`;
    // Dynamic padding: qty takes 4 chars, totalVal takes its length. Product name takes the rest.
    const nameWidth = lineWidth - 4 - totalVal.length - 1;
    const name = item.nombre.substring(0, nameWidth).toUpperCase().padEnd(nameWidth, ' ');
    text += `${qty}${name} ${totalVal}\n`;
  });

  text += separatorSingle;
  const totalStr = `S/ ${Number(ticket.contenido.total || 0).toFixed(2)}`;
  text += alignLR("TOTAL:", totalStr);

  if (ticket.contenido.totalLetras) {
    text += `(${ticket.contenido.totalLetras.toUpperCase()})\n`;
  }
  text += separatorSingle;
  text += center("NO POSEE VALIDEZ FISCAL.");
  text += center("¡MUCHAS GRACIAS POR SU PREFERENCIA!");
  text += separatorDouble;
  text += "\n\n\n\n\n\n\n\n"; // Avance de papel
  return text;
}

function formatArqueo(ticket, lineWidth) {
  const dateStr = new Date(ticket.creado_a).toLocaleString('es-PE');
  const data = ticket.contenido;
  const separatorDouble = "=".repeat(lineWidth) + "\n";
  const separatorSingle = "-".repeat(lineWidth) + "\n";
  const center = (str) => {
    const pad = Math.max(0, Math.floor((lineWidth - str.length) / 2));
    return " ".repeat(pad) + str + "\n";
  };
  const alignLR = (left, right) => {
    const pad = lineWidth - left.length - right.length;
    return left + " ".repeat(Math.max(1, pad)) + right + "\n";
  };

  let text = "";
  text += separatorDouble;
  text += center("BUNKER RESTOBAR");
  text += center("RESUMEN DE CAJA");
  text += separatorDouble;
  text += `FECHA IMP: ${dateStr}\n`;
  text += `TURNO N°:  ${data.id}\n`;
  text += `ESTADO:    ${data.estado.toUpperCase()}\n`;
  text += `INICIO:    ${new Date(data.fechaInicio).toLocaleString('es-PE')}\n`;
  if (data.fechaFin) {
    text += `CIERRE:    ${new Date(data.fechaFin).toLocaleString('es-PE')}\n`;
  }
  text += alignLR("M. INICIAL:", `S/. ${(data.montoInicial || 0).toFixed(2)}`);
  text += separatorSingle;
  text += "DESGLOSE DE INGRESOS:\n";
  text += alignLR("  EFECTIVO:", `S/. ${(data.ingresos?.efectivo || 0).toFixed(2)}`);
  text += alignLR("  TARJETA (POS):", `S/. ${(data.ingresos?.tarjeta || 0).toFixed(2)}`);
  text += alignLR("  YAPE:", `S/. ${(data.ingresos?.yape || 0).toFixed(2)}`);
  text += alignLR("  PLIN:", `S/. ${(data.ingresos?.plin || 0).toFixed(2)}`);
  text += alignLR("  IZIPAY:", `S/. ${(data.ingresos?.izipay || 0).toFixed(2)}`);
  text += alignLR("  NIUBIZ:", `S/. ${(data.ingresos?.niubiz || 0).toFixed(2)}`);
  text += alignLR("  MANUALES:", `S/. ${(data.ingresos?.manual || 0).toFixed(2)}`);
  text += separatorSingle;

  const getVentasTotal = () => {
    return (
      (data.ingresos?.efectivo || 0) +
      (data.ingresos?.tarjeta || 0) +
      (data.ingresos?.yape || 0) +
      (data.ingresos?.plin || 0) +
      (data.ingresos?.izipay || 0) +
      (data.ingresos?.niubiz || 0)
    );
  };
  text += alignLR("TOTAL VENTAS:", `S/. ${getVentasTotal().toFixed(2)}`);
  text += separatorSingle;
  text += "RESUMEN EFECTIVO NETO:\n";
  text += alignLR("  INGRESO TOTAL:", `S/. ${((data.ingresos?.efectivo || 0) + (data.ingresos?.manual || 0)).toFixed(2)}`);
  text += alignLR("  EGRESO TOTAL:", `S/. ${(data.egresos || 0).toFixed(2)}`);
  text += alignLR("  NETO EN CAJA:", `S/. ${(data.totalCaja || 0).toFixed(2)}`);
  text += separatorSingle;
  text += center("NO POSEE VALIDEZ FISCAL.");
  text += separatorDouble;
  text += "\n\n\n\n\n\n\n\n"; // Avance de papel
  return text;
}

// --- 4. Perfiles de Impresora y Enviar Ticket al Spooler de Windows ---
const PRINTER_PROFILES = {
  SPRT: {
    codepage: 850,
    initCmd: "27,64",           // ESC @
    charTableCmd: "27,116,2",    // ESC t 2
    cutCmd: "29,86,66,0",        // GS V 66 0
    drawerCmd: "27,112,0,25,250" // ESC p 0 25 250
  },
  Epson: {
    codepage: 850,
    initCmd: "27,64",
    charTableCmd: "27,116,2",
    cutCmd: "29,86,66,0",
    drawerCmd: "27,112,0,25,250"
  },
  Xprinter: {
    codepage: 850,
    initCmd: "27,64",
    charTableCmd: "27,116,2",
    cutCmd: "29,86,66,0",
    drawerCmd: "27,112,0,25,250"
  },
  Rongta: {
    codepage: 850,
    initCmd: "27,64",
    charTableCmd: "27,116,2",
    cutCmd: "29,86,66,0",
    drawerCmd: "27,112,0,25,250"
  },
  Generic: {
    codepage: 850,
    initCmd: "27,64",
    charTableCmd: "27,116,2",
    cutCmd: "29,86,66,0",
    drawerCmd: "27,112,0,25,250"
  }
};

async function printTicketText(ticketText, ticketId, printerName, paperSize = '80mm') {
  let profileName = 'Generic';
  let transport = 'USB';
  let ipAddress = '';

  try {
    const res = await pool.query(
      `SELECT * FROM dispositivos_red WHERE nombre = $1 AND estacion = $2 LIMIT 1`,
      [printerName, STATION_ID]
    );
    if (res.rows.length > 0) {
      const device = res.rows[0];
      profileName = device.perfil || 'Generic';
      transport = device.transport || 'USB';
      ipAddress = device.ultima_ip || '';
    } else {
      // Fallback legacy
      const legacyRes = await pool.query(
        `SELECT valor FROM "Configuracion" WHERE clave = $1`,
        [`impresora_perfiles_${STATION_ID}`]
      );
      if (legacyRes.rows.length > 0) {
        const map = JSON.parse(legacyRes.rows[0].valor);
        profileName = map[printerName] || 'Generic';
      }
    }
  } catch (err) {
    console.error("⚠️ Error al obtener datos del dispositivo para imprimir, usando Genérico/USB:", err.message);
  }

  const profile = PRINTER_PROFILES[profileName] || PRINTER_PROFILES.Generic;

  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `ticket_${ticketId}.txt`);

    // Escribir codificación limpia
    fs.writeFileSync(tempFilePath, ticketText, 'utf8');

    const scriptPath = path.join(__dirname, 'print_escpos.ps1');

    const command = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" ` +
      `-printerName "${printerName}" ` +
      `-filePath "${tempFilePath}" ` +
      `-codepage ${profile.codepage} ` +
      `-initCmd "${profile.initCmd}" ` +
      `-charTableCmd "${profile.charTableCmd}" ` +
      `-cutCmd "${profile.cutCmd}" ` +
      `-transport "${transport}" ` +
      `-ipAddress "${ipAddress}"`;

    exec(command, (error, stdout, stderr) => {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) { }

      if (error) {
        console.error(`❌ Error al imprimir "${printerName}" (${transport}):`, error);
        return reject(error);
      }
      console.log(`🖨️  Ticket #${ticketId} enviado con éxito a "${printerName}" usando transporte ${transport} y perfil ${profileName}.`);
      resolve();
    });
  });
}

// --- 5. Bucle de Impresión (Resiliente e Idempotente) ---
async function checkAndPrintQueue() {
  if (isProcessing) return;
  isProcessing = true;

  let client;
  try {
    client = await pool.connect();
    // 1. Obtener la impresora activa de la base de datos (con fallback heredado)
    let activeDevice = null;
    const activeDevRes = await client.query(
      `SELECT * FROM dispositivos_red WHERE estacion = $1 AND activo = true LIMIT 1`,
      [STATION_ID]
    );

    if (activeDevRes.rows.length > 0) {
      activeDevice = activeDevRes.rows[0];
    } else {
      // Fallback heredado
      const legacyConfRes = await client.query(
        `SELECT valor FROM "Configuracion" WHERE clave = $1`,
        [`impresora_activa_${STATION_ID}`]
      );
      const legacyName = legacyConfRes.rows[0]?.valor;
      if (legacyName) {
        // Buscar medida heredada
        const medidasRes = await client.query(
          `SELECT valor FROM "Configuracion" WHERE clave = $1`,
          [`impresora_medidas_${STATION_ID}`]
        );
        const medidasMap = medidasRes.rows[0]?.valor ? JSON.parse(medidasRes.rows[0].valor) : {};
        activeDevice = {
          nombre: legacyName,
          medida: medidasMap[legacyName] || '80mm',
          perfil: 'Generic',
          transport: 'USB'
        };
      }
    }

    if (!activeDevice) {
      // Si no hay impresora activa, no hacemos nada
      isProcessing = false;
      return;
    }

    const printerName = activeDevice.nombre;
    const paperSize = activeDevice.medida || '80mm';

    // Determinar ancho de línea en caracteres monoespacio
    let lineWidth = 42; // por defecto 80mm
    if (paperSize === '58mm') {
      lineWidth = 32;
    } else if (paperSize === '50mm') {
      lineWidth = 28;
    }

    // 2. Obtener tickets pendientes asignados a esta estación ordenados cronológicamente
    const queueRes = await client.query(
      `SELECT * FROM tickets_pendientes WHERE impreso = false AND (estacion = $1 OR (estacion IS NULL AND $1 = 'Caja')) ORDER BY creado_a ASC`,
      [STATION_ID]
    );
    const tickets = queueRes.rows;

    for (const ticket of tickets) {
      if (processedTickets.has(ticket.id)) {
        continue;
      }
      processedTickets.add(ticket.id);

      try {
        // Bloqueo atómico a nivel de Base de Datos para evitar doble procesamiento
        const lockRes = await client.query(
          `UPDATE tickets_pendientes SET impreso = true WHERE id = $1 AND impreso = false RETURNING *`,
          [ticket.id]
        );

        if (lockRes.rows.length === 0) {
          // Otro hilo o proceso ganó la carrera
          continue;
        }

        // Ganamos el bloqueo, procedemos a imprimir físicamente
        console.log(`⏳ Imprimiendo Ticket #${ticket.id} en "${printerName}" (${paperSize}) (Estación: ${STATION_ID})...`);
        const formattedText = formatTicket(lockRes.rows[0], lineWidth);
        await printTicketText(formattedText, ticket.id, printerName, paperSize);
        console.log(`✅ Ticket #${ticket.id} impreso con éxito.`);
      } catch (err) {
        console.error(`❌ Falló la impresión física del Ticket #${ticket.id}:`, err.message);
        processedTickets.delete(ticket.id); // Permitir reintento local posterior
      }
    }
  } catch (err) {
    console.error("❌ Error de red en bucle de cola de impresión (reintentando en 2s):", err.message);
  } finally {
    if (client) client.release();
    isProcessing = false;
  }
}

// --- 6. Inicializar Bucles de Vigilancia ---
// Cada 2 segundos vigilar la cola de tickets
setInterval(checkAndPrintQueue, 2000);

// Cada 3 segundos vigilar si hay solicitudes de escaneo de impresoras
setInterval(handlePrinterScanRequests, 3000);

// Cada 2 segundos reportar latido de vida de la estación
setInterval(writeStationHeartbeat, 2000);

// Cada 3 segundos comprobar solicitudes de Auto Recovery
setInterval(handleAutoRecoveryRequests, 3000);

// Cada 10 segundos diagnosticar de forma periódica las impresoras de red vinculadas
setInterval(runPeriodicHealthCheck, 10000);

// Ejecutar barridos y latido inmediato al arrancar
checkAndPrintQueue();
handlePrinterScanRequests();
writeStationHeartbeat();
handleAutoRecoveryRequests();
runPeriodicHealthCheck();


// --- 7. Búnker Auto Recovery & Network Helpers ---

// Bucle de Latido (Heartbeat) de la Estación
async function writeStationHeartbeat() {
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      INSERT INTO "Configuracion" (clave, valor)
      VALUES ($1, $2)
      ON CONFLICT (clave) DO UPDATE SET valor = $2
    `, [`estacion_latido_${STATION_ID}`, Date.now().toString()]);
  } catch (err) {
    // Silencioso para no saturar consola
  } finally {
    if (client) client.release();
  }
}

// Obtener rango de IPs de la subred local actual
function getSubnetRange() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address;
        const netmask = iface.netmask;
        
        const ipParts = ip.split('.').map(Number);
        const maskParts = netmask.split('.').map(Number);
        
        const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
        const maskInt = (maskParts[0] << 24) | (maskParts[1] << 16) | (maskParts[2] << 8) | maskParts[3];
        
        const networkInt = ipInt & maskInt;
        const broadcastInt = networkInt | ~maskInt;
        
        const ipRange = [];
        // Si la máscara es muy grande (ej. Clase A/B), limitamos a /24 para velocidad
        if ((maskInt >>> 0) < 0xffffff00) {
          const prefix = ipParts.slice(0, 3).join('.');
          for (let i = 1; i <= 254; i++) {
            if (`${prefix}.${i}` !== ip) {
              ipRange.push(`${prefix}.${i}`);
            }
          }
        } else {
          const firstHost = (networkInt + 1) >>> 0;
          const lastHost = (broadcastInt - 1) >>> 0;
          for (let host = firstHost; host <= lastHost; host++) {
            const parts = [
              (host >>> 24) & 255,
              (host >>> 16) & 255,
              (host >>> 8) & 255,
              host & 255
            ];
            const ipStr = parts.join('.');
            if (ipStr !== ip) {
              ipRange.push(ipStr);
            }
          }
        }
        return ipRange;
      }
    }
  }
  return [];
}

// Verificar conexión TCP en puerto 9100 con 1.5s timeout garantizado (evita bloqueos de OS)
function checkPort9100(ip) {
  return new Promise((resolve) => {
    if (!ip) return resolve(null);
    const startTime = Date.now();
    const socket = new net.Socket();
    
    // Garantía manual de timeout de conexión a nivel de socket
    const connTimeout = setTimeout(() => {
      socket.destroy();
      resolve(null);
    }, 1500);
    
    try {
      socket.connect(9100, ip, () => {
        clearTimeout(connTimeout);
        const timeMs = Date.now() - startTime;
        socket.destroy();
        resolve({ ip, timeMs });
      });
      
      socket.on('error', () => {
        clearTimeout(connTimeout);
        socket.destroy();
        resolve(null);
      });
      
      socket.on('timeout', () => {
        clearTimeout(connTimeout);
        socket.destroy();
        resolve(null);
      });
    } catch (e) {
      clearTimeout(connTimeout);
      socket.destroy();
      resolve(null);
    }
  });
}

// Resolver dirección MAC vía ARP (con ping previo) o fallback a Get-NetNeighbor
function getMacAddress(ip) {
  return new Promise((resolve) => {
    exec(`ping -n 1 -w 200 ${ip}`, (pingErr) => {
      exec(`arp -a ${ip}`, (arpErr, stdout) => {
        if (arpErr || !stdout) {
          // Fallback a powershell
          exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetNeighbor -IPAddress ${ip} | Select-Object -ExpandProperty LinkLayerAddress"`, (psErr, psStdout) => {
            if (psErr || !psStdout) return resolve(null);
            const mac = psStdout.trim().replace(/-/g, ':').toLowerCase();
            if (mac && mac.length >= 17) return resolve(mac);
            resolve(null);
          });
          return;
        }
        const macRegex = /([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})/;
        const match = stdout.match(macRegex);
        if (match) {
          const mac = match[0].replace(/-/g, ':').toLowerCase();
          resolve(mac);
        } else {
          resolve(null);
        }
      });
    });
  });
}

// Smart Scan de Red concurrente
async function smartScanNetwork() {
  const ipRange = getSubnetRange();
  if (ipRange.length === 0) return [];
  
  const foundDevices = [];
  const CONCURRENCY = 50;
  let currentIndex = 0;
  
  async function worker() {
    while (currentIndex < ipRange.length) {
      const ip = ipRange[currentIndex++];
      const connectRes = await checkPort9100(ip);
      if (connectRes) {
        const mac = await getMacAddress(ip);
        if (mac) {
          foundDevices.push({
            ip,
            mac,
            latency: connectRes.timeMs
          });
        }
      }
    }
  }
  
  const workers = Array(CONCURRENCY).fill(null).map(() => worker());
  await Promise.allSettled(workers);
  return foundDevices;
}

// Verificación E2E de impresión en impresora Ethernet
function verifyEthernetPrinter(ip) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.connect(9100, ip, () => {
      // Escribir comandos de prueba de diagnóstico ESC/POS (Reset + Mensaje + Avance + Corte)
      const testBuffer = Buffer.from('\x1B\x40Bunker Auto Recovery\nDiagnostico completado correctamente\n\n\n\x1D\x56\x42\x00', 'ascii');
      socket.write(testBuffer, () => {
        socket.destroy();
        resolve(true);
      });
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

// Proceso asíncrono de Auto Recovery
async function runAutoRecovery(deviceId) {
  const acquired = acquireLockWithTimeout('recovery');
  if (!acquired) {
    console.log("⚠️  [AutoRecovery] Reparación ya en progreso. Ignorando solicitud duplicada.");
    return;
  }

  const startTime = Date.now();
  let client;
  try {
    client = await pool.connect();
    
    // 1. Obtener datos actuales del dispositivo
    const devRes = await client.query(`SELECT * FROM dispositivos_red WHERE id = $1`, [deviceId]);
    if (devRes.rows.length === 0) return;
    const device = devRes.rows[0];
    
    console.log(`🔧 [AutoRecovery] Iniciando recuperación de "${device.nombre}" (MAC: ${device.mac})...`);
    
    // Poner estado en RECOVERING
    await client.query(`UPDATE dispositivos_red SET ultimo_estado = 'RECOVERING' WHERE id = $1`, [deviceId]);
    
    // 2. Ejecutar Smart Scan
    const scanResults = await smartScanNetwork();
    const match = scanResults.find(d => d.mac === device.mac);
    
    if (match) {
      const elapsedMs = Date.now() - startTime;
      console.log(`✅ [AutoRecovery] Impresora encontrada en la nueva IP: ${match.ip} en ${elapsedMs}ms.`);
      
      // 3. Verificación física E2E (Configurable)
      let isOperational = true;
      const diagConfigRes = await client.query(`SELECT valor FROM "Configuracion" WHERE clave = 'imprimir_ticket_auditoria_recovery'`);
      const shouldPrint = diagConfigRes.rows[0]?.valor === 'true';
      
      if (shouldPrint) {
        // Enviar ticket de diagnóstico por hardware
        isOperational = await verifyEthernetPrinter(match.ip);
      } else {
        // Validación TCP simple
        const connCheck = await checkPort9100(match.ip);
        isOperational = connCheck !== null;
      }
      
      const finalState = isOperational ? 'ONLINE' : 'ERROR';
      
      // 4. Actualizar IP, estado y latencia
      await client.query(`
        UPDATE dispositivos_red 
        SET ultima_ip = $1, ultimo_estado = $2, ultima_respuesta_ms = $3, ultimo_diag = NOW(), ultima_reparacion = NOW()
        WHERE id = $4
      `, [match.ip, finalState, match.latency || 0, deviceId]);
      
      // 5. Guardar en Historial de Reparaciones
      const { randomUUID } = require('crypto');
      const histId = randomUUID();
      await client.query(`
        INSERT INTO historial_reparaciones (id, dispositivo_id, estacion, ip_anterior, nueva_ip, tiempo_ms, motivo, creado_a)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [histId, device.id, STATION_ID, device.ultima_ip || 'Desconocida', match.ip, elapsedMs, "IP no respondía (Auto Recovery)"]);
      
      // 6. Si se requería imprimir e imprimir ticket completo de auditoría
      if (shouldPrint && isOperational) {
        const formattedDate = new Date().toLocaleString('es-PE');
        const auditText = 
          "================================\n" +
          "BUNKER AUTO RECOVERY\n" +
          "Diagnostico Finalizado\n\n" +
          `Estacion:     ${STATION_ID}\n` +
          `Dispositivo:  ${device.nombre}\n` +
          "Resultado:    Conectada Correctamente\n\n" +
          `IP Anterior:  ${device.ultima_ip || 'Ninguna'}\n` +
          `Nueva IP:     ${match.ip}\n` +
          `Tiempo Recup: ${elapsedMs} ms\n` +
          `Fecha:        ${formattedDate}\n` +
          "================================\n\n\n\n\x1D\x56\x42\x00";
        
        await printTicketText(auditText, 'recovery_' + Date.now(), device.nombre);
      }
    } else {
      console.log(`❌ [AutoRecovery] No se encontró ningún dispositivo con la MAC ${device.mac} en la subred.`);
      await client.query(`UPDATE dispositivos_red SET ultimo_estado = 'OFFLINE', ultimo_diag = NOW() WHERE id = $1`, [deviceId]);
    }
  } catch (err) {
    console.error("❌ Error en el proceso de Auto Recovery:", err.message);
  } finally {
    // Liberar el bloqueo bajo cualquier circunstancia
    recoveryInProgress = false;
    if (client) client.release();
  }
}

// Bucle de solicitudes de Auto Recovery
async function handleAutoRecoveryRequests() {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(`SELECT valor FROM "Configuracion" WHERE clave = 'solicitar_recovery_estacion'`);
    if (res.rows.length === 0) return;
    
    const val = res.rows[0].valor;
    if (val === 'false' || val === 'true') return;
    
    const request = JSON.parse(val);
    if (request && request.estacion === STATION_ID) {
      console.log(`📡 Solicitud de Auto Recovery detectada para esta estación (${STATION_ID}).`);
      
      // Desactivar el flag
      await client.query(`
        INSERT INTO "Configuracion" (clave, valor)
        VALUES ('solicitar_recovery_estacion', 'false')
        ON CONFLICT (clave) DO UPDATE SET valor = 'false'
      `);
      
      // Lanzar recuperación de forma asíncrona
      runAutoRecovery(request.deviceId);
    }
  } catch (err) {
    console.error("❌ Error al comprobar solicitudes de auto recovery:", err.message);
  } finally {
    if (client) client.release();
  }
}

// Bucle de diagnóstico periódico de dispositivos vinculados (cada 10 segundos)
async function runPeriodicHealthCheck() {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(
      `SELECT * FROM dispositivos_red WHERE estacion = $1 AND transport = 'TCP9100'`,
      [STATION_ID]
    );
    const devices = res.rows;
    for (const dev of devices) {
      if (dev.ultimo_estado === 'RECOVERING') continue; // No interrumpir si está recuperándose

      const isAlive = await checkPort9100(dev.ultima_ip);
      const nextState = isAlive ? 'ONLINE' : 'OFFLINE';

      if (dev.ultimo_estado !== nextState) {
        console.log(`📡 [HealthCheck] Dispositivo ${dev.nombre} en ${dev.ultima_ip} cambió de estado a ${nextState}.`);
        await client.query(
          `UPDATE dispositivos_red SET ultimo_estado = $1, ultimo_diag = NOW() WHERE id = $2`,
          [nextState, dev.id]
        );
      }
    }
  } catch (err) {
    // Silencioso
  } finally {
    if (client) client.release();
  }
}

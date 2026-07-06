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
      console.log(`🔍 Solicitud de escaneo de impresoras detectada para esta estación (${STATION_ID}). Escaneando Windows...`);
      const printersList = await getWindowsPrinters();
      console.log(`🖨️  Impresoras encontradas: [${printersList.map(p => `${p.name} (${p.offline ? 'Sin conexión' : 'En línea'})`).join(', ')}]`);
      
      const jsonList = JSON.stringify(printersList);

      // Guardar impresoras disponibles para ESTA estación
      await client.query(`
        INSERT INTO "Configuracion" (clave, valor)
        VALUES ($1, $2)
        ON CONFLICT (clave) DO UPDATE SET valor = $2
      `, [`impresoras_disponibles_${STATION_ID}`, jsonList]);

      // Apagar la bandera de solicitud
      await client.query(`
        INSERT INTO "Configuracion" (clave, valor)
        VALUES ('solicitar_actualizacion_impresoras', 'false')
        ON CONFLICT (clave) DO UPDATE SET valor = 'false'
      `);

      console.log(`✅ Lista de impresoras de la estación "${STATION_ID}" sincronizada con la base de datos.`);
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

// --- 4. Enviar Ticket al Spooler de Windows ---
async function printTicketText(ticketText, ticketId, printerName, paperSize = '80mm') {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `ticket_${ticketId}.txt`);
    
    // Escribir codificación limpia
    fs.writeFileSync(tempFilePath, ticketText, 'utf8');

    const scriptPath = path.join(__dirname, 'print_raw.ps1');
    
    const anchosMM = { '80mm': 314, '58mm': 228, '50mm': 196 };
    const anchoCalculado = anchosMM[paperSize] || 314;
    const linesCount = ticketText.split('\n').length;
    const altoCalculado = 100 + (linesCount * 20);

    const command = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -printerName "${printerName}" -filePath "${tempFilePath}" -anchoPapel ${anchoCalculado} -altoPapel ${altoCalculado}`;

    exec(command, (error, stdout, stderr) => {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}

      if (error) {
        console.error(`❌ Error en Spooler de Windows para Impresora "${printerName}":`, error);
        return reject(error);
      }
      console.log(`🖨️  Ticket #${ticketId} enviado al spooler ("${printerName}").`);
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
    // 1. Obtener la impresora activa seleccionada en la web para ESTA estación
    const activeRes = await client.query(
      `SELECT valor FROM "Configuracion" WHERE clave = $1`,
      [`impresora_activa_${STATION_ID}`]
    );
    const printerName = activeRes.rows[0]?.valor;

    if (!printerName) {
      // Si no hay impresora seleccionada, no podemos imprimir nada físicamente
      isProcessing = false;
      return;
    }

    // Obtener configuración de medidas para esta estación
    const medidasRes = await client.query(
      `SELECT valor FROM "Configuracion" WHERE clave = $1`,
      [`impresora_medidas_${STATION_ID}`]
    );
    const medidasMap = medidasRes.rows[0]?.valor ? JSON.parse(medidasRes.rows[0].valor) : {};
    const paperSize = medidasMap[printerName] || '80mm';

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

// Ejecutar un barrido y comprobación inmediata al arrancar
checkAndPrintQueue();
handlePrinterScanRequests();

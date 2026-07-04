const path = require('path');
// Load environment variables from the parent project's .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const { exec } = require('child_process');
const net = require('net');

// Prevenir múltiples instancias en segundo plano utilizando un puerto de bloqueo
const LOCK_PORT = 19999;
const lockServer = net.createServer();
lockServer.listen(LOCK_PORT, '127.0.0.1');
lockServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    process.exit(0); // Ya está corriendo una instancia, salir silenciosamente
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

const processedTickets = new Set();
let isProcessing = false;

console.log("=================================================");
console.log("🚀 Servidor de Impresión Local de Búnker Iniciado");
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
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT valor FROM "Configuracion" WHERE clave = 'solicitar_actualizacion_impresoras'`);
    const shouldScan = res.rows[0]?.valor === 'true';

    if (shouldScan) {
      console.log("🔍 Solicitud de escaneo de impresoras detectada desde el frontend. Escaneando Windows...");
      const printersList = await getWindowsPrinters();
      console.log(`🖨️  Impresoras encontradas: [${printersList.map(p => `${p.name} (${p.offline ? 'Sin conexión' : 'En línea'})`).join(', ')}]`);
      
      const jsonList = JSON.stringify(printersList);

      // Guardar impresoras disponibles
      await client.query(`
        INSERT INTO "Configuracion" (clave, valor)
        VALUES ('impresoras_disponibles', $1)
        ON CONFLICT (clave) DO UPDATE SET valor = $1
      `, [jsonList]);

      // Apagar la bandera de solicitud
      await client.query(`
        INSERT INTO "Configuracion" (clave, valor)
        VALUES ('solicitar_actualizacion_impresoras', 'false')
        ON CONFLICT (clave) DO UPDATE SET valor = 'false'
      `);

      console.log("✅ Lista de impresoras sincronizada con la base de datos.");
    }
  } catch (err) {
    console.error("❌ Error al procesar solicitud de escaneo de impresoras:", err.message);
  } finally {
    client.release();
  }
}

// --- 3. Formateadores de Tickets (Texto Plano Monoespacio) ---
function formatTicket(ticket) {
  const type = ticket.contenido?.type;
  if (type === 'arqueo') {
    return formatArqueo(ticket);
  } else if (type === 'precuenta') {
    return formatPrecuenta(ticket);
  } else {
    return formatComanda(ticket);
  }
}

function formatComanda(ticket) {
  const dateStr = new Date(ticket.creado_a).toLocaleString('es-PE');
  let text = "";
  text += "========================================\n";
  text += "            BUNKER RESTOBAR             \n";
  text += "            TICKET DE COCINA            \n";
  text += "========================================\n";
  text += `FECHA: ${dateStr}\n`;
  text += `MESA:  MESA ${ticket.mesa_id}\n`;
  text += `MOZO:  ${ticket.mozo.toUpperCase()}\n`;
  text += "----------------------------------------\n";
  text += "CAN  PRODUCTO / OBSERVACIONES\n";
  text += "----------------------------------------\n";
  
  const items = Array.isArray(ticket.contenido) ? ticket.contenido : (ticket.contenido.items || []);
  items.forEach(item => {
    const qty = String(item.cantidad).padEnd(4, ' ');
    text += `${qty}${item.nombre.toUpperCase()}\n`;
    if (item.observacion && item.observacion.trim() !== '') {
      text += `    * OBS: ${item.observacion.toUpperCase()}\n`;
    }
  });
  
  text += "----------------------------------------\n";
  text += "\n\n\n\n\n\n\n\n"; // Avance de papel
  return text;
}

function formatPrecuenta(ticket) {
  const dateStr = new Date(ticket.creado_a).toLocaleString('es-PE');
  let text = "";
  text += "========================================\n";
  text += "            BUNKER RESTOBAR             \n";
  text += "               PRECUENTA                \n";
  text += "========================================\n";
  text += `FECHA: ${dateStr}\n`;
  text += `MESA:  MESA ${ticket.mesa_id}\n`;
  text += `MOZO:  ${ticket.mozo.toUpperCase()}\n`;
  text += "----------------------------------------\n";
  text += "CAN  PRODUCTO                  TOTAL\n";
  text += "----------------------------------------\n";

  const items = ticket.contenido.items || [];
  items.forEach(item => {
    const qty = String(item.cantidad).padEnd(4, ' ');
    const name = item.nombre.substring(0, 24).toUpperCase().padEnd(25, ' ');
    const itemTotal = `S/ ${(item.precio * item.cantidad).toFixed(2)}`;
    text += `${qty}${name}${itemTotal.padStart(10, ' ')}\n`;
  });

  text += "----------------------------------------\n";
  const totalStr = `S/ ${Number(ticket.contenido.total || 0).toFixed(2)}`;
  text += `TOTAL: ${totalStr.padStart(33, ' ')}\n`;
  if (ticket.contenido.totalLetras) {
    text += `(${ticket.contenido.totalLetras.toUpperCase()})\n`;
  }
  text += "----------------------------------------\n";
  text += "       NO POSEE VALIDEZ FISCAL.        \n";
  text += "  ¡MUCHAS GRACIAS POR SU PREFERENCIA!  \n";
  text += "========================================\n";
  text += "\n\n\n\n\n\n\n\n"; // Avance de papel
  return text;
}

function formatArqueo(ticket) {
  const dateStr = new Date(ticket.creado_a).toLocaleString('es-PE');
  const data = ticket.contenido;
  let text = "";
  text += "========================================\n";
  text += "            BUNKER RESTOBAR             \n";
  text += "            RESUMEN DE CAJA             \n";
  text += "========================================\n";
  text += `FECHA IMP: ${dateStr}\n`;
  text += `TURNO N°:  ${data.id}\n`;
  text += `ESTADO:    ${data.estado.toUpperCase()}\n`;
  text += `INICIO:    ${new Date(data.fechaInicio).toLocaleString('es-PE')}\n`;
  if (data.fechaFin) {
    text += `CIERRE:    ${new Date(data.fechaFin).toLocaleString('es-PE')}\n`;
  }
  text += `M. INICIAL: S/. ${(data.montoInicial || 0).toFixed(2)}\n`;
  text += "----------------------------------------\n";
  text += "DESGLOSE DE INGRESOS:\n";
  text += `  EFECTIVO:      S/. ${(data.ingresos?.efectivo || 0).toFixed(2)}\n`;
  text += `  TARJETA (POS): S/. ${(data.ingresos?.tarjeta || 0).toFixed(2)}\n`;
  text += `  YAPE:          S/. ${(data.ingresos?.yape || 0).toFixed(2)}\n`;
  text += `  PLIN:          S/. ${(data.ingresos?.plin || 0).toFixed(2)}\n`;
  text += `  IZIPAY:        S/. ${(data.ingresos?.izipay || 0).toFixed(2)}\n`;
  text += `  NIUBIZ:        S/. ${(data.ingresos?.niubiz || 0).toFixed(2)}\n`;
  text += `  MANUALES:      S/. ${(data.ingresos?.manual || 0).toFixed(2)}\n`;
  text += "----------------------------------------\n";
  
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
  text += `TOTAL VENTAS:    S/. ${getVentasTotal().toFixed(2)}\n`;
  text += "----------------------------------------\n";
  text += "RESUMEN EFECTIVO NETO:\n";
  text += `  INGRESO TOTAL: S/. ${((data.ingresos?.efectivo || 0) + (data.ingresos?.manual || 0)).toFixed(2)}\n`;
  text += `  EGRESO TOTAL:  S/. ${(data.egresos || 0).toFixed(2)}\n`;
  text += `  NETO EN CAJA:  S/. ${(data.totalCaja || 0).toFixed(2)}\n`;
  text += "----------------------------------------\n";
  text += "       NO POSEE VALIDEZ FISCAL.        \n";
  text += "========================================\n";
  text += "\n\n\n\n\n\n\n\n"; // Avance de papel
  return text;
}

// --- 4. Enviar Ticket al Spooler de Windows ---
async function printTicketText(ticketText, ticketId, printerName) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `ticket_${ticketId}.txt`);
    
    // Escribir codificación limpia
    fs.writeFileSync(tempFilePath, ticketText, 'utf8');

    const command = `powershell -Command "Get-Content -Path '${tempFilePath}' -Raw | Out-Printer -Name '${printerName}'"`;

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

  const client = await pool.connect();
  try {
    // 1. Obtener la impresora activa seleccionada en la web
    const activeRes = await client.query(`SELECT valor FROM "Configuracion" WHERE clave = 'impresora_activa'`);
    const printerName = activeRes.rows[0]?.valor;

    if (!printerName) {
      // Si no hay impresora seleccionada, no podemos imprimir nada físicamente
      isProcessing = false;
      return;
    }

    // 2. Obtener tickets pendientes ordenados cronológicamente
    const queueRes = await client.query(`SELECT * FROM tickets_pendientes WHERE impreso = false ORDER BY creado_a ASC`);
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
        console.log(`⏳ Imprimiendo Ticket #${ticket.id} en "${printerName}"...`);
        const formattedText = formatTicket(lockRes.rows[0]);
        await printTicketText(formattedText, ticket.id, printerName);
        console.log(`✅ Ticket #${ticket.id} impreso con éxito.`);
      } catch (err) {
        console.error(`❌ Falló la impresión física del Ticket #${ticket.id}:`, err.message);
        processedTickets.delete(ticket.id); // Permitir reintento local posterior
      }
    }
  } catch (err) {
    console.error("❌ Error en bucle de cola de impresión:", err.message);
  } finally {
    client.release();
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

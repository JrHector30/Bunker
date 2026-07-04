/**
 * Encolador de tickets mediante llamada al backend (Proxy de Base de Datos)
 * Esto permite imprimir desde cualquier dispositivo (celular/tablet/PC) 
 * sin configurar llaves de Supabase ni IPs locales directamente en el cliente.
 */

/**
 * Enqueues a ticket print job into the tickets_pendientes table
 * @param {string|number} mesaId - The table number or identifier
 * @param {string} mozoName - Name of the waiter or role
 * @param {object|array} contenido - JSON data of the ticket (items, total, type, etc.)
 */
export async function enqueueTicket(mesaId, mozoName, contenido) {
  try {
    const res = await fetch('/api/impresoras/imprimir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mesaId: String(mesaId),
        mozo: mozoName || 'Sistema',
        contenido: contenido
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Error al encolar ticket en el servidor');
    }

    const data = await res.json();
    console.log("🎫 Ticket encolado con éxito:", data.ticketId);
    return true;
  } catch (error) {
    console.error("❌ Error al encolar el ticket:", error);
    throw error;
  }
}

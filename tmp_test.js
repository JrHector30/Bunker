
async function runTests() {
    try {
        console.log("Fetching mesas...");
        const res = await fetch("http://localhost:3000/api/tables");
        const tables = await res.json();
        const mesaOcupada = tables.find(t => t.estado === 'ocupada');

        if (!mesaOcupada) {
            console.log("No ocupada table found, creating an order...");
            // Create an order for Mesa 3
            const addRes = await fetch("http://localhost:3000/api/orders", {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mesaId: 3,
                    usuarioId: 1,
                    detalles: [{ platoId: 1, cantidad: 1, observacion: "" }]
                })
            });
            console.log("Order created:", await addRes.json());
            return runTests();
        }

        const comanda = mesaOcupada.comandas[0];
        console.log("Found comanda:", comanda.id, "on table", mesaOcupada.numero);

        // Test 1: Auto Liberation
        if (comanda.detalles.length > 0) {
            console.log("Testing auto-liberation via DELETE rule...");
            const firstDetail = comanda.detalles[0].id;
            const delRes = await fetch(`http://localhost:3000/api/orders/details/${firstDetail}`, { method: 'DELETE' });
            console.log("Delete result:", await delRes.json());
        } else {
            // Test 2: Anulación Total
            console.log("Testing Cancel API...");
            const canRes = await fetch(`http://localhost:3000/api/orders/${comanda.id}/cancel`, {
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuarioResponsable: "Test Script", motivo: "Testing API" })
            });
            console.log("Cancel result:", await canRes.json());
        }

        // Check if DB updated
        const verifyRes = await fetch("http://localhost:3000/api/tables");
        const tables2 = await verifyRes.json();
        const verifyTable = tables2.find(t => t.id === mesaOcupada.id);
        console.log("Final Table Status:", verifyTable?.estado);
    } catch (e) {
        console.error(e);
    }
}
runTests();

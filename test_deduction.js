// Using native node fetch

async function runTest() {
    console.log("=== INICIANDO TEST DE DEDUCCIÓN DE INSUMOS ===");
    const API_URL = 'http://localhost:3000';

    try {
        // 1. Crear Insumo de prueba o buscarlo
        console.log("1. Buscando insumo 'Harina Prueba'...");
        let insumo;
        const resList = await fetch(`${API_URL}/api/insumos`);
        const list = await resList.json();
        insumo = list.find(i => i.nombre === 'Harina Prueba');

        if (!insumo) {
            console.log("   -> Creando insumo 'Harina Prueba'...");
            const resInsumo = await fetch(`${API_URL}/api/insumos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: 'Harina Prueba',
                    precioCompra: 5.0,
                    unidadMedida: 'kg',
                    stock: 100
                })
            });
            insumo = await resInsumo.json();
        }

        console.log("   -> Insumo ID:", insumo.id, "- Stock inicial:", insumo.stock);

        // 2. Crear un Plato de prueba: "Pan de Prueba"
        console.log("2. Buscando producto (plato) de prueba...");
        const resPlatos = await fetch(`${API_URL}/api/products`);
        const platos = await resPlatos.json();
        const plato = platos[0]; // Tomamos el primer plato que exista
        if (!plato) throw new Error("No hay platos en la DB para probar.");
        console.log("   -> Plato seleccionado ID:", plato.id, "- Nombre:", plato.nombre);

        // 3. Asignar receta al Plato (usa 2.5 kg de Harina)
        console.log("3. Asignando receta al plato (usará 2.5 kg de Harina Prueba)...");
        await fetch(`${API_URL}/api/recetas/${plato.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ingredientes: [
                    { insumoId: insumo.id, cantidad: 2.5 }
                ]
            })
        });

        // 4. Crear Mesa y Comanda simulada para vender el Plato
        console.log("4. Buscando mesa libre para vender el plato...");
        const resMesas = await fetch(`${API_URL}/api/tables`);
        const mesas = await resMesas.json();
        const mesaLibre = mesas.find(m => m.estado === 'libre') || mesas[0];
        console.log("   -> Mesa seleccionada:", mesaLibre.numero);

        console.log("5. Abriendo comanda con 2 unidades del plato (Debería usar 5.0 kg en total)...");
        const resOrder = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mesaId: mesaLibre.id,
                usuarioId: 1,
                comensales: 1,
                detalles: [
                    { platoId: plato.id, cantidad: 2, observacion: "" }
                ]
            })
        });
        const orderData = await resOrder.json();
        console.log("   -> Comanda creada/actualizada:", orderData.id, "- Detalles guardados:", orderData.detalles?.length || 0);

        // 6. Cerrar Comanda / Pago
        console.log("6. Procesando checkout (cerrando mesa)...");
        const resCheckout = await fetch(`${API_URL}/api/checkout/${mesaLibre.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paymentMethod: 'efectivo',
                docType: 'sin_comprobante',
                totalReceived: 100,
                tip: 0,
                observation: '',
                email: ''
            })
        });
        const checkoutData = await resCheckout.json();
        console.log("   -> Checkout respuesta:", checkoutData);

        // 7. Verificar Stock Final
        console.log("7. Verificando stock final de 'Harina Prueba'...");
        const resFinalInsumos = await fetch(`${API_URL}/api/insumos`);
        const insumosFinales = await resFinalInsumos.json();
        const insumoFinal = insumosFinales.find(i => i.id === insumo.id);

        console.log("   -> Stock Final esperado: 95.00");
        console.log("   -> Stock Final real:     ", insumoFinal.stock);

        if (insumoFinal.stock === 95) {
            console.log("✅ TEST PASADO: Deducción correcta.");
        } else {
            console.log("❌ TEST FALLADO: Deducción incorrecta.");
        }

    } catch (e) {
        console.error("Error durante el test:", e);
    }
}

runTest();
